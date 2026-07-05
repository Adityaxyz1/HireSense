import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_admin_db
from routes.auth_dependency import require_user

router = APIRouter()


class SearchRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = None


class SearchResult(BaseModel):
    id: str
    match_id: Optional[str] = None
    name: str
    job_title: Optional[str] = None
    match_score: Optional[float] = None
    ats_score: Optional[float] = None
    status: Optional[str] = None
    email: Optional[str] = None
    summary: str


class ApplicantResult(BaseModel):
    id: str
    applicant_name: Optional[str] = None
    applicant_email: Optional[str] = None
    match_score: Optional[float] = None
    ats_score: Optional[float] = None
    status: Optional[str] = None
    resume_status: Optional[str] = None
    risk_level: Optional[str] = None


class JobApplicantGroup(BaseModel):
    job_id: str
    job_title: str
    applicants: List[ApplicantResult]


class ChatResponse(BaseModel):
    reply: str
    results: List[SearchResult] = []
    job_applicants: List[JobApplicantGroup] = []


def _clean_query(message: str) -> str:
    query = re.sub(r'[%_\\\'";]', "", message or "").strip()
    return re.sub(r"\s+", " ", query)[:200]


def _looks_like_applicant_question(query: str) -> bool:
    text = query.lower()
    return any(word in text for word in ("applied", "applicant", "application", "who")) and any(
        word in text for word in ("job", "role", "profile", "position", "opening", "applied")
    )


def _score_job_match(query: str, job: dict) -> int:
    haystack = f"{job.get('title') or ''} {job.get('job_text') or ''}".lower()
    tokens = [t for t in re.findall(r"[a-z0-9+#.]+", query.lower()) if len(t) > 2]
    return sum(1 for token in tokens if token in haystack)


def _candidate_name(row: dict, applicant: dict) -> str:
    name = applicant.get("full_name") or row.get("candidate_name")
    if name:
        return name
    filename = (row.get("file_url") or "Candidate").split("/")[-1]
    return filename.replace(".pdf", "").split("_")[-1] or "Candidate"


def _format_pct(value):
    if value is None:
        return None
    value = value * 100 if value <= 1 else value
    return round(value, 1)


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: SearchRequest, user=Depends(require_user)):
    """Assistant for recruiter-scoped candidate and job applicant questions."""
    query = _clean_query(payload.message)
    if not query:
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    db = get_admin_db()
    uid = str(user.id)

    # "Who applied to the React role?" style questions.
    if _looks_like_applicant_question(query):
        jobs = (
            db.table("job_descriptions")
            .select("id, title, job_text")
            .eq("user_id", uid)
            .execute()
            .data
            or []
        )
        ranked_jobs = sorted(
            [j for j in jobs if _score_job_match(query, j) > 0],
            key=lambda j: _score_job_match(query, j),
            reverse=True,
        )[:3]

        if ranked_jobs:
            groups = []
            for job in ranked_jobs:
                rows = (
                    db.table("applications")
                    .select(
                        "id, status, created_at, applicant_id, "
                        "applicant_profiles(full_name, email), "
                        "resumes(status, ats_score, candidate_name), "
                        "match_results(final_score, risk_level, candidate_status)"
                    )
                    .eq("job_id", job["id"])
                    .order("created_at", desc=True)
                    .execute()
                    .data
                    or []
                )
                applicants = []
                for row in rows:
                    applicant = row.get("applicant_profiles") or {}
                    resume = row.get("resumes") or {}
                    match = row.get("match_results") or {}
                    applicants.append(
                        ApplicantResult(
                            id=row["id"],
                            applicant_name=applicant.get("full_name") or resume.get("candidate_name"),
                            applicant_email=applicant.get("email"),
                            match_score=_format_pct(match.get("final_score")),
                            ats_score=_format_pct(resume.get("ats_score")),
                            status=match.get("candidate_status") or row.get("status"),
                            resume_status=resume.get("status"),
                            risk_level=match.get("risk_level"),
                        )
                    )
                groups.append(
                    JobApplicantGroup(
                        job_id=job["id"],
                        job_title=job.get("title") or "Untitled Role",
                        applicants=applicants,
                    )
                )

            total = sum(len(group.applicants) for group in groups)
            if total == 0:
                return ChatResponse(
                    reply="I found the matching job role, but no applicants have applied yet.",
                    job_applicants=groups,
                )
            return ChatResponse(
                reply=f"I found {total} applicant(s) across {len(groups)} matching job role(s).",
                job_applicants=groups,
            )

    # Candidate lookup by name, skill, resume text, email, or matched job title.
    # Scope to the recruiter's own jobs up front so we never scan the whole
    # applications table (or pull other tenants' resumes into memory).
    my_jobs = (
        db.table("job_descriptions")
        .select("id, title")
        .eq("user_id", uid)
        .execute()
        .data
        or []
    )
    job_ids = [j["id"] for j in my_jobs]
    job_titles = {j["id"]: j.get("title") for j in my_jobs}

    rows = []
    if job_ids:
        rows = (
            db.table("applications")
            .select(
                "id, job_id, applicant_profiles(full_name, email, major, graduation_year, github_url), "
                "resumes(id, candidate_name, file_url, raw_text, ats_score, status, match_score), "
                "match_results(id, final_score, risk_level, candidate_status)"
            )
            .in_("job_id", job_ids)
            .order("created_at", desc=True)
            .limit(300)
            .execute()
            .data
            or []
        )

    tokens = [t for t in re.findall(r"[a-z0-9+#.]+", query.lower()) if len(t) > 1]
    matches = []
    for app in rows:
        job_title = job_titles.get(app.get("job_id")) or ""
        resume = app.get("resumes") or {}
        profile = app.get("applicant_profiles") or {}
        match = app.get("match_results") or {}
        blob = " ".join(
            str(x or "")
            for x in (
                resume.get("candidate_name"),
                resume.get("raw_text"),
                profile.get("full_name"),
                profile.get("email"),
                profile.get("major"),
                profile.get("github_url"),
                job_title,
            )
        ).lower()
        score = sum(1 for token in tokens if token in blob)
        if score == 0:
            continue
        name = _candidate_name(resume, profile)
        summary_bits = [
            f"Email: {profile.get('email')}" if profile.get("email") else None,
            f"Major: {profile.get('major')}" if profile.get("major") else None,
            f"Graduation: {profile.get('graduation_year')}" if profile.get("graduation_year") else None,
            f"Risk: {match.get('risk_level')}" if match.get("risk_level") else None,
            f"Status: {match.get('candidate_status') or resume.get('status')}",
        ]
        matches.append(
            (
                score,
                SearchResult(
                    id=resume.get("id") or app["id"],
                    match_id=(match or {}).get("id"),
                    name=name,
                    job_title=job_title or "Candidate Profile",
                    match_score=_format_pct((match or {}).get("final_score") or resume.get("match_score")),
                    ats_score=_format_pct(resume.get("ats_score")),
                    status=(match or {}).get("candidate_status") or resume.get("status"),
                    email=profile.get("email"),
                    summary=" | ".join([bit for bit in summary_bits if bit]) or (resume.get("raw_text") or "")[:160],
                ),
            )
        )

    deduped = {}
    for score, result in sorted(matches, key=lambda item: (item[0], item[1].match_score or 0), reverse=True):
        key = result.match_id or f"{result.id}:{result.job_title}"
        deduped.setdefault(key, result)
        if len(deduped) >= 6:
            break

    results = list(deduped.values())
    if not results:
        return ChatResponse(
            reply=f"I couldn't find candidate or job applicant records matching '{payload.message}'. Try a candidate name, skill, email, or job title."
        )

    return ChatResponse(
        reply=f"I found {len(results)} matching candidate record(s).",
        results=results,
    )
