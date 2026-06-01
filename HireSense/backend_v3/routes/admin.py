"""
Admin routes — Restricted strictly to the owner via Master Key verification.
Handles user management, data reallocation, and system logs.

"""
import re
import secrets
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from database import get_admin_db
from routes.admin_dependency import require_admin
from config import settings

router = APIRouter()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _invite_redirect_url(request: Request) -> str:
    """Where Supabase sends a recruiter after they click the onboarding invite:
    the app's set-password page. Derived from the admin's own origin so it works
    in dev (localhost:5173) and prod; falls back to the first configured CORS
    origin, then localhost.

    IMPORTANT: this URL must be present in the Supabase project's "Redirect URLs"
    allowlist, or Supabase ignores redirect_to and falls back to the Site URL.
    """
    candidate = request.headers.get("origin") or request.headers.get("referer") or ""
    parsed = urlparse(candidate)
    base = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ""
    if not base and settings.CORS_ORIGINS:
        base = settings.CORS_ORIGINS[0]
    base = (base or "http://localhost:5173").rstrip("/")
    return f"{base}/reset-password"

# ── Request schemas ──────────────────────────────────────────

class ReassignDataRequest(BaseModel):
    source_user_id: str
    target_user_id: str


class CreateRecruiterRequest(BaseModel):
    company_name: str
    full_name: str
    email: str
    phone: Optional[str] = None
    designation: Optional[str] = None
    company_website: Optional[str] = None
    linkedin_url: Optional[str] = None
    status: str = "active"  # 'active' | 'inactive'


class UpdateRecruiterRequest(BaseModel):
    company_name: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    company_website: Optional[str] = None
    linkedin_url: Optional[str] = None


class RecruiterStatusRequest(BaseModel):
    status: str  # 'active' | 'inactive'


# ── Audit logging helper ─────────────────────────────────────
def _audit(db, admin, action: str, target_id=None, target_email=None, details=None):
    """Write an admin action to the audit trail (best-effort — never blocks)."""
    try:
        db.table("admin_audit_logs").insert({
            "admin_id": str(admin.id),
            "admin_email": admin.email,
            "action": action,
            "target_id": str(target_id) if target_id else None,
            "target_email": target_email,
            "details": details or {},
        }).execute()
    except Exception as e:
        print(f"[AUDIT WARNING] {action}: {e}")


def _find_auth_user_by_email(db, email: str):
    """Return the auth user with this email, or None (case-insensitive)."""
    try:
        for u in db.auth.admin.list_users():
            if (u.email or "").lower() == email.lower():
                return u
    except Exception:
        pass
    return None


def _set_login_ban(db, user_id: str, disabled: bool):
    """Disable/enable a user's ability to log in via Supabase ban_duration.
    Best-effort: status in recruiter_accounts is the source of truth either way."""
    try:
        db.auth.admin.update_user_by_id(
            user_id, {"ban_duration": "876000h" if disabled else "none"}
        )
    except Exception as e:
        print(f"[RECRUITER] ban toggle skipped (non-fatal): {e}")

# ── GET /api/admin/me ────────────────────────────────────────
@router.get("/admin/me")
async def admin_me(admin=Depends(require_admin)):
    """Capability check for the frontend admin gate: 200 = admin, 403 = not.

    Mirrors backend authorization exactly (ADMIN_EMAILS allowlist OR
    profiles.role == 'admin'), so the UI never has to hardcode an email.
    """
    return {"is_admin": True, "email": getattr(admin, "email", None)}


# ── GET /api/admin/users ─────────────────────────────────────
@router.get("/admin/users")
async def list_users(admin=Depends(require_admin)):
    """List all registered users in the system."""
    db = get_admin_db()
    try:
        users_resp = db.auth.admin.list_users()
        
        users_data = []
        for u in users_resp:
            users_data.append({
                "id": str(u.id),
                "email": u.email,
                "created_at": u.created_at.isoformat() if hasattr(u.created_at, "isoformat") else str(u.created_at),
                "last_sign_in_at": u.last_sign_in_at.isoformat() if hasattr(u.last_sign_in_at, "isoformat") else str(u.last_sign_in_at)
            })
        
        # Join with profile data
        try:
            profiles_resp = db.table("profiles").select("id, display_name").execute()
            profiles_map = {p["id"]: p.get("display_name", "") for p in profiles_resp.data}
        except Exception:
            profiles_map = {}
        
        for u in users_data:
            u["display_name"] = profiles_map.get(u["id"], "")
            
        return {"users": users_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")


# ── DELETE /api/admin/users/{user_id} ────────────────────────
@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin)):
    """Permanently delete a user account and all their associated data."""
    if user_id == str(admin.id):
        raise HTTPException(status_code=400, detail="You cannot delete the master admin account.")
        
    db = get_admin_db()
    try:
        db.auth.admin.delete_user(user_id)
        await wipe_user_data_internal(user_id, db)
        return {"message": f"User {user_id} deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


# ── DELETE /api/admin/users/{user_id}/data ───────────────────
@router.delete("/admin/users/{user_id}/data")
async def wipe_user_data(user_id: str, admin=Depends(require_admin)):
    """Wipe all processed data (resumes, JD, matches) for a specific user without deleting account."""
    db = get_admin_db()
    try:
        await wipe_user_data_internal(user_id, db)
        return {"message": f"All data for user {user_id} wiped successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to wipe user data: {str(e)}")


async def wipe_user_data_internal(user_id: str, db):
    """Helper to delete data across all tables for a specific user."""
    # Order matters due to potential foreign keys
    
    # 1. Match Results (depends on resumes and jobs)
    resumes_resp = db.table("resumes").select("id").eq("user_id", user_id).execute()
    resume_ids = [r["id"] for r in resumes_resp.data]
    if resume_ids:
        db.table("match_results").delete().in_("resume_id", resume_ids).execute()
        
    # 2. Resumes
    db.table("resumes").delete().eq("user_id", user_id).execute()
    
    # 3. Job Descriptions
    db.table("job_descriptions").delete().eq("user_id", user_id).execute()
    
    # 4. Profile
    db.table("profiles").delete().eq("id", user_id).execute()


# ── POST /api/admin/reassign ─────────────────────────────────
@router.post("/admin/reassign")
async def reassign_data(payload: ReassignDataRequest, admin=Depends(require_admin)):
    """Transfer all processed data from one user to another."""
    if payload.source_user_id == payload.target_user_id:
        raise HTTPException(status_code=400, detail="Source and target user must be different.")
        
    db = get_admin_db()
    try:
        try:
            target_user = db.auth.admin.get_user_by_id(payload.target_user_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Target user does not exist.")
            
        resumes_updated = db.table("resumes").update(
            {"user_id": payload.target_user_id}
        ).eq("user_id", payload.source_user_id).execute()
        
        jobs_updated = db.table("job_descriptions").update(
            {"user_id": payload.target_user_id}
        ).eq("user_id", payload.source_user_id).execute()
        
        return {
            "message": "Data successfully reassigned.",
            "stats": {
                "resumes_transferred": len(resumes_updated.data) if resumes_updated.data else 0,
                "jobs_transferred": len(jobs_updated.data) if jobs_updated.data else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reassign data: {str(e)}")


# ── GET /api/admin/logs ──────────────────────────────────────
@router.get("/admin/logs")
async def get_admin_logs(admin=Depends(require_admin)):
    """Fetch system-wide auth logs (login/logout/signup trails)."""
    db = get_admin_db()
    try:
        result = db.table("auth_logs") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(200) \
            .execute()
        return {"logs": result.data}
    except Exception as e:
        if "PGRST205" in str(e) or "could not find the table" in str(e).lower():
            return {"logs": []}
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {str(e)}")


# ── GET /api/admin/resumes ───────────────────────────────────
@router.get("/admin/resumes")
async def get_all_resumes(admin=Depends(require_admin)):
    """Fetch all resumes in the database for the Master Control view."""
    db = get_admin_db()
    try:
        resumes_resp = db.table("resumes").select(
            "id, user_id, file_url, candidate_name, status, created_at, ats_score, candidate_status"
        ).order("created_at", desc=True).limit(500).execute()
        
        users_resp = db.auth.admin.list_users()
        users_map = {str(u.id): u.email for u in users_resp}
        
        resumes = resumes_resp.data
        for r in resumes:
            r["user_email"] = users_map.get(str(r.get("user_id", "")), "Unknown User")
            
        return {"resumes": resumes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch global resumes: {str(e)}")


# ── GET /api/admin/jobs ──────────────────────────────────────
@router.get("/admin/jobs")
async def get_all_jobs(admin=Depends(require_admin)):
    """Fetch all job descriptions in the database for the Master Control view."""
    db = get_admin_db()
    try:
        jobs_resp = db.table("job_descriptions").select(
            "id, title, user_id, created_at, status, recruitment_docs"
        ).order("created_at", desc=True).limit(500).execute()
        
        users_resp = db.auth.admin.list_users()
        users_map = {str(u.id): u.email for u in users_resp}
        
        jobs = jobs_resp.data
        for j in jobs:
            j["user_email"] = users_map.get(str(j.get("user_id", "")), "Unknown User")
            
        return {"jobs": jobs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch global jobs: {str(e)}")


class AdminJobUpdateRequest(BaseModel):
    title: str = None
    status: str = None


@router.put("/admin/jobs/{job_id}")
async def admin_update_job(job_id: str, payload: AdminJobUpdateRequest, admin=Depends(require_admin)):
    """Master Control: Update any job title or status."""
    db = get_admin_db()
    
    update_data = {}
    if payload.title is not None:
        update_data["title"] = payload.title
    if payload.status is not None:
        update_data["status"] = payload.status
        
    if not update_data:
        return {"message": "No changes requested."}
        
    try:
        db.table("job_descriptions").update(update_data).eq("id", job_id).execute()
        return {"message": "Job updated globally."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update job: {str(e)}")


@router.delete("/admin/jobs/{job_id}")
async def admin_delete_job(job_id: str, admin=Depends(require_admin)):
    """Master Control: Delete any job and its match references globally."""
    db = get_admin_db()
    try:
        db.table("match_results").delete().eq("job_id", job_id).execute()
        db.table("job_descriptions").delete().eq("id", job_id).execute()
        return {"message": "Job deleted globally."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete job: {str(e)}")


# =========================================================================
# RECRUITER MANAGEMENT — admin-only (require_admin enforces RBAC)
# =========================================================================

# ── GET /api/admin/recruiters ────────────────────────────────
@router.get("/admin/recruiters")
async def list_recruiters(search: str = "", status: str = "", admin=Depends(require_admin)):
    """List recruiter accounts with optional search + status filter."""
    db = get_admin_db()
    try:
        q = db.table("recruiter_accounts").select("*").order("created_at", desc=True)
        if status in ("active", "inactive"):
            q = q.eq("status", status)
        rows = q.execute().data or []

        if search:
            s = search.lower()
            rows = [
                r for r in rows
                if s in (r.get("full_name") or "").lower()
                or s in (r.get("email") or "").lower()
                or s in (r.get("company_name") or "").lower()
            ]
        return {"recruiters": rows}
    except Exception as e:
        if "PGRST205" in str(e) or "could not find the table" in str(e).lower():
            return {"recruiters": [], "_warning": "Run recruiter_management.sql in Supabase."}
        raise HTTPException(status_code=500, detail=f"Failed to list recruiters: {str(e)}")


# ── POST /api/admin/recruiters ───────────────────────────────
@router.post("/admin/recruiters")
async def create_recruiter(payload: CreateRecruiterRequest, request: Request, admin=Depends(require_admin)):
    """Create a recruiter account: provisions the auth user, sends an onboarding
    invite (password set on first login via the emailed link), records the
    structured profile, and audit-logs the creating admin."""
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")
    if not payload.company_name.strip() or not payload.full_name.strip():
        raise HTTPException(status_code=400, detail="Company name and full name are required.")
    if payload.status not in ("active", "inactive"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'inactive'.")

    db = get_admin_db()

    # Email uniqueness — check our table and Supabase auth
    existing = db.table("recruiter_accounts").select("id").eq("email", email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="A recruiter with this email already exists.")
    if _find_auth_user_by_email(db, email):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Provision the auth user + onboarding link. Prefer invite (emails the user);
    # fall back to create_user + recovery link if SMTP isn't configured. Both send
    # the recruiter to the app's set-password page so they can choose a password.
    redirect_url = _invite_redirect_url(request)
    onboarding_link = None
    try:
        invited = db.auth.admin.invite_user_by_email(email, {"redirect_to": redirect_url})
        user_obj = getattr(invited, "user", None) or invited
    except Exception as invite_err:
        print(f"[RECRUITER] invite email failed, using fallback: {invite_err}")
        try:
            created = db.auth.admin.create_user({
                "email": email,
                "password": secrets.token_urlsafe(18),   # secure random; never shared
                "email_confirm": True,
            })
            user_obj = getattr(created, "user", None) or created
        except Exception as create_err:
            raise HTTPException(status_code=500, detail=f"Failed to provision account: {create_err}")
        # Generate a set-password link the admin can forward manually
        try:
            link = db.auth.admin.generate_link({
                "type": "recovery",
                "email": email,
                "options": {"redirect_to": redirect_url},
            })
            props = getattr(link, "properties", None)
            onboarding_link = getattr(props, "action_link", None) if props else None
        except Exception:
            onboarding_link = None

    if not user_obj or not getattr(user_obj, "id", None):
        raise HTTPException(status_code=500, detail="Account provisioning returned no user.")
    new_id = str(user_obj.id)

    # Persist role + structured recruiter record
    try:
        db.table("profiles").upsert({
            "id": new_id, "role": "recruiter", "display_name": payload.full_name.strip(),
        }).execute()
    except Exception as e:
        print(f"[RECRUITER] profile upsert warning: {e}")

    try:
        db.table("recruiter_accounts").insert({
            "id": new_id,
            "company_name": payload.company_name.strip(),
            "full_name": payload.full_name.strip(),
            "email": email,
            "phone": payload.phone,
            "designation": payload.designation,
            "company_website": payload.company_website,
            "linkedin_url": payload.linkedin_url,
            "status": payload.status,
            "created_by": str(admin.id),
        }).execute()
    except Exception as e:
        # Roll back the auth user so we don't orphan it
        try:
            db.auth.admin.delete_user(new_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to save recruiter record: {str(e)}")

    if payload.status == "inactive":
        _set_login_ban(db, new_id, disabled=True)

    _audit(db, admin, "recruiter.create", new_id, email,
           {"company_name": payload.company_name, "status": payload.status})

    return {
        "message": "Recruiter account created. An onboarding email has been sent.",
        "recruiter_id": new_id,
        "onboarding_link": onboarding_link,  # present only if email delivery was unavailable
    }


# ── PUT /api/admin/recruiters/{rid} ──────────────────────────
@router.put("/admin/recruiters/{rid}")
async def update_recruiter(rid: str, payload: UpdateRecruiterRequest, admin=Depends(require_admin)):
    """Edit a recruiter's profile fields (email is immutable here)."""
    db = get_admin_db()
    chk = db.table("recruiter_accounts").select("id, email").eq("id", rid).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Recruiter not found.")

    updates = {k: v for k, v in {
        "company_name": payload.company_name,
        "full_name": payload.full_name,
        "phone": payload.phone,
        "designation": payload.designation,
        "company_website": payload.company_website,
        "linkedin_url": payload.linkedin_url,
    }.items() if v is not None}

    if not updates:
        return {"message": "No changes requested."}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        db.table("recruiter_accounts").update(updates).eq("id", rid).execute()
        if payload.full_name:
            db.table("profiles").upsert({"id": rid, "display_name": payload.full_name.strip()}).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update recruiter: {str(e)}")

    _audit(db, admin, "recruiter.update", rid, chk.data[0].get("email"), {"fields": list(updates.keys())})
    return {"message": "Recruiter updated successfully."}


# ── PUT /api/admin/recruiters/{rid}/status ───────────────────
@router.put("/admin/recruiters/{rid}/status")
async def set_recruiter_status(rid: str, payload: RecruiterStatusRequest, admin=Depends(require_admin)):
    """Enable ('active') or disable ('inactive') a recruiter's login access."""
    if payload.status not in ("active", "inactive"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'inactive'.")

    db = get_admin_db()
    chk = db.table("recruiter_accounts").select("id, email").eq("id", rid).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Recruiter not found.")

    try:
        db.table("recruiter_accounts").update({"status": payload.status, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", rid).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")

    _set_login_ban(db, rid, disabled=(payload.status == "inactive"))
    _audit(db, admin, "recruiter.status", rid, chk.data[0].get("email"), {"status": payload.status})
    return {"message": f"Recruiter {'disabled' if payload.status == 'inactive' else 'enabled'}.", "status": payload.status}


# ── DELETE /api/admin/recruiters/{rid} ───────────────────────
@router.delete("/admin/recruiters/{rid}")
async def delete_recruiter(rid: str, admin=Depends(require_admin)):
    """Delete a recruiter account, their auth user, and all associated data."""
    if rid == str(admin.id):
        raise HTTPException(status_code=400, detail="You cannot delete the admin account.")

    db = get_admin_db()
    chk = db.table("recruiter_accounts").select("id, email").eq("id", rid).execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Recruiter not found.")
    target_email = chk.data[0].get("email")

    try:
        await wipe_user_data_internal(rid, db)        # resumes / jobs / matches / profile
        db.table("recruiter_accounts").delete().eq("id", rid).execute()
        try:
            db.auth.admin.delete_user(rid)
        except Exception as e:
            print(f"[RECRUITER] auth delete warning: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete recruiter: {str(e)}")

    _audit(db, admin, "recruiter.delete", rid, target_email, {})
    return {"message": "Recruiter account deleted successfully."}


# ── GET /api/admin/audit-logs ────────────────────────────────
@router.get("/admin/audit-logs")
async def get_audit_logs(admin=Depends(require_admin)):
    """Fetch the recruiter-management audit trail."""
    db = get_admin_db()
    try:
        result = db.table("admin_audit_logs").select("*").order("created_at", desc=True).limit(200).execute()
        return {"logs": result.data}
    except Exception as e:
        if "PGRST205" in str(e) or "could not find the table" in str(e).lower():
            return {"logs": []}
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit logs: {str(e)}")
