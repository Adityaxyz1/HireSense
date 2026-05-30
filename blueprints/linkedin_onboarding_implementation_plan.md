# Applicant profile extraction (LinkedIn + GitHub) + mandatory onboarding → recruiter evaluation

> **Status: PLAN ONLY — partial implementation readiness.**
> - **GitHub** extraction uses the **free official GitHub REST API** → buildable **now** (Phase A), no API decision/cost.
> - **LinkedIn** has no free/official API → needs a paid provider the user is still choosing (Phase B). Both plug into one normalized-profile seam, so LinkedIn drops in later with no other code changes.
> - Field set + gate hardness have **proposed defaults marked "TO CONFIRM"**.

## Context
Recruiters want richer applicant context during evaluation, sourced from the applicant's **LinkedIn and GitHub**. The ask:
1. Applicants provide their **LinkedIn URL** (and **GitHub URL**) when creating their ID (signup) in the applicant portal.
2. On **first login**, applicants must **completely fill their profile** before using the portal — this onboarding is the **primary landing area** (a hard gate).
3. The system **extracts profile details** (LinkedIn + GitHub) for that applicant and surfaces them in the **recruiter evaluation section**.

Current state (from exploration):
- `applicant_profiles` ([student_region_schema.sql:31-40](HireSense/backend_v3/sql/student_region_schema.sql#L31-L40)) has only `full_name, email, avatar_url, major, graduation_year, skills_json` — **no LinkedIn/GitHub URL, no completion flag**.
- LinkedIn extraction is **dormant**: a `MAGICAL_API_KEY` config slot ([config.py:23-24](HireSense/backend_v3/config.py#L23-L24)) + a `magical_data` JSONB column on `resumes` exist, but the actual API call was removed ([resume.py:270](HireSense/backend_v3/routes/resume.py#L270) "skips MagicalAPI"). `linkedin_url` exists only for **recruiters** ([recruiter_management.sql:23](HireSense/backend_v3/sql/recruiter_management.sql#L23)). No GitHub anywhere yet.
- Auth/routing: [AuthContext.jsx](HireSense/frontend/src/contexts/AuthContext.jsx) loads the `profiles` row → exposes `role`/`profile`; persona gates live in [App.jsx](HireSense/frontend/src/App.jsx#L42-L51) (`ApplicantGate`). Applicant portal pages live in `pages/applicant/` under [ApplicantLayout](HireSense/frontend/src/components/ui/ApplicantLayout.jsx).
- Recruiter evaluation surfaces: the per-job applicant list [Applicants.jsx](HireSense/frontend/src/pages/Applicants.jsx) (already joins `applicant_profiles`) and the Candidates expandable panel [Candidates.jsx:459-541](HireSense/frontend/src/pages/Candidates.jsx#L459-L541).

## ⏳ Open decisions (PENDING USER)
1. **LinkedIn API provider** — user researching. Abstracted behind `linkedin_service.fetch_linkedin_profile(url)`; picking an API = one function + env key. **(GitHub needs no decision — free official API.)**
2. **Required field set** — *proposed default (TO CONFIRM):* full_name, **linkedin_url (required)**, **github_url (optional)**, phone, location, field/major, graduation_year, skills, short summary.
3. **Gate hardness** — *proposed default (TO CONFIRM):* **hard gate** (redirect to onboarding on every visit until complete).

---

## Architecture — pluggable profile-enrichment seams
Two small, independent provider services, both returning a **normalized schema** so the recruiter UI is provider-agnostic and each works/`None`s independently.

### `backend_v3/services/github_service.py` (FREE — Phase A)
- `async def fetch_github_profile(github_url_or_username: str) -> dict | None`
- Parse `github.com/<username>` → call the **public GitHub REST API** (no key required):
  - `GET https://api.github.com/users/{username}` → name, bio, company, location, blog, followers, public_repos, avatar.
  - `GET /users/{username}/repos?sort=pushed&per_page=100` → aggregate **top languages**, **total stars**, **top repos** (name, desc, language, stars, url).
- Optional `GITHUB_TOKEN` env → raises rate limit 60→5000/hr (sent as `Authorization: Bearer` when present). Graceful `None` on 404/rate-limit/error.
- Normalized: `{ username, name, bio, company, location, blog, followers, public_repos, total_stars, top_languages:[{lang,count}], top_repos:[{name,desc,language,stars,url}], profile_url }`

### `backend_v3/services/linkedin_service.py` (PAID/TBD — Phase B)
- `async def fetch_linkedin_profile(linkedin_url: str) -> dict | None`
- Dispatches on `settings.LINKEDIN_PROVIDER` (`"magicalapi"|"proxycurl"|"none"`). One `_fetch_<provider>(url)` per API → normalized `{ headline, summary, location, skills:[...], experience:[...], education:[...], certifications:[...], raw }`. Returns `None` when no provider/key (manual profile remains the baseline).
- **`config.py`**: add `LINKEDIN_PROVIDER` (default `"none"`), `GITHUB_TOKEN` (optional); reuse `MAGICAL_API_KEY`.

## DB migration — new `backend_v3/sql/applicant_linkedin_onboarding.sql`
```sql
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS linkedin_url       text;
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS github_url         text;
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS phone              text;
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS location           text;
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS summary            text;
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS linkedin_data      jsonb;        -- normalized LinkedIn (Phase B)
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS github_data        jsonb;        -- normalized GitHub (Phase A)
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS profile_synced_at  timestamptz;
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS profile_completed  boolean DEFAULT false;
```

## Backend changes
- **`routes/student.py`**
  - Extend `ApplicantProfileUpdate` with new fields; `update_applicant_profile` writes them and **computes `profile_completed`** (required fields non-empty). On save, fire **background tasks**: if `github_url` → `fetch_github_profile` (always, free); if `linkedin_url` + provider configured → `fetch_linkedin_profile`. Store `github_data` / `linkedin_data` + `profile_synced_at`.
  - `get_applicant_profile` returns new fields + `profile_completed` + `required_missing:[...]`.
  - `POST /student/profile/sync` — manual (re)fetch trigger for both providers.
- **Recruiter read path** — widen the `applicant_profiles` embed in `job_applications` ([applications.py:289-325](HireSense/backend_v3/routes/applications.py#L289-L325)) to include `linkedin_url, github_url, location, summary, linkedin_data, github_data` (mirror in `/candidates` if applied candidates show there).
- **Signup** — `_ensure_applicant_profile` / `routes/auth.py` accepts/stores `linkedin_url` + `github_url` captured at signup.

## Frontend changes
- **Signup form** ([Login.jsx](HireSense/frontend/src/pages/Login.jsx)) — applicant signup gains **LinkedIn URL** (required) + **GitHub URL** (optional) inputs, validated (`linkedin.com/in/…`, `github.com/…`).
- **New onboarding page** `pages/applicant/ApplicantOnboarding.jsx` — full profile form (reuses `AvatarUpload` + field/skills patterns from [ApplicantProfile.jsx](HireSense/frontend/src/pages/applicant/ApplicantProfile.jsx)). Submit → save + kick GitHub sync (and LinkedIn when configured). The **primary area** after login.
- **The gate** — extend [AuthContext.jsx](HireSense/frontend/src/contexts/AuthContext.jsx) to expose applicant `profileComplete` (fetch `/student/profile`). In [App.jsx](HireSense/frontend/src/App.jsx) `ApplicantGate`: role===applicant && !profileComplete → `<Navigate to="/student/onboarding">`. Add the route. Hard gate by default.
- **Recruiter evaluation panel** — add a **"Profile · LinkedIn · GitHub"** section to the applicant view ([Applicants.jsx](HireSense/frontend/src/pages/Applicants.jsx) expandable row, and/or the [Candidates.jsx](HireSense/frontend/src/pages/Candidates.jsx#L459-L541) panel): contact + summary, **GitHub** top languages / notable repos / stars (from `github_data`), **LinkedIn** experience/education/skills (from `linkedin_data`), and clickable profile links. Falls back to self-entered fields.
- **`lib/api.js`** — extend `updateApplicantProfile` payload (linkedin_url, github_url, …); add `syncApplicantProfile()`; recruiter fetches return the new fields.

## Phasing
- **Phase A (now — no paid API):** DB migration; onboarding form + hard gate; signup LinkedIn+GitHub fields; **GitHub extraction live** (free API) → recruiter panel shows GitHub data; LinkedIn shown as self-entered fields + link; `linkedin_service` seam returns `None`.
- **Phase B (after user picks LinkedIn API):** implement `_fetch_<provider>()` in `linkedin_service.py`, set `LINKEDIN_PROVIDER` + key. Recruiter panel auto-fills LinkedIn experience/education. **No other code changes.**

## Files touched (anticipated)
- Backend: new `services/github_service.py`, new `services/linkedin_service.py`, new `sql/applicant_linkedin_onboarding.sql`, `config.py`, `routes/student.py`, `routes/applications.py` (+ maybe `routes/resume.py`, `routes/auth.py`)
- Frontend: new `pages/applicant/ApplicantOnboarding.jsx`, `App.jsx`, `contexts/AuthContext.jsx`, `pages/Login.jsx`, `pages/Applicants.jsx` (+ maybe `pages/Candidates.jsx`), `components/ui/ApplicantLayout.jsx` (nav), `lib/api.js`

## Verification
1. Run the migration SQL in Supabase (prod + local).
2. **Onboarding gate:** new applicant → forced to onboarding; can't reach Browse/Applications until required fields saved; navigation resumes after; flag persists across reloads.
3. **Signup links:** LinkedIn + GitHub URLs captured at signup pre-fill onboarding.
4. **GitHub (Phase A):** save a profile with a real GitHub URL → `github_data` populates (languages, repos, stars); recruiter evaluation panel shows it live; invalid/missing GitHub degrades gracefully.
5. **Recruiter evaluation:** apply as the applicant → recruiter sees profile + GitHub stats + LinkedIn link/details (live via existing realtime subscriptions).
6. **LinkedIn (Phase B):** with a provider key set, save populates `linkedin_data`; manual re-sync works; with no key, everything still works on self-entered data + GitHub.
7. `npm run build` clean; backend import-check + single clean server (watch for stale uvicorn on port 8000).
