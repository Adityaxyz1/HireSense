"""
Admin dependency to strictly verify the user identity and the Master Key.
"""
from fastapi import HTTPException, Request, Depends
from routes.auth_dependency import require_user
from config import settings

ADMIN_EMAIL = "aditya.poddar3698@gmail.com"

def require_admin(request: Request, user=Depends(require_user)):
    """
    Verify the user is the designated admin.
    """
    if user.email != ADMIN_EMAIL:
        raise HTTPException(
            status_code=403, 
            detail="Forbidden: Admin access only."
        )

    return user
