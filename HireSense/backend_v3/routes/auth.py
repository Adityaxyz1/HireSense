"""
Authentication routes using Supabase Auth.
Tracks login/logout/signup events in the auth_logs table.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from database import get_db
from datetime import datetime, timezone
from routes.auth_dependency import require_user

router = APIRouter()


# ── Request schemas ──────────────────────────────────────────
class AuthCredentials(BaseModel):
    email: str
    password: str

class LogoutPayload(BaseModel):
    user_id: str
    email: str


# ── Helper: log auth event ──────────────────────────────────
def _log_auth_event(event_type: str, user_id: str, email: str, request: Request):
    """Insert a row into auth_logs to track login/logout/signup events."""
    db = get_db()
    try:
        ip = request.client.host if request.client else "unknown"
        ua = request.headers.get("user-agent", "unknown")
        db.table("auth_logs").insert({
            "user_id": user_id,
            "email": email,
            "event_type": event_type,
            "ip_address": ip,
            "user_agent": ua,
        }).execute()
    except Exception as e:
        # Don't let logging failures break auth flow
        print(f"[AUTH LOG WARNING] Failed to log {event_type}: {e}")


# ── POST /api/auth/signup ────────────────────────────────────
@router.post("/auth/signup")
async def signup(creds: AuthCredentials, request: Request):
    """Create a new user via Supabase Auth."""
    db = get_db()
    try:
        result = db.auth.sign_up({
            "email": creds.email,
            "password": creds.password,
        })

        if result.user is None:
            raise HTTPException(status_code=400, detail="Signup failed. Check email/password requirements.")

        _log_auth_event("signup", str(result.user.id), creds.email, request)

        return {
            "message": "Account created successfully",
            "user": {
                "id": str(result.user.id),
                "email": result.user.email,
            },
            "session": {
                "access_token": result.session.access_token if result.session else None,
                "refresh_token": result.session.refresh_token if result.session else None,
            } if result.session else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg.lower() or "already exists" in error_msg.lower():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        raise HTTPException(status_code=400, detail=f"Signup failed: {error_msg}")


# ── POST /api/auth/login ─────────────────────────────────────
@router.post("/auth/login")
async def login(creds: AuthCredentials, request: Request):
    """Sign in a user via Supabase Auth."""
    db = get_db()
    try:
        result = db.auth.sign_in_with_password({
            "email": creds.email,
            "password": creds.password,
        })

        if result.user is None:
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        _log_auth_event("login", str(result.user.id), creds.email, request)

        return {
            "message": "Login successful",
            "user": {
                "id": str(result.user.id),
                "email": result.user.email,
            },
            "session": {
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "invalid" in error_msg.lower() or "credentials" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        raise HTTPException(status_code=400, detail=f"Login failed: {error_msg}")


# ── POST /api/auth/logout ────────────────────────────────────
@router.post("/auth/logout")
async def logout(payload: LogoutPayload, request: Request):
    """Log a logout event."""
    _log_auth_event("logout", payload.user_id, payload.email, request)
    return {"message": "Logged out successfully"}


# ── GET /api/auth/me ──────────────────────────────────────────
@router.get("/auth/me")
async def get_my_info(user=Depends(require_user)):
    """Verify session and return current user info."""
    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
        }
    }


