"""
Admin routes — Restricted strictly to the owner via Master Key verification.
Handles user management, data reallocation, and system logs.

"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from database import get_admin_db
from routes.admin_dependency import require_admin

router = APIRouter()

# ── Request schemas ──────────────────────────────────────────

class ReassignDataRequest(BaseModel):
    source_user_id: str
    target_user_id: str

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
            "id, title, user_id, created_at"
        ).order("created_at", desc=True).limit(500).execute()

        users_resp = db.auth.admin.list_users()
        users_map = {str(u.id): u.email for u in users_resp}

        jobs = jobs_resp.data
        for j in jobs:
            j["user_email"] = users_map.get(str(j.get("user_id", "")), "Unknown User")

        return {"jobs": jobs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch global jobs: {str(e)}")
