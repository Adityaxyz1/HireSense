"""
Shared authentication dependency for extracting the current user from JWT.
"""
from fastapi import HTTPException, Request
from database import get_db


def get_current_user(request: Request):
    """Extract and verify the authenticated user from the Authorization header.
    
    Returns the user object from Supabase Auth.
    Falls back to None if no auth header is present (for backward compatibility).
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.replace("Bearer ", "")
    db = get_db()
    try:
        result = db.auth.get_user(token)
        if result.user is None:
            return None
        return result.user
    except Exception:
        return None


def require_user(request: Request):
    """Extract and verify the authenticated user. Raises 401 if not authenticated."""
    user = get_current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
