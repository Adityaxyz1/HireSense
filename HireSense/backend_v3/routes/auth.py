"""
Authentication routes — Audit logging only.

Actual authentication is handled entirely by Supabase client SDK on the frontend.
These endpoints only log auth events (signup, login, logout) for the admin audit trail.
The backend NEVER receives or processes user passwords.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from config import settings
from database import get_db, get_admin_db
from routes.auth_dependency import require_user

router = APIRouter()


# ── Request schema (shared by all audit endpoints) ───────────
class AuthEventPayload(BaseModel):
    user_id: str
    email: str
    # Optional persona — only sent on signup ('recruiter' | 'applicant')
    role: Optional[str] = None
    full_name: Optional[str] = None


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
async def log_signup(payload: AuthEventPayload, request: Request):
    """Log a signup event and persist the chosen persona role.

    Auth itself is handled client-side by the Supabase SDK. Here we also set
    profiles.role and, for applicants, seed an applicant_profiles row — using the
    service-role client so it works before email confirmation (no session yet).
    """
    _log_auth_event("signup", payload.user_id, payload.email, request)

    role = (payload.role or "recruiter").lower()
    if role not in ("recruiter", "applicant"):
        role = "recruiter"

    try:
        admin = get_admin_db()
        admin.table("profiles").upsert({"id": payload.user_id, "role": role}).execute()
        if role == "applicant":
            admin.table("applicant_profiles").upsert({
                "id": payload.user_id,
                "full_name": (payload.full_name or payload.email.split("@")[0]),
                "email": payload.email,
                "skills_json": [],
            }).execute()
    except Exception as e:
        print(f"[AUTH] Failed to persist role for {payload.email}: {e}")

    return {"message": "Signup event logged", "role": role}


# ── POST /api/auth/oauth-sync ────────────────────────────────
@router.post("/auth/oauth-sync")
async def oauth_sync(payload: AuthEventPayload, request: Request, user=Depends(require_user)):
    """Resolve a persona for a social/OAuth sign-in.

    Identity comes from the verified JWT (not the body), so it can't be spoofed.
    For a BRAND-NEW account we assign the requested persona and log a signup; for
    a returning user we never touch the existing role — we just log a login. This
    keeps the admin-created-recruiter invariant intact for accounts that already
    have a role, while letting first-time social sign-ins land in the right region.
    """
    user_id = str(user.id)
    email = (user.email or "").lower()

    admin = get_admin_db()

    # Look up any persona already on file — we must not clobber it.
    current_role = None
    try:
        existing = admin.table("profiles").select("role").eq("id", user_id).execute()
        if existing.data:
            current_role = existing.data[0].get("role")
    except Exception as e:
        print(f"[AUTH] oauth-sync role lookup failed for {email}: {e}")

    if current_role:
        # Returning user — log a login, leave the persona untouched.
        _log_auth_event("login", user_id, email, request)
        return {"role": current_role, "is_new": False}

    # Brand-new account: decide the persona. Admins live in the recruiter region
    # (so they can reach /admin); otherwise honor the tab the user picked.
    requested = (payload.role or "applicant").lower()
    if email in settings.ADMIN_EMAILS:
        final_role = "recruiter"
    elif requested == "recruiter":
        final_role = "recruiter"
    else:
        final_role = "applicant"

    _log_auth_event("signup", user_id, email, request)
    try:
        admin.table("profiles").upsert({"id": user_id, "role": final_role}).execute()
        if final_role == "applicant":
            admin.table("applicant_profiles").upsert({
                "id": user_id,
                "full_name": (payload.full_name or email.split("@")[0]),
                "email": email,
                "skills_json": [],
            }).execute()
    except Exception as e:
        print(f"[AUTH] Failed to persist OAuth role for {email}: {e}")

    return {"role": final_role, "is_new": True}


# ── POST /api/auth/login ─────────────────────────────────────
@router.post("/auth/login")
async def log_login(payload: AuthEventPayload, request: Request):
    """Log a login event (audit trail only — auth is handled client-side by Supabase SDK)."""
    _log_auth_event("login", payload.user_id, payload.email, request)
    return {"message": "Login event logged"}


# ── POST /api/auth/logout ────────────────────────────────────
@router.post("/auth/logout")
async def log_logout(payload: AuthEventPayload, request: Request):
    """Log a logout event."""
    _log_auth_event("logout", payload.user_id, payload.email, request)
    return {"message": "Logout event logged"}


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
