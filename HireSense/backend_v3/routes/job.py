import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from database import get_db, new_id
from routes._http_errors import internal_error
from routes.auth_dependency import require_user
from routes.schemas import (JobUpdateRequest, JobUploadRequest,
                            JobUploadResponse)
from services.core.pdf_parser import compress_pdf
from worker.tasks import embed_job_task, run_job_match_task

router = APIRouter()

ALLOWED_JOB_STATUSES = {"draft", "active", "published", "closed", "archived", "paused"}


@router.post("/upload-job", response_model=JobUploadResponse)
def upload_job(payload: JobUploadRequest, user=Depends(require_user)):
    """Save a job description and return immediately — embedding computed in background."""
    text = payload.job_text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Job text cannot be empty.")

    user_id = str(user.id)

    try:
        job_id = new_id()
        db = get_db()
        db.table("job_descriptions").insert({
            "id": job_id,
            "user_id": user_id,
            "job_text": text,
            "title": payload.title or f"Job Description {job_id[:8]}",
        }).execute()

        embed_job_task.delay(job_id, text)

        return JobUploadResponse(job_id=job_id)
    except Exception as e:
        print(f"Job upload error: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred while saving the job.")


@router.get("/jobs")
def list_jobs(user=Depends(require_user)):
    """List job descriptions — scoped to authenticated user only."""
    db = get_db()
    response = db.table("job_descriptions").select(
        "id, job_text, title, created_at, status, recruitment_docs"
    ).eq("user_id", str(user.id)).order("created_at", desc=True).execute()
    return response.data


@router.put("/jobs/{job_id}")
def update_job(job_id: str, payload: JobUpdateRequest, user=Depends(require_user)):
    """Update job description, title, or status. Text changes re-trigger embedding."""
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

    text_changed = payload.job_text is not None and payload.job_text != chk.data[0]["job_text"]
    if text_changed:
        update_data["job_text"] = payload.job_text

    if not update_data:
        return {"message": "No changes made."}

    db.table("job_descriptions").update(update_data).eq("id", job_id).execute()

    if text_changed:
        embed_job_task.delay(job_id, payload.job_text)

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
    is_pdf = file.filename.lower().endswith(".pdf")

    if file_size_mb > 10.0:
        if not is_pdf:
            raise HTTPException(status_code=400, detail="File exceeds 10MB limit and is not a PDF.")
        try:
            file_bytes = compress_pdf(file_bytes)
        except Exception as e:
            raise internal_error("Failed to compress PDF", e, status_code=400,
                                 detail="Failed to compress PDF. Please upload a smaller file.")
        file_size_mb = len(file_bytes) / (1024 * 1024)
        if file_size_mb > 10.0:
            raise HTTPException(status_code=400, detail="File too large even after compression.")

    try:
        bucket_name = "job_documents"
        safe_filename = f"{job_id}/{uuid.uuid4()}_{file.filename}"
        mime_type = file.content_type or "application/octet-stream"

        db.storage.from_(bucket_name).upload(
            safe_filename,
            file_bytes,
            file_options={"content-type": mime_type},
        )

        file_url = db.storage.from_(bucket_name).get_public_url(safe_filename)

        docs = chk.data[0].get("recruitment_docs") or []
        docs.append({
            "filename": file.filename,
            "url": file_url,
            "size_mb": round(file_size_mb, 2),
        })
        db.table("job_descriptions").update({"recruitment_docs": docs}).eq("id", job_id).execute()

        return {"message": "Document uploaded successfully", "docs": docs}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading doc: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document.")


@router.post("/jobs/{job_id}/match")
def trigger_job_matches(job_id: str, user=Depends(require_user)):
    """Trigger a match re-run for all candidates against this job description."""
    db = get_db()
    chk = db.table("job_descriptions").select("id").eq("id", job_id).eq("user_id", str(user.id)).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    run_job_match_task.delay(job_id, str(user.id))
    return {"message": "Match re-run triggered successfully in the background."}


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str, user=Depends(require_user)):
    """Delete a job description — only if owned by the authenticated user."""
    db = get_db()
    chk = db.table("job_descriptions").select("id").eq("id", job_id).eq("user_id", str(user.id)).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    try:
        db.table("match_results").delete().eq("job_id", job_id).execute()
        db.table("job_descriptions").delete().eq("id", job_id).execute()
        return {"message": "Job description successfully removed."}
    except Exception as e:
        print(f"Delete job error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete job description.")
