"""
Shared authentication dependency for extracting the current user from JWT.
"""
from fastapi import HTTPException, Request
from database import get_auth_db


def get_current_user(request: Request):
    """Extract and verify the authenticated user from the Authorization header.
    
    Returns the user object from Supabase Auth.
    Falls back to None if no auth header is present or token is invalid.
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.replace("Bearer ", "")
    db = get_auth_db()
    try:
        # result.user will be None if the token is invalid or expired
        result = db.auth.get_user(token)
        return result.user if result else None
    except Exception as e:
        print(f"Auth verification error: {e}")
        return None


def require_user(request: Request):
    """Extract and verify the authenticated user. Raises 401 if not authenticated.
    
    This is the primary dependency for routes requiring strict security.
    """
    user = get_current_user(request)
    if user is None:
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Please log in."
        )
    return user
