from fastapi import APIRouter, HTTPException, Request, Depends
import json

from database import get_db, new_id
from services.embedding_engine import generate_embedding
from routes.schemas import JobUploadRequest, JobUploadResponse
from routes.auth_dependency import require_user

router = APIRouter()


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
        "id, job_text, title, created_at"
    ).eq("user_id", str(user.id)).order("created_at", desc=True).execute()

    return response.data


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
