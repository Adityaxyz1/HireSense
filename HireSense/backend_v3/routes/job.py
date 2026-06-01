from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File, BackgroundTasks
import uuid

from database import get_db, get_admin_db, new_id
from services.embedding_engine import generate_embedding
from services.pdf_parser import compress_pdf
from routes.schemas import JobUploadRequest, JobUploadResponse, JobUpdateRequest
from routes.auth_dependency import require_user
from routes.applications import rescore_application

router = APIRouter()

# Allowed job lifecycle states (kept permissive to match the UI + applicant feed).
ALLOWED_JOB_STATUSES = {"draft", "active", "published", "closed", "archived", "paused"}


def _embed_job_background(job_id: str, text: str):
    """Compute the JD embedding off the request path and store it. Matching
    regenerates embeddings on the fly, so a briefly-null vector is harmless."""
    try:
        vector = generate_embedding(text)
        get_db().table("job_descriptions").update({"embedding": vector}).eq("id", job_id).execute()
    except Exception as e:
        print(f"Background JD embedding failed for {job_id} (non-fatal): {e}")


@router.post("/upload-job", response_model=JobUploadResponse)
def upload_job(payload: JobUploadRequest, background_tasks: BackgroundTasks, user=Depends(require_user)):
    """Save a job description and return immediately — the embedding is computed
    in the background so job creation feels instant for the recruiter."""
    text = payload.job_text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Job text cannot be empty.")

    # REQUIRE authenticated user
    user_id = str(user.id)

    try:
        job_id = new_id()
        db = get_db()
        data = {
            "id": job_id,
            "user_id": user_id,
            "job_text": text,
            "title": payload.title or f"Job Description {job_id[:8]}",
        }
        db.table("job_descriptions").insert(data).execute()

        # Embedding is deferred — return the job_id without waiting on the model.
        background_tasks.add_task(_embed_job_background, job_id, text)

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
def update_job(job_id: str, payload: JobUpdateRequest, background_tasks: BackgroundTasks, user=Depends(require_user)):
    """Update job description, title, or status. When the text changes the
    embedding is recomputed in the background, so the edit returns instantly
    (the model cold-loads in ~20s — doing it inline blocked the request and made
    the description look like it never saved)."""
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

    # Recompute the JD embedding off the request path so the edit is instant.
    # (Re-matching regenerates embeddings on the fly, so a briefly-stale vector
    # is harmless.) Candidates are re-screened on the recruiter's on-demand
    # "Run Match", not here.
    if text_changed:
        background_tasks.add_task(_embed_job_background, job_id, payload.job_text)

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


async def run_matches_background(job_id: str, user):
    """Re-screen ONLY the candidates who applied to this job — not every resume
    the recruiter owns. Reuses the shared screening engine (rescore_application),
    which upserts each applicant's match_result and preserves recruiter triage."""
    try:
        db = get_admin_db()  # service-role: applied resumes are applicant-owned
        recruiter_id = str(user.id)  # job ownership verified by the caller

        apps = (db.table("applications")
                .select("id, resume_id, resumes(raw_text)")
                .eq("job_id", job_id).execute()).data or []

        for app in apps:
            resume = app.get("resumes") or {}
            raw_text = (resume.get("raw_text") or "").strip()
            if not raw_text:
                continue
            try:
                await rescore_application(app["id"], app["resume_id"], job_id, recruiter_id, raw_text)
            except Exception as e:
                print(f"Re-match error for application {app.get('id')}: {e}")
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
