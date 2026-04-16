from fastapi import APIRouter, File, UploadFile, BackgroundTasks, Form, HTTPException, Request

from database import get_db, row_to_dict
from services.pdf_parser import extract_text
from services.storage_service import upload_resume_pdf
from services.embedding_engine import generate_embedding
from services.ats_scanner import scan_ats_compliance
from routes.auth_dependency import get_current_user
import json as _json
from routes.schemas import UploadResponse

router = APIRouter()


def process_resume_background(resume_id: str, raw_text: str):
    """Background task to generate embedding and update DB."""
    db = get_db()
    try:
        vector = generate_embedding(raw_text)
        # Automatic background ATS scoring
        ats_report = scan_ats_compliance(raw_text)
        
        db.table("resumes").update({
            "embedding": vector,
            "ats_score": ats_report.get("score", 0),
            "ats_breakdown": _json.dumps(ats_report.get("breakdown", [])),
            "status": "completed"
        }).eq("id", resume_id).execute()
    except Exception as e:
        print(f"Error processing resume {resume_id}: {e}")
        db.table("resumes").update({
            "status": "failed"
        }).eq("id", resume_id).execute()


@router.post("/upload-resume", response_model=UploadResponse)
async def upload_resume(
    request: Request,
    background_tasks: BackgroundTasks,
    user_id: str = Form(default="local-user"),
    candidate_name: str = Form(default=None),
    file: UploadFile = File(...)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Get authenticated user — use their ID instead of form param
    auth_user = get_current_user(request)
    actual_user_id = str(auth_user.id) if auth_user else user_id

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

        # Kick off background embedding generation
        background_tasks.add_task(process_resume_background, resume_id, raw_text)

        return UploadResponse(resume_id=resume_id, status="processing")

    except Exception as e:
        print(f"Resume upload error: {e}")  # Log internally only
        raise HTTPException(status_code=500, detail="An internal error occurred during upload.")


@router.get("/resumes")
def list_resumes(request: Request):
    """List resumes for the authenticated user only."""
    db = get_db()
    auth_user = get_current_user(request)
    
    query = db.table("resumes").select("*").order("created_at", desc=True)
    if auth_user:
        query = query.eq("user_id", str(auth_user.id))
    
    response = query.execute()
    return [row_to_dict(r) for r in response.data]


@router.get("/candidates")
def list_candidates(request: Request):
    """List uploaded resumes as candidates — scoped to authenticated user."""
    db = get_db()
    auth_user = get_current_user(request)
    
    query = db.table("resumes").select("*").order("created_at", desc=True)
    if auth_user:
        query = query.eq("user_id", str(auth_user.id))
    
    response = query.execute()
    result = []
    for r in response.data:
        row = row_to_dict(r)
        if not row.get("candidate_status"):
            row["candidate_status"] = "pending"
        result.append(row)
    return result


from pydantic import BaseModel

class ResumeStatusUpdate(BaseModel):
    status: str

@router.put("/resumes/{resume_id}/status")
def update_resume_status(resume_id: str, payload: ResumeStatusUpdate, request: Request):
    """Update the recruiter-facing candidate status for a resume."""
    valid = {"pending", "approved", "rejected"}
    status = payload.status.lower()
    if status not in valid:
        raise HTTPException(status_code=400, detail="Status must be pending, approved, or rejected.")
    
    db = get_db()
    auth_user = get_current_user(request)
    
    # Verify ownership
    query = db.table("resumes").select("id").eq("id", resume_id)
    if auth_user:
        query = query.eq("user_id", str(auth_user.id))
    chk = query.execute()
    
    if not chk.data:
        raise HTTPException(status_code=404, detail="Resume not found.")
    try:
        db.table("resumes").update({"candidate_status": status}).eq("id", resume_id).execute()
    except Exception as e:
        print(f"Resume status update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status. Please ensure the database schema is up to date.")
    return {"message": "Status updated", "status": status}


@router.delete("/resumes/{resume_id}")
def delete_resume(resume_id: str, request: Request):
    """Delete a resume — only if owned by the authenticated user."""
    db = get_db()
    auth_user = get_current_user(request)
    
    # Verify ownership
    query = db.table("resumes").select("id").eq("id", resume_id)
    if auth_user:
        query = query.eq("user_id", str(auth_user.id))
    chk = query.execute()
    
    if not chk.data:
        raise HTTPException(status_code=404, detail="Resume not found.")
    
    try:
        # Clear child relations if any restrict it (defensive cleanup)
        db.table("match_results").delete().eq("resume_id", resume_id).execute()
        db.table("resumes").delete().eq("id", resume_id).execute()
        return {"message": "Candidate successfully removed."}
    except Exception as e:
        print(f"Delete resume error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete candidate.")




@router.get("/resumes/{resume_id}/ats")
def get_ats_score(resume_id: str, request: Request):
    """Run a standalone ATS compliance scan on an uploaded resume."""
    db = get_db()
    auth_user = get_current_user(request)
    
    query = db.table("resumes").select(
        "raw_text, status, file_url, candidate_name, user_id"
    ).eq("id", resume_id)
    if auth_user:
        query = query.eq("user_id", str(auth_user.id))
    response = query.execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Resume not found.")
    
    resume_data = response.data[0]
    raw_text = resume_data.get("raw_text") or ""

    # Only reject if there is genuinely no text at all
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Resume has no parseable text to score.")

    magical_data = None

    # Try MagicalAPI for enhanced parsing (optional — not required)
    try:
        import os, tempfile
        from services.magical_parser import parse_resume_with_magicalapi
        filename = (resume_data.get("file_url") or "").split("/")[-1]
        if filename:
            res_bytes = db.storage.from_("resumes").download(filename)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(res_bytes)
                local_tmp_path = tmp.name
            magical_data = parse_resume_with_magicalapi(local_tmp_path)
            os.remove(local_tmp_path)
    except Exception as e:
        print(f"MagicalAPI skipped (non-fatal): {e}")

    # Run ATS scan — works with or without magical_data
    report = scan_ats_compliance(raw_text, magical_data)

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
        import json as _json
        db.table("resumes").update({
            "ats_score": report.get("score", 0),
            "ats_breakdown": _json.dumps(report.get("breakdown", [])),
        }).eq("id", resume_id).execute()
    except Exception as e:
        print(f"ATS data persistence (non-fatal): {e}")

    return report


@router.get("/stats")
def get_dashboard_stats(request: Request):
    """Compute real-time dashboard stats — scoped to authenticated user."""
    from datetime import datetime, timedelta

    db = get_db()
    auth_user = get_current_user(request)
    
    query = db.table("resumes").select("ats_score, candidate_status, created_at")
    if auth_user:
        query = query.eq("user_id", str(auth_user.id))
    response = query.execute()

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
    if auth_user:
        resume_ids_resp = db.table("resumes").select("id").eq("user_id", str(auth_user.id)).execute()
        user_resume_ids = [r["id"] for r in resume_ids_resp.data]
        if user_resume_ids:
            match_response = db.table("match_results").select("created_at").in_("resume_id", user_resume_ids).execute()
        else:
            match_response = type('obj', (object,), {'data': []})()
    else:
        match_response = db.table("match_results").select("created_at").execute()
    
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
