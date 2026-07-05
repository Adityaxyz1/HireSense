"""
Admin dependency — verifies the caller is an admin via an env-driven email
allowlist OR a server-side role claim (profiles.role == 'admin'). This replaces
the previously hardcoded single-email check while staying backward compatible
(the allowlist defaults to the legacy admin address).
"""
from fastapi import Depends, HTTPException

from config import settings
from database import get_db
from routes.auth_dependency import require_user


def require_admin(user=Depends(require_user)):
    """Allow access only to configured admin emails or users with role='admin'."""
    email = (getattr(user, "email", "") or "").lower()
    if email in settings.ADMIN_EMAILS:
        return user

    # Fall back to a server-verified role claim on the profile.
    try:
        res = get_db().table("profiles").select("role").eq("id", str(user.id)).execute()
        if res.data and (res.data[0].get("role") or "").lower() == "admin":
            return user
    except Exception:
        pass

    raise HTTPException(status_code=403, detail="Forbidden: Admin access only.")
