from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from database import get_db
from services.skill_engine import calculate_skill_overlap, extract_skills_with_proficiency
from services.experience_engine import calculate_experience_score
from services.resume_strength import compute_strength
from services.bias_engine import generate_bias_report
from services.scorer import compute_final_score, get_risk_level
from services.embedding_engine import generate_embedding
from routes.schemas import EvaluateRequest, EvaluateResponse
from routes.auth_dependency import require_user

router = APIRouter()


@router.post("/evaluate", response_model=EvaluateResponse)
def evaluate_resume(payload: EvaluateRequest, user=Depends(require_user)):
    """Evaluate a resume against a job — verifies ownership of both resources."""
    db = get_db()
    user_id = str(user.id)

    # 1. Fetch Job — verify ownership (avoid SELECT * to skip vector columns)
    try:
        job_res = db.table("job_descriptions").select("id, user_id, job_text").eq("id", payload.job_id).eq("user_id", user_id).execute()
    except Exception:
        # Fallback if column selection fails
        job_res = db.table("job_descriptions").select("*").eq("id", payload.job_id).eq("user_id", user_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job description not found.")
    job_data = job_res.data[0]

    # 2. Fetch Resume — verify ownership (avoid SELECT * to skip vector columns)
    try:
        res_res = db.table("resumes").select("id, user_id, raw_text, candidate_name, file_url, ats_score, ats_breakdown, status").eq("id", payload.resume_id).eq("user_id", user_id).execute()
    except Exception:
        res_res = db.table("resumes").select("*").eq("id", payload.resume_id).eq("user_id", user_id).execute()
    if not res_res.data:
        raise HTTPException(status_code=404, detail="Resume not found.")
    resume_data = res_res.data[0]


    r_text = resume_data.get("raw_text") or ""
    if not r_text.strip():
        raise HTTPException(status_code=422, detail="Resume has no parseable text.")
    j_text = job_data["job_text"]

    # 3. Compute Semantic Score
    # Handle case where embeddings might not be generated yet
    # Generate embeddings on-the-fly (always — avoids reliance on stored vector columns)
    r_emb = np.array(generate_embedding(r_text))
    jd_emb = np.array(generate_embedding(j_text))
    semantic_sim = float(cosine_similarity([jd_emb], [r_emb])[0][0])
    semantic_score = max(0.0, semantic_sim)

    # 4. Compute Sub-scores
    skill_score = calculate_skill_overlap(r_text, j_text)
    exp_score = calculate_experience_score(r_text, j_text)
    strength = compute_strength(r_text)
    bias_report = generate_bias_report(r_text) if payload.fair_mode else None
    skills_proficiency = extract_skills_with_proficiency(r_text)

    # 5. Final Aggregation
    final_score = compute_final_score(semantic_score, skill_score, exp_score, strength, payload.fair_mode)
    risk_level = get_risk_level(final_score)

    # 6. Save to match_results — upsert to avoid duplicates for same resume+job pair
    insert_data = {
        "user_id": user_id,
        "resume_id": payload.resume_id,
        "job_id": payload.job_id,
        "semantic_score": round(semantic_score, 4),
        "skill_score": round(skill_score, 4),
        "experience_score": round(exp_score, 4),
        # Canonical 0–100 scale (matches /match and what the UI expects).
        "final_score": round(final_score * 100, 2),
        "resume_strength": strength,
        "risk_level": risk_level,
        "fair_mode_enabled": payload.fair_mode,
        "bias_report": bias_report,
        "candidate_status": "pending"
    }
    # Check if a match for this resume+job combo already exists (best-effort)
    try:
        existing = db.table("match_results").select("id").eq("resume_id", payload.resume_id).eq("job_id", payload.job_id).execute()
        if existing.data:
            db.table("match_results").update(insert_data).eq("id", existing.data[0]["id"]).execute()
        else:
            db.table("match_results").insert(insert_data).execute()
    except Exception as mr_err:
        print(f"Match results persistence warning (non-fatal): {mr_err}")

    # 7. Return response
    return EvaluateResponse(
        match_percentage=round(final_score * 100, 2),
        resume_strength=strength,
        skill_overlap=round(skill_score * 100, 2),
        risk_level=risk_level,
        semantic_score=round(semantic_score * 100, 2),
        experience_score=round(exp_score * 100, 2),
        fair_mode_enabled=payload.fair_mode,
        bias_audit=bias_report,
        skills_found=skills_proficiency
    )


@router.get("/results")
def get_results(user=Depends(require_user)):
    """Get match results — scoped to authenticated user's data only."""
    db = get_db()

    # Query with Foreign Key joins
    select_query = """
        *,
        resumes (file_url, candidate_name),
        job_descriptions (job_text)
    """
    query = db.table("match_results").select(select_query).order("created_at", desc=True)

    # Scope to user's data (always enforced — require_user guarantees auth)
    query = query.eq("user_id", str(user.id))

    response = query.execute()

    # Flatten the response to match the previous SQL JOIN flat structure
    results = []
    for row in response.data:
        flat_row = row.copy()

        # Extract related data
        resume_info = flat_row.pop("resumes", {}) or {}
        job_info = flat_row.pop("job_descriptions", {}) or {}

        flat_row["resume_file"] = resume_info.get("file_url")
        flat_row["candidate_name"] = resume_info.get("candidate_name")
        flat_row["job_text"] = job_info.get("job_text")

        results.append(flat_row)

    return results


class StatusUpdate(BaseModel):
    status: str

@router.put("/results/{match_id}/status")
def update_candidate_status(match_id: str, payload: StatusUpdate, user=Depends(require_user)):
    """Update tracking status — only if owned by the authenticated user."""
    valid_statuses = {"pending", "approved", "rejected"}
    status = payload.status.lower()

    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status. Must be pending, approved, or rejected.")

    db = get_db()

    # Verify ownership (always enforced — require_user guarantees auth)
    query = db.table("match_results").select("id").eq("id", match_id)
    query = query.eq("user_id", str(user.id))
    chk = query.execute()

    if not chk.data:
        raise HTTPException(status_code=404, detail="Match result not found.")

    db.table("match_results").update({"candidate_status": status}).eq("id", match_id).execute()

    return {"message": "Status updated successfully", "status": status}
