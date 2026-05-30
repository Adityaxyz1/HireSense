"""
Applicant Region — Applications router (Phase 2).

This is the bridge between the Applicant Portal and the Recruiter Platform.
When an applicant applies to a job, we immediately persist an `applications` row
(status='applied') + a placeholder `resumes` row (status='processing'), then
fire a background screening task that reuses the existing AI engines. Because
those tables are in the Supabase Realtime publication, every DB write is pushed
live to the recruiter's dashboard — no extra notification plumbing needed.

Flow (see blueprints/realtime_student_portal_plan.pdf):
    POST /api/applications/apply  -> 201 instantly
        -> process_applicant_application()  (background)
            -> parse PDF -> ATS scan -> embedding -> skill/exp/strength
            -> cosine similarity -> weighted final score -> match_results
            -> link match back to the application (status='screening')
"""
import asyncio
import json as _json

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from fastapi import APIRouter, File, UploadFile, BackgroundTasks, Form, HTTPException, Request, Depends

from database import get_db, get_admin_db
from services.pdf_parser import extract_text
from services.storage_service import upload_resume_pdf
from services.embedding_engine import generate_embedding
from services.ats_scanner import scan_ats_compliance
from services.skill_engine import calculate_skill_overlap
from services.experience_engine import calculate_experience_score
from services.resume_strength import compute_strength
from services.scorer import compute_final_score, get_risk_level
from routes.auth_dependency import require_user

router = APIRouter()

# Statuses a job can have while it's open to applicants on the applicant board.
# The recruiter UI uses 'active' (the DB default) and 'closed'; 'published' is
# kept for backward-compat with any legacy rows. Anything else (closed/draft/
# archived/paused) is hidden from the applicant feed.
OPEN_JOB_STATUSES = ("active", "published")


# ── Background screening engine ───────────────────────────────────────────
async def process_applicant_application(app_id: str, resume_id: str, job_id: str,
                                      recruiter_id: str, raw_text: str):
    """Async worker: screens an applicant's resume against the target job.

    Each DB write fires a Supabase Realtime broadcast, so the recruiter UI
    updates stage-by-stage (processing -> ATS done -> match scored).
    """
    db = get_admin_db()  # service-role client — bypasses RLS for the pipeline
    try:
        # ── Step A: ATS compliance scan (NVIDIA NIM racing engine) ──
        ats_report = await scan_ats_compliance(raw_text)
        candidate_name = ats_report.get("candidate_name")

        resume_update = {
            "ats_score": ats_report.get("score", 0),
            "ats_breakdown": _json.dumps(ats_report.get("breakdown", [])),
            "status": "completed",
        }
        if candidate_name and str(candidate_name).strip().lower() not in (
            "candidate", "unknown", "none", "null"
        ):
            resume_update["candidate_name"] = candidate_name

        # ── Step B: dense embedding (blocking — run off the event loop) ──
        try:
            vector = await asyncio.to_thread(generate_embedding, raw_text)
            resume_update["embedding"] = vector
        except Exception as e:
            print(f"[applicant-screen] embedding skipped for {resume_id}: {e}")
            vector = None

        # First realtime update — resume parsed + scored
        db.table("resumes").update(resume_update).eq("id", resume_id).execute()

        # ── Steps C–E: JD-dependent scoring + match persistence (shared) ──
        await rescore_application(app_id, resume_id, job_id, recruiter_id, raw_text,
                                  resume_vector=vector)

    except Exception as e:
        print(f"[applicant-screen] Failed to process application {app_id}: {e}")
        try:
            db.table("resumes").update({"status": "failed"}).eq("id", resume_id).execute()
            db.table("applications").update({"status": "failed"}).eq("id", app_id).execute()
        except Exception:
            pass


async def rescore_application(app_id: str, resume_id: str, job_id: str,
                              recruiter_id: str, raw_text: str, resume_vector=None):
    """Recompute the JD-dependent match for one application and persist it.

    Reused by the apply flow (first screen) and the recruiter's "Run Match"
    re-run. Skips the resume-only ATS scan (already stored). Upserts the
    match_results row, preserving the recruiter's existing triage status on a
    re-run. Each write fires a Supabase Realtime broadcast to the dashboards.
    """
    db = get_admin_db()

    job_res = db.table("job_descriptions").select("job_text").eq("id", job_id).execute()
    job_text = job_res.data[0]["job_text"] if job_res.data else ""

    skill_score = calculate_skill_overlap(raw_text, job_text)
    exp_score = calculate_experience_score(raw_text, job_text)
    strength = compute_strength(raw_text)

    # Semantic cosine similarity (regenerate embeddings on the fly to avoid
    # depending on the stored vector column type)
    if resume_vector is None:
        resume_vector = await asyncio.to_thread(generate_embedding, raw_text)
    job_vec = await asyncio.to_thread(generate_embedding, job_text)
    semantic_sim = float(cosine_similarity([np.array(job_vec)], [np.array(resume_vector)])[0][0])
    semantic_score = max(0.0, semantic_sim)

    final_score = compute_final_score(semantic_score, skill_score, exp_score, strength, False)
    risk_level = get_risk_level(final_score)

    payload = {
        "user_id": recruiter_id,
        "resume_id": resume_id,
        "job_id": job_id,
        "semantic_score": round(semantic_score, 4),
        "skill_score": round(skill_score, 4),
        "experience_score": round(exp_score, 4),
        # Canonical 0–100 scale (matches /match and what the UI expects).
        "final_score": round(final_score * 100, 2),
        "resume_strength": strength,
        "risk_level": risk_level,
        "fair_mode_enabled": False,
        "bias_report": None,
    }

    # Upsert by (resume_id, job_id). On a re-run, keep the recruiter's triage
    # (candidate_status) instead of resetting it to 'pending'.
    existing = (db.table("match_results").select("id")
                .eq("resume_id", resume_id).eq("job_id", job_id).execute())
    if existing.data:
        match_id = existing.data[0]["id"]
        db.table("match_results").update(payload).eq("id", match_id).execute()
    else:
        payload["candidate_status"] = "pending"
        match_res = db.table("match_results").insert(payload).execute()
        match_id = match_res.data[0]["id"] if match_res.data else None

    # Cache the match summary on the resume row too (mirrors /match)
    db.table("resumes").update({
        "match_score": round(final_score * 100, 2),
    }).eq("id", resume_id).execute()

    # Link the match to the application (final realtime push)
    db.table("applications").update({
        "match_result_id": match_id,
        "status": "screening",
    }).eq("id", app_id).execute()

    return match_id


# ── Public job feed (applicant-facing) ────────────────────────────────────
@router.get("/feed/jobs")
def feed_jobs():
    """List all OPEN jobs for the applicant job board (no auth required)."""
    db = get_admin_db()
    # NOTE: recruitment_docs is intentionally NOT exposed on the public feed —
    # those are internal recruiter documents.
    res = (
        db.table("job_descriptions")
        .select("id, title, job_text, location, salary_range, created_at")
        .in_("status", OPEN_JOB_STATUSES)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.get("/feed/jobs/{job_id}")
def feed_job_detail(job_id: str):
    """Single open job detail for the applicant-facing job page."""
    db = get_admin_db()
    res = (
        db.table("job_descriptions")
        .select("id, title, job_text, location, salary_range, created_at, status")
        .eq("id", job_id)
        .execute()
    )
    if not res.data or res.data[0].get("status") not in OPEN_JOB_STATUSES:
        raise HTTPException(status_code=404, detail="Job not found or not open for applications.")
    return res.data[0]


# ── Applicant applies to a job ────────────────────────────────────────────
@router.post("/applications/apply")
async def apply_to_job(
    request: Request,
    background_tasks: BackgroundTasks,
    job_id: str = Form(...),
    file: UploadFile = File(...),
):
    """An applicant submits their resume against a published job."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported.")

    user = require_user(request)
    applicant_id = str(user.id)

    db = get_admin_db()

    # Validate the job exists and is open
    job_res = db.table("job_descriptions").select("id, user_id, status").eq("id", job_id).execute()
    if not job_res.data or job_res.data[0].get("status") not in OPEN_JOB_STATUSES:
        raise HTTPException(status_code=404, detail="Job not found or not open for applications.")
    recruiter_id = job_res.data[0]["user_id"]

    # Prevent duplicate applications to the same job
    dup = (
        db.table("applications").select("id")
        .eq("job_id", job_id).eq("applicant_id", applicant_id).execute()
    )
    if dup.data:
        raise HTTPException(status_code=409, detail="You have already applied to this job.")

    try:
        file_bytes = await file.read()
        if not file_bytes[:5].startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail="Invalid PDF — content does not match PDF format.")
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum 10MB allowed.")

        file_url = upload_resume_pdf(file_bytes, file.filename)
        raw_text = extract_text(file_bytes)

        # Placeholder resume row — owned by the APPLICANT (so RLS lets them see it)
        resume = db.table("resumes").insert({
            "user_id": applicant_id,
            "file_url": file_url,
            "raw_text": raw_text,
            "status": "processing",
        }).execute()
        resume_id = resume.data[0]["id"]

        # Application row — owned by the applicant, tied to the recruiter's job.
        # A UNIQUE(job_id, applicant_id) constraint makes this atomic against the
        # read-then-write race; catch the conflict and clean up the orphan resume.
        try:
            application = db.table("applications").insert({
                "job_id": job_id,
                "applicant_id": applicant_id,
                "resume_id": resume_id,
                "status": "applied",
            }).execute()
        except Exception as insert_err:
            msg = str(insert_err).lower()
            if "duplicate" in msg or "23505" in msg or "unique" in msg:
                try:
                    db.table("resumes").delete().eq("id", resume_id).execute()
                except Exception:
                    pass
                raise HTTPException(status_code=409, detail="You have already applied to this job.")
            raise
        app_id = application.data[0]["id"]

        # Fire the background screening engine
        background_tasks.add_task(
            process_applicant_application, app_id, resume_id, job_id, recruiter_id, raw_text
        )

        return {"application_id": app_id, "resume_id": resume_id, "status": "applied"}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal error occurred during apply: {str(e)}")


# ── Applicant: my applications ────────────────────────────────────────────
@router.get("/applications/mine")
def my_applications(user=Depends(require_user)):
    """List the authenticated applicant's applications, joined with job + match."""
    db = get_admin_db()
    res = (
        db.table("applications")
        .select(
            "id, status, created_at, job_id, resume_id, match_result_id, "
            "job_descriptions (title, location, salary_range), "
            "resumes (status, ats_score, candidate_name), "
            "match_results (final_score, risk_level)"
        )
        .eq("applicant_id", str(user.id))
        .order("created_at", desc=True)
        .execute()
    )
    out = []
    for row in res.data or []:
        job = row.pop("job_descriptions", None) or {}
        resume = row.pop("resumes", None) or {}
        match = row.pop("match_results", None) or {}
        row["job_title"] = job.get("title")
        row["location"] = job.get("location")
        row["salary_range"] = job.get("salary_range")
        row["resume_status"] = resume.get("status")
        row["ats_score"] = resume.get("ats_score")
        row["match_score"] = match.get("final_score")
        row["risk_level"] = match.get("risk_level")
        out.append(row)
    return out


# ── Recruiter: applicants for one of my jobs (initial fetch; realtime updates live) ──
@router.get("/jobs/{job_id}/applications")
def job_applications(job_id: str, user=Depends(require_user)):
    """List applicants for a job the authenticated recruiter owns."""
    db = get_db()
    chk = db.table("job_descriptions").select("id").eq("id", job_id).eq("user_id", str(user.id)).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Job not found or access denied.")

    res = (
        get_admin_db().table("applications")
        .select(
            "id, status, created_at, resume_id, match_result_id, applicant_id, "
            "applicant_profiles (full_name, email, major, graduation_year, github_url, github_data), "
            "resumes (status, ats_score, candidate_name, file_url), "
            "match_results (final_score, risk_level, skill_score, semantic_score)"
        )
        .eq("job_id", job_id)
        .order("created_at", desc=True)
        .execute()
    )
    out = []
    for row in res.data or []:
        applicant = row.pop("applicant_profiles", None) or {}
        resume = row.pop("resumes", None) or {}
        match = row.pop("match_results", None) or {}
        row["applicant_name"] = applicant.get("full_name") or resume.get("candidate_name")
        row["applicant_email"] = applicant.get("email")
        row["major"] = applicant.get("major")
        row["graduation_year"] = applicant.get("graduation_year")
        row["github_url"] = applicant.get("github_url")
        row["github_data"] = applicant.get("github_data")
        row["resume_status"] = resume.get("status")
        row["resume_file"] = resume.get("file_url")
        row["ats_score"] = resume.get("ats_score")
        row["match_score"] = match.get("final_score")
        row["risk_level"] = match.get("risk_level")
        row["skill_score"] = match.get("skill_score")
        out.append(row)
    return out
