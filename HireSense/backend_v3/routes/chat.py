from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from database import get_db, row_to_dict
from routes.auth_dependency import get_current_user
import re

router = APIRouter()


class SearchRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = None


class SearchResult(BaseModel):
    id: str
    match_id: Optional[str]
    name: str
    job_title: str
    match_score: Optional[float]
    summary: str


class ChatResponse(BaseModel):
    reply: str
    results: List[SearchResult] = []


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: SearchRequest, request: Request):
    """Local Candidate Finder — scoped to authenticated user's resumes only."""
    query = payload.message.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    # Security: sanitize search input — strip SQL wildcards and limit length
    query = re.sub(r'[%_\\\'";]', '', query)[:200]
    if not query:
        raise HTTPException(status_code=400, detail="Invalid search query.")

    db = get_db()
    auth_user = get_current_user(request)

    # Build query — scoped to user's resumes only
    db_query = db.table("resumes").select(
        "*, match_results(id, final_score)"
    ).eq("status", "completed").ilike("raw_text", f"%{query}%").limit(5)

    if auth_user:
        db_query = db_query.eq("user_id", str(auth_user.id))

    response = db_query.execute()

    if not response.data:
        return ChatResponse(
            reply=f"I couldn't find any candidates matching '{payload.message}'. Try searching for a name, keyword, or job role."
        )

    results = []
    for r in response.data:
        # A resume might have multiple match_results. Take the highest score
        match_info = r.get("match_results", [])
        match_id = None
        final_score = None
        if match_info:
            best_match = max(match_info, key=lambda x: x.get("final_score") or 0)
            match_id = best_match.get("id")
            final_score = best_match.get("final_score")

        name = r.get("candidate_name")
        if not name:
            # Fallback
            filename = r.get("file_url", "Unknown Candidate").split("/")[-1]
            name = filename.split("_")[-1].replace(".pdf", "").strip()
            if len(name) < 2:
               name = filename.split(".")[0][:15]

        # Extract a short snippet
        text = r.get("raw_text", "")
        snippet = text[:100].replace("\n", " ").strip() + "..."

        results.append(SearchResult(
            id=r["id"],
            match_id=match_id,
            name=name,
            job_title="Candidate Profile",
            match_score=final_score,
            summary=snippet
        ))

    # Sort results by match_score descending
    results.sort(key=lambda x: x.match_score or 0, reverse=True)

    reply = f"I found {len(results)} candidate(s) matching your search."
    return ChatResponse(reply=reply, results=results)
