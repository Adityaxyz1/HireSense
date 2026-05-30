"""
Applicant Region — applicant profile router (Phase 2).

Applicant identity lives in a dedicated `applicant_profiles` table (the persona
`role` flag lives on `profiles.role`). The backend uses the service-role client,
so these reads/writes bypass RLS while still being scoped by the verified JWT.

NOTE: the route paths stay under `/student/*` for backward compatibility with
existing clients; only the code identifiers use the "applicant" vocabulary.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel

from database import get_admin_db
from routes.auth_dependency import require_user
from services.pdf_parser import extract_text
from services.ats_scanner import scan_ats_compliance
from services.storage_service import (
    upload_applicant_resume_pdf,
    remove_applicant_resume_pdf,
)

router = APIRouter()

RESUME_MAX_BYTES = 10 * 1024 * 1024  # 10 MB
_PDF_MAGIC = b"%PDF-"
_GENERIC_NAMES = {"candidate", "unknown", "none", "null"}

# Server-side avatar limits — the bypass-proof fallback behind client optimization
AVATAR_MAX_BYTES = 200 * 1024  # 200 KB
AVATAR_TYPES = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png"}
# Magic-byte signatures so a renamed file can't slip past the content-type check
_JPEG_MAGIC = b"\xff\xd8\xff"
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


class ApplicantProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    major: Optional[str] = None
    graduation_year: Optional[str] = None
    skills_json: Optional[List[str]] = None


def _ensure_applicant_profile(db, user):
    """Fetch the applicant's profile, auto-creating a stub on first access."""
    res = db.table("applicant_profiles").select("*").eq("id", str(user.id)).execute()
    if res.data:
        return res.data[0]
    stub = {
        "id": str(user.id),
        "full_name": (user.email or "").split("@")[0],
        "email": user.email or "",
        "skills_json": [],
    }
    try:
        db.table("applicant_profiles").insert(stub).execute()
    except Exception:
        pass  # race — another request created it
    # Make sure the persona flag is set
    try:
        db.table("profiles").upsert({"id": str(user.id), "role": "applicant"}).execute()
    except Exception:
        pass
    return stub


@router.get("/student/profile")
def get_applicant_profile(user=Depends(require_user)):
    """Get (or lazily create) the authenticated applicant's profile."""
    db = get_admin_db()
    profile = _ensure_applicant_profile(db, user)
    return {"profile": profile}


@router.put("/student/profile")
def update_applicant_profile(payload: ApplicantProfileUpdate, user=Depends(require_user)):
    """Update the applicant's editable profile fields."""
    db = get_admin_db()
    _ensure_applicant_profile(db, user)

    updates = {}
    if payload.full_name is not None:
        updates["full_name"] = payload.full_name.strip()
    if payload.major is not None:
        updates["major"] = payload.major.strip()
    if payload.graduation_year is not None:
        updates["graduation_year"] = payload.graduation_year.strip()
    if payload.skills_json is not None:
        updates["skills_json"] = payload.skills_json

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    res = db.table("applicant_profiles").update(updates).eq("id", str(user.id)).execute()
    return {"message": "Profile updated", "profile": res.data[0] if res.data else updates}


@router.post("/student/profile/avatar")
async def upload_applicant_avatar(file: UploadFile = File(...), user=Depends(require_user)):
    """Upload an applicant's profile picture.

    Client-side optimization already squares + compresses the image below 200KB;
    this is the authoritative server-side validation that prevents oversized or
    spoofed uploads via direct API calls. The public URL is written to BOTH
    applicant_profiles (recruiter/profile views) and profiles (the navbar avatar
    surfaced through AuthContext) so the photo shows everywhere.
    """
    ext = AVATAR_TYPES.get((file.content_type or "").lower())
    if not ext:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, or PNG images are allowed.")

    contents = await file.read()

    # Hard size ceiling — fallback if a client bypasses optimization
    if len(contents) > AVATAR_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds the 200KB limit ({round(len(contents) / 1024)}KB). Please upload a smaller photo.",
        )
    # Verify real file signature (defeats renamed/spoofed extensions)
    if not (contents.startswith(_JPEG_MAGIC) or contents.startswith(_PNG_MAGIC)):
        raise HTTPException(status_code=400, detail="File is not a valid JPG or PNG image.")

    db = get_admin_db()
    _ensure_applicant_profile(db, user)

    try:
        filename = f"{user.id}/{uuid.uuid4()}.{ext}"
        # Clean up old avatars for this user
        try:
            old = db.storage.from_("avatars").list(str(user.id))
            if old:
                db.storage.from_("avatars").remove([f"{user.id}/{f['name']}" for f in old])
        except Exception:
            pass

        db.storage.from_("avatars").upload(
            filename, contents,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )
        public_url = db.storage.from_("avatars").get_public_url(filename)

        db.table("applicant_profiles").update({"avatar_url": public_url}).eq("id", str(user.id)).execute()
        # Mirror to profiles so the shared navbar avatar (AuthContext) picks it up
        try:
            db.table("profiles").upsert({"id": str(user.id), "avatar_url": public_url}).execute()
        except Exception:
            pass

        return {"message": "Profile picture updated", "avatar_url": public_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload profile picture: {str(e)}")


# ── Applicant ATS checker ─────────────────────────────────────
# Lets an applicant scan their own resume's ATS readiness. The PDF is stored in
# the `student-resume-pdfs` bucket and a row is saved to `applicant_resumes` so
# the applicant keeps a history they can revisit, replace, or remove.

async def _validated_pdf_bytes(file: UploadFile) -> bytes:
    """Read + validate an uploaded resume PDF (magic bytes + 10MB cap)."""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported.")
    contents = await file.read()
    if not contents[:5].startswith(_PDF_MAGIC):
        raise HTTPException(status_code=400, detail="Invalid PDF — content does not match PDF format.")
    if len(contents) > RESUME_MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum 10MB allowed.")
    return contents


def _clean_name(name) -> Optional[str]:
    """Drop generic placeholder names extracted by the ATS scanner."""
    if name and str(name).strip().lower() not in _GENERIC_NAMES:
        return str(name).strip()
    return None


@router.post("/student/ats-check")
async def applicant_ats_check(file: UploadFile = File(...), user=Depends(require_user)):
    """Scan an applicant's resume, store the PDF + a history row, return the report."""
    contents = await _validated_pdf_bytes(file)
    db = get_admin_db()
    _ensure_applicant_profile(db, user)

    object_path = upload_applicant_resume_pdf(contents, file.filename, str(user.id))
    report = await scan_ats_compliance(extract_text(contents))

    ins = db.table("applicant_resumes").insert({
        "user_id": str(user.id),
        "file_url": object_path,
        "filename": file.filename,
        "candidate_name": _clean_name(report.get("candidate_name")),
        "ats_score": report.get("score", 0),
        "ats_breakdown": report.get("breakdown", []),
    }).execute()
    record = ins.data[0] if ins.data else {}
    return {"id": record.get("id"), "report": report, "record": record}


@router.get("/student/resumes")
def list_applicant_resumes(user=Depends(require_user)):
    """List the applicant's saved ATS checks, newest first."""
    db = get_admin_db()
    res = (db.table("applicant_resumes").select("*")
           .eq("user_id", str(user.id)).order("created_at", desc=True).execute())
    return res.data or []


@router.delete("/student/resumes/{resume_id}")
def delete_applicant_resume(resume_id: str, user=Depends(require_user)):
    """Remove a saved resume — deletes the bucket object and the history row."""
    db = get_admin_db()
    chk = (db.table("applicant_resumes").select("id, file_url")
           .eq("id", resume_id).eq("user_id", str(user.id)).execute())
    if not chk.data:
        raise HTTPException(status_code=404, detail="Resume not found.")
    remove_applicant_resume_pdf(chk.data[0].get("file_url"))
    db.table("applicant_resumes").delete().eq("id", resume_id).execute()
    return {"message": "Resume removed."}


@router.put("/student/resumes/{resume_id}")
async def replace_applicant_resume(resume_id: str, file: UploadFile = File(...), user=Depends(require_user)):
    """Replace a saved resume in place — old file is removed, new one re-scanned."""
    db = get_admin_db()
    chk = (db.table("applicant_resumes").select("id, file_url")
           .eq("id", resume_id).eq("user_id", str(user.id)).execute())
    if not chk.data:
        raise HTTPException(status_code=404, detail="Resume not found.")

    contents = await _validated_pdf_bytes(file)
    remove_applicant_resume_pdf(chk.data[0].get("file_url"))
    object_path = upload_applicant_resume_pdf(contents, file.filename, str(user.id))
    report = await scan_ats_compliance(extract_text(contents))

    upd = {
        "file_url": object_path,
        "filename": file.filename,
        "candidate_name": _clean_name(report.get("candidate_name")),
        "ats_score": report.get("score", 0),
        "ats_breakdown": report.get("breakdown", []),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    res = db.table("applicant_resumes").update(upd).eq("id", resume_id).execute()
    record = res.data[0] if res.data else {}
    return {"id": resume_id, "report": report, "record": record}
