from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File, BackgroundTasks
import json
import uuid

from database import get_db, new_id
from services.embedding_engine import generate_embedding
from services.pdf_parser import compress_pdf, extract_text
from routes.schemas import JobUploadRequest, JobUploadResponse, JobUpdateRequest, EvaluateRequest
from routes.auth_dependency import require_user
from routes.evaluate import evaluate_resume

router = APIRouter()

# Allowed job lifecycle states (kept permissive to match the UI + student feed).
ALLOWED_JOB_STATUSES = {"draft", "active", "published", "closed", "archived", "paused"}


@router.post("/upload-job", response_model=JobUploadResponse)
def upload_job(payload: JobUploadRequest, user=Depends(require_user)):
    """Save a job description and compute its embedding — scoped to authenticated user."""
    text = payload.job_text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Job text cannot be empty.")

    # REQUIRE authenticated user
    user_id = str(user.id)

    try:
        vector = generate_embedding(text)

        job_id = new_id()
        db = get_db()
        data = {
            "id": job_id,
            "user_id": user_id,
            "job_text": text,
            "title": payload.title or f"Job Description {job_id[:8]}",
            "embedding": vector
        }
        db.table("job_descriptions").insert(data).execute()

        return JobUploadResponse(job_id=job_id)
    except Exception as e:
        print(f"Job upload error: {e}")  # Log internally only
        raise HTTPException(status_code=500, detail="An internal error occurred while saving the job.")


@router.get("/jobs")
def list_jobs(user=Depends(require_user)):
    """List job descriptions — scoped to authenticated user only."""
    db = get_db()

    # Enforce strict user_id filtering
    response = db.table("job_descriptions").select(
        "id, job_text, title, created_at, status, recruitment_docs"
    ).eq("user_id", str(user.id)).order("created_at", desc=True).execute()

    return response.data


@router.put("/jobs/{job_id}")
def update_job(job_id: str, payload: JobUpdateRequest, user=Depends(require_user)):
    """Update job description, title, or status. Re-computes embedding if text changes."""
    db = get_db()
    chk = db.table("job_descriptions").select("id, job_text").eq("id", job_id).eq("user_id", str(user.id)).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    update_data = {}
    if payload.title is not None:
        update_data["title"] = payload.title
    if payload.status is not None:
        status = payload.status.strip().lower()
        if status not in ALLOWED_JOB_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {', '.join(sorted(ALLOWED_JOB_STATUSES))}.",
            )
        update_data["status"] = status
    if payload.job_text is not None and payload.job_text != chk.data[0]["job_text"]:
        update_data["job_text"] = payload.job_text
        update_data["embedding"] = generate_embedding(payload.job_text)
        # We optionally might want to mark candidates as outdated, but we will handle on-demand trigger instead

    if not update_data:
        return {"message": "No changes made."}

    db.table("job_descriptions").update(update_data).eq("id", job_id).execute()
    return {"message": "Job updated successfully."}


@router.post("/jobs/{job_id}/upload-document")
async def upload_job_document(job_id: str, file: UploadFile = File(...), user=Depends(require_user)):
    """Upload a recruitment document. Compresses PDFs >10MB. Saves to Supabase storage."""
    db = get_db()
    chk = db.table("job_descriptions").select("id, recruitment_docs").eq("id", job_id).eq("user_id", str(user.id)).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)

    is_pdf = file.filename.lower().endswith('.pdf')
    
    if file_size_mb > 10.0:
        if is_pdf:
            try:
                file_bytes = compress_pdf(file_bytes)
                file_size_mb = len(file_bytes) / (1024 * 1024)
                if file_size_mb > 10.0:
                    raise HTTPException(status_code=400, detail="File too large even after compression.")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to compress PDF: {e}")
        else:
            raise HTTPException(status_code=400, detail="File exceeds 10MB limit and is not a PDF.")
            
    # Upload to Supabase Storage
    try:
        bucket_name = "job_documents"
        safe_filename = f"{job_id}/{uuid.uuid4()}_{file.filename}"
        mime_type = file.content_type or "application/octet-stream"
        
        db.storage.from_(bucket_name).upload(
            safe_filename, 
            file_bytes, 
            file_options={"content-type": mime_type}
        )
        
        # Get public URL
        file_url = db.storage.from_(bucket_name).get_public_url(safe_filename)
        
        # Update JSONB array in DB
        docs = chk.data[0].get("recruitment_docs") or []
        docs.append({
            "filename": file.filename,
            "url": file_url,
            "size_mb": round(file_size_mb, 2)
        })
        db.table("job_descriptions").update({"recruitment_docs": docs}).eq("id", job_id).execute()
        
        return {"message": "Document uploaded successfully", "docs": docs}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading doc: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document.")


def run_matches_background(job_id: str, user):
    """Background task to run matches for all resumes against a job."""
    try:
        db = get_db()
        # Fetch all resumes for the user
        resumes_res = db.table("resumes").select("id").eq("user_id", str(user.id)).execute()
        if not resumes_res.data:
            return
            
        for resume in resumes_res.data:
            resume_id = resume["id"]
            # We call the synchronous evaluate_resume from routes.evaluate
            # But wait, evaluate_resume takes a payload and user.
            req = EvaluateRequest(resume_id=resume_id, job_id=job_id, fair_mode=False)
            try:
                evaluate_resume(req, user=user)
            except Exception as e:
                print(f"Match background error for resume {resume_id}: {e}")
    except Exception as e:
        print(f"Match background task error: {e}")


@router.post("/jobs/{job_id}/match")
async def trigger_job_matches(job_id: str, background_tasks: BackgroundTasks, user=Depends(require_user)):
    """Trigger a match re-run for all candidates against this job description."""
    db = get_db()
    chk = db.table("job_descriptions").select("id").eq("id", job_id).eq("user_id", str(user.id)).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    background_tasks.add_task(run_matches_background, job_id, user)
    return {"message": "Match re-run triggered successfully in the background."}


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str, user=Depends(require_user)):
    """Delete a job description — only if owned by the authenticated user."""
    db = get_db()

    # Verify ownership — strict filtering
    chk = db.table("job_descriptions").select("id").eq("id", job_id).eq("user_id", str(user.id)).execute()

    if not chk.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    try:
        # Cascade: remove match results referencing this job
        db.table("match_results").delete().eq("job_id", job_id).execute()
        db.table("job_descriptions").delete().eq("id", job_id).execute()
        return {"message": "Job description successfully removed."}
    except Exception as e:
        print(f"Delete job error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete job description.")
