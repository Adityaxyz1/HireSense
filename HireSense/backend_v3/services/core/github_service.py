"""GitHub profile enrichment via the free, official GitHub REST API.

Given an applicant's GitHub URL (or bare username), fetch their public profile
plus repo aggregates (top languages, total stars, notable repos) and return a
normalized dict the recruiter UI can render. Optional GITHUB_TOKEN raises the
rate limit from 60 to 5000 req/hr. Every failure path returns None so callers
degrade gracefully — GitHub is always optional.
"""
import re
import httpx

from config import settings

GITHUB_API = "https://api.github.com"
# Reserved path segments that are not usernames.
_RESERVED = {"orgs", "settings", "about", "marketplace", "explore", "topics",
             "sponsors", "features", "pricing", "login", "join"}
_URL_RE = re.compile(r"github\.com/([A-Za-z0-9-]+)", re.IGNORECASE)
_USERNAME_RE = re.compile(r"^[A-Za-z0-9-]{1,39}$")


def extract_username(github_url_or_username: str):
    """Parse a GitHub username from a profile URL or a bare handle."""
    if not github_url_or_username:
        return None
    s = github_url_or_username.strip().strip("/")
    m = _URL_RE.search(s)
    username = m.group(1) if m else s.split("/")[-1].lstrip("@")
    username = (username or "").strip()
    if not username or username.lower() in _RESERVED or not _USERNAME_RE.match(username):
        return None
    return username


async def fetch_github_profile(github_url_or_username: str):
    """Return a normalized public GitHub profile, or None on bad input/not found/error."""
    username = extract_username(github_url_or_username)
    if not username:
        return None

    headers = {"Accept": "application/vnd.github+json", "User-Agent": "HireSense"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            u = await client.get(f"{GITHUB_API}/users/{username}", headers=headers)
            if u.status_code != 200:
                return None
            user = u.json()
            r = await client.get(
                f"{GITHUB_API}/users/{username}/repos",
                params={"sort": "pushed", "per_page": 100, "type": "owner"},
                headers=headers,
            )
            repos = r.json() if r.status_code == 200 else []
    except Exception as e:
        print(f"[github] fetch failed for {username}: {e}")
        return None

    if not isinstance(repos, list):
        repos = []

    # Aggregate over the applicant's own (non-fork) repos for a cleaner signal.
    own = [x for x in repos if isinstance(x, dict) and not x.get("fork")]
    lang_counts = {}
    total_stars = 0
    for x in own:
        lang = x.get("language")
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + 1
        total_stars += int(x.get("stargazers_count") or 0)

    top_languages = [
        {"lang": k, "count": v}
        for k, v in sorted(lang_counts.items(), key=lambda kv: kv[1], reverse=True)[:6]
    ]
    top_repos = [
        {
            "name": x.get("name"),
            "desc": x.get("description"),
            "language": x.get("language"),
            "stars": int(x.get("stargazers_count") or 0),
            "url": x.get("html_url"),
        }
        for x in sorted(own, key=lambda x: int(x.get("stargazers_count") or 0), reverse=True)[:5]
    ]

    return {
        "username": username,
        "name": user.get("name"),
        "bio": user.get("bio"),
        "company": user.get("company"),
        "location": user.get("location"),
        "blog": user.get("blog") or None,
        "followers": int(user.get("followers") or 0),
        "public_repos": int(user.get("public_repos") or 0),
        "total_stars": total_stars,
        "top_languages": top_languages,
        "top_repos": top_repos,
        "profile_url": user.get("html_url") or f"https://github.com/{username}",
        "avatar_url": user.get("avatar_url"),
    }
