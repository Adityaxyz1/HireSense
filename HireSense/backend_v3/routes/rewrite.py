from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.rewrite_engine import rewrite_text
from routes.auth_dependency import require_user

router = APIRouter()


class RewriteRequest(BaseModel):
    text: str
    mode: str = "ats"  # ats, impact, technical
    use_ai: bool = False  # Deprecated, kept for compat


class RewriteResponse(BaseModel):
    rewritten: str
    changes: list
    score_before: int
    score_after: int
    mode: str


@router.post("/rewrite", response_model=RewriteResponse)
async def rewrite_resume(payload: RewriteRequest, user=Depends(require_user)):
    """Rewrite resume text using local heuristics only."""
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    if payload.mode not in ("ats", "impact", "technical"):
        raise HTTPException(status_code=400, detail="Mode must be 'ats', 'impact', or 'technical'.")

    # Local heuristics only, no external API
    result = rewrite_text(payload.text, payload.mode)
    return RewriteResponse(**result)
