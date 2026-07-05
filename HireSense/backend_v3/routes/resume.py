import asyncio
import json as _json
from types import SimpleNamespace

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from database import get_admin_db, get_db, row_to_dict
from routes.auth_dependency import require_user
from routes.schemas import UploadResponse
from services.core.embedding_engine import generate_embedding
from services.core.pdf_parser import extract_text
from services.core.storage_service import upload_resume_pdf
from services.pipeline.ats_scanner import scan_ats_compliance

router = APIRouter()


async def process_resume_background(resume_id: str, raw_text: str):
    """Background task to generate embedding and update DB."""
    db = get_db()
    try:
        # 1. Automatic background ATS scoring (fast, always works)
        ats_report = await scan_ats_compliance(raw_text)
        
        # Prepare immediate ATS update
        ats_update = {
            "ats_score": ats_report.get("score", 0),
            "ats_breakdown": _json.dumps(ats_report.get("breakdown", []))
        }
        
        # Save candidate name if extracted by ATS scanner AND it's not a generic placeholder
        new_name = ats_report.get("candidate_name")
        if new_name and str(new_name).strip().lower() not in ["candidate", "unknown", "none", "null"]:
            # Check if current record ALREADY has a valid name (don't overwrite user-provided name)
            try:
                curr = db.table("resumes").select("candidate_name").eq("id", resume_id).execute()
                existing_name = curr.data[0].get("candidate_name") if curr.data else None
                if not existing_name or str(existing_name).strip().lower() in ["candidate", "unknown", "none", "null"]:
                    ats_update["candidate_name"] = new_name
            except Exception:
                pass

        # Save ATS score and breakdown immediately so that the frontend's subsequent polling call
        # hits the cache instantly (0ms) instead of waiting for embedding or re-running the scan!
        db.table("resumes").update(ats_update).eq("id", resume_id).execute()
        
        # 2. Try embedding generation in a separate thread (prevents event loop blocking)
        try:
            vector = await asyncio.to_thread(generate_embedding, raw_text)
            db.table("resumes").update({
                "embedding": vector,
                "status": "completed"
            }).eq("id", resume_id).execute()
        except Exception as e:
            print(f"Embedding skipped for {resume_id} (non-fatal): {e}")
            db.table("resumes").update({
                "status": "completed"
            }).eq("id", resume_id).execute()

    except Exception as e:
        print(f"Error processing resume {resume_id}: {e}")
        # Try to update status to failed
        try:
            db.table("resumes").update({
                "status": "failed"
            }).eq("id", resume_id).execute()
        except Exception:
            pass


@router.post("/upload-resume", response_model=UploadResponse)
async def upload_resume(
    candidate_name: str = Form(default=None),
    file: UploadFile = File(...),
    user=Depends(require_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    actual_user_id = str(user.id)

    try:
        file_bytes = await file.read()
        
        # Security: validate PDF magic bytes (not just extension)
        if not file_bytes[:5].startswith(b'%PDF-'):
            raise HTTPException(status_code=400, detail="Invalid PDF file — content does not match PDF format.")
        
        # Security: enforce 10MB file size limit
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum 10MB allowed.")

        # Save PDF to Supabase Storage
        file_url = upload_resume_pdf(file_bytes, file.filename)

        # Extract text
        raw_text = extract_text(file_bytes)

        # Insert into Supabase with the authenticated user's ID
        db = get_db()
        data = {
            "user_id": actual_user_id,
            "file_url": file_url,
            "raw_text": raw_text,
            "candidate_name": candidate_name,
            "status": "processing"
        }
        result = db.table("resumes").insert(data).execute()
        resume_id = result.data[0]["id"]

        # Dispatch ATS scan + embedding to Celery worker
        from worker.tasks import embed_resume_task
        embed_resume_task.delay(resume_id, raw_text)

        return UploadResponse(resume_id=resume_id, status="processing")

    except HTTPException:
        # Preserve intended 400/413 validation responses instead of masking as 500.
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Resume upload error: {e}")  # Log internally only
        raise HTTPException(status_code=500, detail="An internal error occurred during upload.")


@router.get("/resumes")
def list_resumes(user=Depends(require_user)):
    """List resumes for the authenticated user only."""
    db = get_db()
    # Enforce strict user_id filtering
    response = db.table("resumes").select("*").eq("user_id", str(user.id)).order("created_at", desc=True).execute()
    return [row_to_dict(r) for r in response.data]


@router.get("/candidates")
def list_candidates(user=Depends(require_user)):
    """List candidates for the recruiter — a merged, de-duplicated view of:

    1. `source="upload"`  — resumes the recruiter uploaded themselves.
    2. `source="application"` — applicants to the recruiter's jobs (the resume
       is owned by the applicant, so it's fetched via the service-role client
       and joined through `applications` → `match_results`).

    Frontend uses `source` to route status writes to the correct endpoint
    (`/resumes/{id}/status` for uploads, `/results/{match_id}/status` for
    applications).
    """
    db = get_db()
    uid = str(user.id)
    result = []

    # ── Source 1: recruiter-owned uploaded resumes ──
    response = db.table("resumes").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
    for r in response.data:
        row = row_to_dict(r)
        if not row.get("candidate_status"):
            row["candidate_status"] = "pending"
        row["source"] = "upload"
        result.append(row)

    # ── Source 2: applicants to this recruiter's jobs ──
    try:
        job_ids = [j["id"] for j in (
            db.table("job_descriptions").select("id").eq("user_id", uid).execute().data or []
        )]
        if job_ids:
            admin = get_admin_db()
            apps = (admin.table("applications")
                    .select(
                        "id, status, created_at, resume_id, match_result_id, job_id, "
                        "job_descriptions (title), "
                        "applicant_profiles (full_name, avatar_url), "
                        "resumes (candidate_name, file_url, ats_score, ats_breakdown, "
                        "match_breakdown, status, raw_text), "
                        "match_results (id, final_score, candidate_status, risk_level, "
                        "skill_score, semantic_score)"
                    )
                    .in_("job_id", job_ids)
                    .order("created_at", desc=True)
                    .execute()).data or []
            for a in apps:
                job = a.get("job_descriptions") or {}
                prof = a.get("applicant_profiles") or {}
                resume = a.get("resumes") or {}
                match = a.get("match_results") or {}
                result.append({
                    "id": a.get("resume_id"),
                    "resume_id": a.get("resume_id"),
                    "source": "application",
                    "application_id": a.get("id"),
                    "match_id": match.get("id") or a.get("match_result_id"),
                    "candidate_status": match.get("candidate_status") or "pending",
                    "candidate_name": prof.get("full_name") or resume.get("candidate_name"),
                    "avatar_url": prof.get("avatar_url"),
                    "file_url": resume.get("file_url"),
                    "ats_score": resume.get("ats_score"),
                    "ats_breakdown": resume.get("ats_breakdown"),
                    "match_breakdown": resume.get("match_breakdown"),
                    "match_score": match.get("final_score"),
                    "risk_level": match.get("risk_level"),
                    "skill_score": match.get("skill_score"),
                    "semantic_score": match.get("semantic_score"),
                    "status": resume.get("status"),
                    "raw_text": resume.get("raw_text"),
                    "created_at": a.get("created_at"),
                    "job_title": job.get("title"),
                })
    except Exception as e:
        print(f"Applied-candidates merge skipped (non-fatal): {e}")

    return result





class ResumeStatusUpdate(BaseModel):
    status: str

@router.put("/resumes/{resume_id}/status")
def update_resume_status(resume_id: str, payload: ResumeStatusUpdate, user=Depends(require_user)):
    """Update the recruiter-facing candidate status for a resume."""
    valid = {"pending", "approved", "rejected", "interview"}
    status = payload.status.lower()
    if status not in valid:
        raise HTTPException(status_code=400, detail="Status must be pending, approved, interview, or rejected.")
    
    db = get_db()
    
    # Verify ownership — strict filtering
    chk = db.table("resumes").select("id").eq("id", resume_id).eq("user_id", str(user.id)).execute()
    
    if not chk.data:
        raise HTTPException(status_code=404, detail="Resume not found or access denied.")
    try:
        db.table("resumes").update({"candidate_status": status}).eq("id", resume_id).execute()
    except Exception as e:
        print(f"Resume status update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status. Please ensure the database schema is up to date.")

    # If this resume came in via an applicant application, mirror the triage
    # onto the application lifecycle so the applicant sees it (realtime live).
    try:
        app_status = {"approved": "shortlisted", "rejected": "rejected", "pending": "screening", "interview": "interview"}.get(status)
        if app_status:
            get_admin_db().table("applications").update({"status": app_status}).eq("resume_id", resume_id).execute()
    except Exception as e:
        print(f"Application-status propagation (resume) failed (non-fatal): {e}")

    return {"message": "Status updated", "status": status}


@router.delete("/resumes/{resume_id}")
def delete_resume(resume_id: str, user=Depends(require_user)):
    """Delete a resume — only if owned by the authenticated user."""
    db = get_db()
    
    # Verify ownership — strict filtering
    chk = db.table("resumes").select("id").eq("id", resume_id).eq("user_id", str(user.id)).execute()
    
    if not chk.data:
        raise HTTPException(status_code=404, detail="Resume not found or access denied.")
    
    try:
        # Clear child relations if any restrict it (defensive cleanup)
        db.table("match_results").delete().eq("resume_id", resume_id).execute()
        db.table("resumes").delete().eq("id", resume_id).execute()
        return {"message": "Candidate successfully removed."}
    except Exception as e:
        print(f"Delete resume error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete candidate.")




@router.get("/resumes/{resume_id}/ats")
async def get_ats_score(resume_id: str, force: bool = False, user=Depends(require_user)):
    """Run a standalone ATS compliance scan on an uploaded resume.
    Optimized: skips MagicalAPI to avoid 30s polling delay.
    Uses fast heuristics + LLM for instant results."""
    db = get_db()
    
    # Enforce ownership
    response = db.table("resumes").select(
        "raw_text, status, file_url, candidate_name, user_id, ats_score, ats_breakdown"
    ).eq("id", resume_id).eq("user_id", str(user.id)).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Resume not found.")
    
    resume_data = response.data[0]
    raw_text = resume_data.get("raw_text") or ""

    # Only reject if there is genuinely no text at all
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Resume has no parseable text to score.")

    # SPEED: If we already have a cached ATS score, return it instantly (unless force rescan)
    if not force:
        cached_score = resume_data.get("ats_score")
        cached_breakdown = resume_data.get("ats_breakdown")
        if cached_score and cached_score > 0 and cached_breakdown:
            try:
                breakdown = _json.loads(cached_breakdown) if isinstance(cached_breakdown, str) else cached_breakdown
                if breakdown and len(breakdown) > 0:
                    return {
                        "score": cached_score,
                        "candidate_name": resume_data.get("candidate_name") or None,
                        "breakdown": breakdown,
                        "_cached": True,
                    }
            except Exception:
                pass  # Fall through to fresh scan

    # Run ATS scan directly on raw_text (no MagicalAPI — saves 10-30s)
    report = await scan_ats_compliance(raw_text)

    # Always prefer user-provided candidate_name from the resume record
    if resume_data.get("candidate_name"):
        report["candidate_name"] = resume_data["candidate_name"]
    elif report.get("candidate_name"):
        # Save AI-extracted name back to the resume record
        try:
            db.table("resumes").update({"candidate_name": report["candidate_name"]}).eq("id", resume_id).execute()
        except Exception:
            pass

    # Persist ATS score and breakdown to resume record for future reference
    try:
        db.table("resumes").update({
            "ats_score": report.get("score", 0),
            "ats_breakdown": _json.dumps(report.get("breakdown", [])),
        }).eq("id", resume_id).execute()
    except Exception as e:
        print(f"ATS data persistence warning: {e}")
        if "policy" in str(e).lower():
            report["_warning"] = "Database policy blocked saving this report. Please run the SQL recovery script."
        elif "column" in str(e).lower():
            report["_warning"] = "Database schema mismatch. Please run the SQL recovery script."

    return report


@router.get("/stats")
def get_dashboard_stats(user=Depends(require_user)):
    """Compute real-time dashboard stats — scoped to authenticated user."""
    from datetime import datetime, timedelta

    db = get_db()
    
    # Fetch user-scoped resumes
    response = db.table("resumes").select("ats_score, candidate_status, created_at").eq("user_id", str(user.id)).execute()

    scores = []
    status_counts = {"pending": 0, "approved": 0, "rejected": 0}

    # Build daily upload counts for the current calendar week (Sunday to Saturday)
    today = datetime.utcnow().date()
    day_labels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
    days_since_sunday = (today.weekday() + 1) % 7
    last_sunday = today - timedelta(days=days_since_sunday)
    
    daily_uploads = {}
    for i in range(7):
        d = last_sunday + timedelta(days=i)
        daily_uploads[d.isoformat()] = 0

    for row in response.data:
        # Use the stored ATS score instead of re-running the scan
        ats = row.get("ats_score")
        if ats is not None and ats > 0:
            scores.append(ats)
        st = row.get("candidate_status") or "pending"
        if st in status_counts:
            status_counts[st] += 1
        # Count uploads per day
        created = row.get("created_at")
        if created:
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00")).date()
                key = dt.isoformat()
                if key in daily_uploads:
                    daily_uploads[key] += 1
            except Exception:
                pass

    # Build daily match counts — scoped to user's resumes
    # Get user's resume IDs first, then filter match_results
    resume_ids_resp = db.table("resumes").select("id").eq("user_id", str(user.id)).execute()
    user_resume_ids = [r["id"] for r in resume_ids_resp.data]
    
    if user_resume_ids:
        match_response = db.table("match_results").select("created_at").in_("resume_id", user_resume_ids).execute()
    else:
        match_response = SimpleNamespace(data=[])
    
    daily_matches = {}
    for key in daily_uploads:
        daily_matches[key] = 0
    for row in (match_response.data or []):
        created = row.get("created_at")
        if created:
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00")).date()
                key = dt.isoformat()
                if key in daily_matches:
                    daily_matches[key] += 1
            except Exception:
                pass

    # Build ordered weekly activity array
    weekly_activity = []
    sorted_dates = sorted(daily_uploads.keys())
    for date_str in sorted_dates:
        d = datetime.fromisoformat(date_str).date()
        weekly_activity.append({
            "d": day_labels[d.weekday()],
            "u": daily_uploads[date_str],
            "m": daily_matches.get(date_str, 0),
        })

    avg_ats = round(sum(scores) / len(scores)) if scores else 0

    return {
        "total_resumes": len(response.data),
        "avg_ats_score": avg_ats,
        "status_counts": status_counts,
        "weekly_activity": weekly_activity,
    }
