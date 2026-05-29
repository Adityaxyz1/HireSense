from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from pydantic import BaseModel
from database import get_db, get_auth_db
from typing import Optional
import uuid
from routes.auth_dependency import require_user, get_current_user

router = APIRouter()


# ── Request schemas ──────────────────────────────────────────
class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None


class PasswordChange(BaseModel):
    new_password: str
    current_password: Optional[str] = None


# (Redundant auth helper removed, now using require_user dependency)


# ── GET /api/profile ─────────────────────────────────────────
@router.get("/profile")
async def get_profile(user=Depends(require_user)):
    """Fetch the current user's profile."""
    db = get_db()

    try:
        result = db.table("profiles").select("*").eq("id", str(user.id)).execute()

        if result.data and len(result.data) > 0:
            profile = result.data[0]
        else:
            # Auto-create profile on first access
            profile = {
                "id": str(user.id),
                "display_name": "",
                "avatar_url": "",
            }
            try:
                db.table("profiles").insert(profile).execute()
            except Exception:
                pass  # Might already exist due to race condition

        return {
            "profile": {
                "id": str(user.id),
                "email": user.email,
                "display_name": profile.get("display_name", ""),
                "avatar_url": profile.get("avatar_url", ""),
                "role": profile.get("role") or "recruiter",
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Fetch profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile.")


# ── PUT /api/profile ─────────────────────────────────────────
@router.put("/profile")
async def update_profile(payload: ProfileUpdate, user=Depends(require_user)):
    """Update display name."""
    db = get_db()

    try:
        # Upsert profile
        update_data = {}
        if payload.display_name is not None:
            update_data["display_name"] = payload.display_name.strip()

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Try update first
        result = db.table("profiles").update(update_data).eq("id", str(user.id)).execute()

        if not result.data or len(result.data) == 0:
            # Profile doesn't exist yet, create it
            update_data["id"] = str(user.id)
            result = db.table("profiles").insert(update_data).execute()

        profile = result.data[0] if result.data else update_data

        return {
            "message": "Profile updated successfully",
            "profile": {
                "id": str(user.id),
                "email": user.email,
                "display_name": profile.get("display_name", ""),
                "avatar_url": profile.get("avatar_url", ""),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile.")


# ── POST /api/profile/avatar ────────────────────────────────
@router.post("/profile/avatar")
async def upload_avatar(file: UploadFile = File(...), user=Depends(require_user)):
    """Upload a profile picture to Supabase Storage."""
    db = get_db()

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed.")

    # Validate file size (max 2MB)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 2MB allowed.")

    try:
        # Generate unique filename
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{user.id}/{uuid.uuid4()}.{ext}"

        # Delete old avatar files for this user
        try:
            old_files = db.storage.from_("avatars").list(str(user.id))
            if old_files:
                paths = [f"{user.id}/{f['name']}" for f in old_files]
                if paths:
                    db.storage.from_("avatars").remove(paths)
        except Exception:
            pass  # Not critical if cleanup fails

        # Upload new avatar
        db.storage.from_("avatars").upload(
            filename,
            contents,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )

        # Get public URL
        public_url = db.storage.from_("avatars").get_public_url(filename)

        # Update profile with new avatar URL
        result = db.table("profiles").update({
            "avatar_url": public_url,
        }).eq("id", str(user.id)).execute()

        if not result.data or len(result.data) == 0:
            # Create profile if it doesn't exist
            db.table("profiles").insert({
                "id": str(user.id),
                "avatar_url": public_url,
            }).execute()

        return {
            "message": "Avatar uploaded successfully",
            "avatar_url": public_url,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Avatar upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload avatar.")


# ── POST /api/profile/change-password ───────────────────────
@router.post("/profile/change-password")
async def change_password(payload: PasswordChange, request: Request, user=Depends(require_user)):
    """Change the password for the currently authenticated user.

    Requires re-authentication with the current password to prevent a stolen
    or lingering session token from silently taking over the account.
    """
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if not payload.current_password:
        raise HTTPException(status_code=400, detail="Current password is required.")

    # Re-authenticate the user with their current password (anon client).
    try:
        auth = get_auth_db()
        result = auth.auth.sign_in_with_password({
            "email": user.email,
            "password": payload.current_password,
        })
        if not result or not getattr(result, "user", None):
            raise HTTPException(status_code=401, detail="Current password is incorrect.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must differ from the current password.")

    # Apply the change via the admin API (service-role key).
    try:
        get_db().auth.admin.update_user_by_id(
            str(user.id),
            {"password": payload.new_password},
        )
        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Password change error for {user.id}: {e}")  # log internally only
        raise HTTPException(status_code=400, detail="Failed to change password. Please try again.")
