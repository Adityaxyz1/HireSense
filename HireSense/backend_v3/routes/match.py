from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import hashlib

from database import get_db, row_to_dict, new_id
from services.resume_matcher import match_resume_to_jd
from services.embedding_engine import generate_embedding
from services.experience_engine import calculate_experience_score
from services.resume_strength import compute_strength
from services.scorer import get_risk_level
from routes.auth_dependency import get_current_user

router = APIRouter()


class MatchRequest(BaseModel):
    resume_id: str
    jd_text: str


@router.post("/match")
def match_resume(payload: MatchRequest, request: Request):
    """
    POST /api/match
    Runs spaCy keyword extraction + semantic similarity to produce
    a detailed match report between a resume and a job description.
    Also natively saves the JD and Match context to DB so Pipeline/Jobs UI work smoothly.
    Scoped to authenticated user — verifies resume ownership.
    """
    if not payload.jd_text.strip():
        raise HTTPException(status_code=400, detail="jd_text is required")

    db = get_db()
    auth_user = get_current_user(request)
    user_id = str(auth_user.id) if auth_user else "local-user"

    # 1. Fetch Candidate Resume — verify ownership
    query = db.table("resumes").select("raw_text, status, user_id").eq("id", payload.resume_id)
    if auth_user:
        query = query.eq("user_id", user_id)
    response = query.execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Resume not found.")

    resume_data = response.data[0]
    raw_text = resume_data.get("raw_text") or ""
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Resume has no parseable text.")

    try:
        # 2. Check if JD Exists for THIS user
        jd_text = payload.jd_text.strip()
        job_query = db.table("job_descriptions").select("id").eq("job_text", jd_text)
        if auth_user:
            job_query = job_query.eq("user_id", user_id)
        job_response = job_query.execute()

        if job_response.data:
            job_id = job_response.data[0]["id"]
        else:
            vector = generate_embedding(jd_text)
            job_id = new_id()
            db.table("job_descriptions").insert({
                "id": job_id,
                "user_id": user_id,
                "job_text": jd_text,
                "embedding": vector
            }).execute()

        # 3. Compute Precision Match via LLM
        result = match_resume_to_jd(raw_text, jd_text)

        # 4. Synthesize Pipeline Data safely
        exp_score = calculate_experience_score(raw_text, jd_text)
        strength = compute_strength(raw_text)
        risk_level = get_risk_level(result.get("final_score", 0))

        # 5. Insert into Match Results (Pipeline Data) — with user_id
        insert_data = {
            "user_id": user_id,
            "resume_id": payload.resume_id,
            "job_id": job_id,
            "semantic_score": round(result.get("semantic_score", 0), 4),
            "skill_score": round(result.get("keyword_coverage", 0), 4),
            "experience_score": round(exp_score, 4),
            "final_score": round(result.get("final_score", 0), 4),
            "resume_strength": strength,
            "risk_level": risk_level,
            "fair_mode_enabled": False,
            "bias_report": None,
            "candidate_status": "pending"
        }

        # Avoid duplicate match combination
        chk = db.table("match_results").select("id").eq("resume_id", payload.resume_id).eq("job_id", job_id).execute()
        if not chk.data:
            db.table("match_results").insert(insert_data).execute()
        else:
            db.table("match_results").update(insert_data).eq("id", chk.data[0]["id"]).execute()

        # Persist match summary to resume record for retriever reference
        try:
            import json as _json
            db.table("resumes").update({
                "match_score": round(result.get("final_score", 0), 2),
                "match_breakdown": _json.dumps({
                    "semantic_score": result.get("semantic_score", 0),
                    "keyword_coverage": result.get("keyword_coverage", 0),
                    "matched_keywords": result.get("matched_keywords", []),
                    "missing_keywords": result.get("missing_keywords", []),
                }),
            }).eq("id", payload.resume_id).execute()
        except Exception as e:
            print(f"Match data persistence warning: {e}")
            if "policy" in str(e).lower() or "permission" in str(e).lower():
                result["_warning"] = "Database policy blocked saving this match. Results are only temporary."
            elif "column" in str(e).lower():
                result["_warning"] = "Database schema mismatch. Please run the recovery script."

        return result
    except Exception as e:
        print(f"Match error: {e}")  # Log internally only
        raise HTTPException(status_code=500, detail="An internal error occurred during matching.")
