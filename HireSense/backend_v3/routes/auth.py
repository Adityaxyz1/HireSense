"""
Authentication routes — Audit logging only.

Actual authentication is handled entirely by Supabase client SDK on the frontend.
These endpoints only log auth events (signup, login, logout) for the admin audit trail.
The backend NEVER receives or processes user passwords.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from config import settings
from database import get_admin_db, get_db
from routes.auth_dependency import get_current_user, require_user

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


def _verified_payload_identity(payload: AuthEventPayload, request: Request, require_session: bool = False):
    """Return a trusted (user_id, email) pair for audit/profile writes."""
    token_user = get_current_user(request)
    payload_email = (payload.email or "").lower()

    if token_user:
        token_id = str(token_user.id)
        token_email = (token_user.email or "").lower()
        if token_id != payload.user_id or token_email != payload_email:
            raise HTTPException(status_code=403, detail="Auth payload does not match the verified session.")
        return token_id, token_email

    if require_session:
        raise HTTPException(status_code=401, detail="Authentication required.")

    try:
        resp = get_admin_db().auth.admin.get_user_by_id(payload.user_id)
        auth_user = getattr(resp, "user", None) or resp
        auth_email = (getattr(auth_user, "email", "") or "").lower()
    except Exception:
        auth_email = ""

    if not auth_email or auth_email != payload_email:
        raise HTTPException(status_code=403, detail="Signup identity could not be verified.")

    return payload.user_id, auth_email


# ── POST /api/auth/signup ────────────────────────────────────
@router.post("/auth/signup")
async def log_signup(payload: AuthEventPayload, request: Request):
    """Log a signup event and persist the chosen persona role.

    Auth itself is handled client-side by the Supabase SDK. Here we also set
    profiles.role and, for applicants, seed an applicant_profiles row — using the
    service-role client so it works before email confirmation (no session yet).
    """
    user_id, email = _verified_payload_identity(payload, request, require_session=False)
    _log_auth_event("signup", user_id, email, request)

    # Recruiters are provisioned by an admin only — a self-service signup can
    # never create one, regardless of what the client requests. Admin-allowlisted
    # emails land in the recruiter region (so they can reach /admin); everyone
    # else is an applicant.
    role = "recruiter" if email in settings.ADMIN_EMAILS else "applicant"

    try:
        admin = get_admin_db()
        admin.table("profiles").upsert({"id": user_id, "role": role}).execute()
        if role == "applicant":
            admin.table("applicant_profiles").upsert({
                "id": user_id,
                "full_name": (payload.full_name or email.split("@")[0]),
                "email": email,
                "skills_json": [],
            }).execute()
    except Exception as e:
        print(f"[AUTH] Failed to persist role for {email}: {e}")

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

    # Brand-new account: decide the persona. Recruiters are admin-provisioned
    # only, so a self-service social sign-in can never become one — we ignore a
    # requested 'recruiter' role here. Admin-allowlisted emails land in the
    # recruiter region (so they can reach /admin); everyone else is an applicant.
    if email in settings.ADMIN_EMAILS:
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
async def log_login(payload: AuthEventPayload, request: Request, user=Depends(require_user)):
    """Log a login event (audit trail only — auth is handled client-side by Supabase SDK)."""
    _verified_payload_identity(payload, request, require_session=True)
    _log_auth_event("login", str(user.id), user.email, request)
    return {"message": "Login event logged"}


# ── POST /api/auth/logout ────────────────────────────────────
@router.post("/auth/logout")
async def log_logout(payload: AuthEventPayload, request: Request, user=Depends(require_user)):
    """Log a logout event."""
    _verified_payload_identity(payload, request, require_session=True)
    _log_auth_event("logout", str(user.id), user.email, request)
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
