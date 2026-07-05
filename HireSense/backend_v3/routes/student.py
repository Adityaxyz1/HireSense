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
from typing import List, Optional

from fastapi import (APIRouter, BackgroundTasks, Depends, File, HTTPException,
                     UploadFile)
from pydantic import BaseModel

from database import get_admin_db
from routes._http_errors import internal_error
from routes.auth_dependency import require_user
from services.core.github_service import fetch_github_profile
from services.core.pdf_parser import extract_text
from services.core.storage_service import (remove_applicant_resume_pdf,
                                           upload_applicant_resume_pdf)
from services.pipeline.ats_scanner import scan_ats_compliance

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
    github_url: Optional[str] = None  # optional


async def _sync_github_background(user_id: str, github_url: str):
    """Background: pull the applicant's public GitHub profile and cache it."""
    data = await fetch_github_profile(github_url)
    try:
        get_admin_db().table("applicant_profiles").update({
            "github_data": data,
            "github_synced_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", user_id).execute()
    except Exception as e:
        print(f"[github] cache write failed for {user_id}: {e}")


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
def update_applicant_profile(payload: ApplicantProfileUpdate, background_tasks: BackgroundTasks,
                             user=Depends(require_user)):
    """Update the applicant's editable profile fields. When a GitHub URL is set
    or changed, kick a background fetch of their public GitHub profile."""
    db = get_admin_db()
    existing = _ensure_applicant_profile(db, user)

    updates = {}
    if payload.full_name is not None:
        updates["full_name"] = payload.full_name.strip()
    if payload.major is not None:
        updates["major"] = payload.major.strip()
    if payload.graduation_year is not None:
        updates["graduation_year"] = payload.graduation_year.strip()
    if payload.skills_json is not None:
        updates["skills_json"] = payload.skills_json

    github_action = None  # None | "fetch" | "clear"
    if payload.github_url is not None:
        gh = payload.github_url.strip()
        updates["github_url"] = gh or None
        if not gh:
            github_action = "clear"
        else:
            # Only re-hit the GitHub API when the URL actually changed or we have
            # no cached data yet — avoids a redundant fetch on every profile save.
            prev = (existing.get("github_url") or "").strip()
            github_action = "fetch" if (gh != prev or not existing.get("github_data")) else None

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    res = db.table("applicant_profiles").update(updates).eq("id", str(user.id)).execute()

    # Mirror the name to profiles.display_name so the navbar/avatar (surfaced via
    # AuthContext) updates instead of staying on the email-derived fallback.
    if updates.get("full_name"):
        try:
            db.table("profiles").upsert(
                {"id": str(user.id), "display_name": updates["full_name"]}
            ).execute()
        except Exception:
            pass

    # GitHub enrichment (optional): fetch in the background, or clear if removed.
    if github_action == "fetch":
        background_tasks.add_task(_sync_github_background, str(user.id), updates["github_url"])
    elif github_action == "clear":
        try:
            db.table("applicant_profiles").update(
                {"github_data": None, "github_synced_at": None}
            ).eq("id", str(user.id)).execute()
        except Exception:
            pass

    return {"message": "Profile updated", "profile": res.data[0] if res.data else updates}


@router.post("/student/profile/github-sync")
async def sync_applicant_github(user=Depends(require_user)):
    """Manually (re)fetch the applicant's GitHub profile from their saved URL."""
    db = get_admin_db()
    profile = _ensure_applicant_profile(db, user)
    github_url = (profile.get("github_url") or "").strip()
    if not github_url:
        raise HTTPException(status_code=400, detail="Add a GitHub URL to your profile first.")
    data = await fetch_github_profile(github_url)
    if data is None:
        raise HTTPException(status_code=422, detail="Couldn't read that GitHub profile. Make sure the URL points to a public profile.")
    db.table("applicant_profiles").update({
        "github_data": data,
        "github_synced_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(user.id)).execute()
    return {"github_data": data}


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
        raise internal_error("Failed to upload profile picture", e)


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


async def _scan_applicant_resume_background(resume_id: str, raw_text: str):
    """Background: run the (potentially slow) ATS scan and write the result to the
    applicant_resumes row. Keeping the scan out of the request means the upload
    responds instantly — so mobile connections don't drop on a slow/cold backend.
    A row is 'processing' while ats_breakdown is null; this fills it in."""
    db = get_admin_db()
    try:
        report = await scan_ats_compliance(raw_text)
        db.table("applicant_resumes").update({
            "ats_score": report.get("score", 0),
            "ats_breakdown": report.get("breakdown", []),
            "candidate_name": _clean_name(report.get("candidate_name")),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", resume_id).execute()
    except Exception as e:
        print(f"[applicant-ats] background scan failed for {resume_id}: {e}")
        try:
            db.table("applicant_resumes").update({
                "ats_score": 0,
                "ats_breakdown": [{"type": "critical", "message": "Analysis failed. Please try again."}],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", resume_id).execute()
        except Exception:
            pass


@router.post("/student/ats-check")
async def applicant_ats_check(background_tasks: BackgroundTasks, file: UploadFile = File(...),
                              user=Depends(require_user)):
    """Store the resume and START the ATS scan in the background, returning immediately.
    The frontend polls the saved record for the result. This keeps the request fast so
    it never times out / drops on mobile or a cold free-tier backend."""
    contents = await _validated_pdf_bytes(file)
    raw_text = extract_text(contents)
    if not raw_text or not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Couldn't read any text from this PDF. If it's a scanned/image resume, please upload a text-based PDF.",
        )

    db = get_admin_db()
    _ensure_applicant_profile(db, user)

    # Best-effort bucket store — never block on storage.
    object_path = upload_applicant_resume_pdf(contents, file.filename, str(user.id))

    # Insert a 'processing' row (ats_breakdown left null) and scan in the background.
    record = {}
    try:
        ins = db.table("applicant_resumes").insert({
            "user_id": str(user.id),
            "file_url": object_path,
            "filename": file.filename,
        }).execute()
        record = ins.data[0] if ins.data else {}
    except Exception as e:
        print(f"[applicant-ats] history insert failed: {e}")
        raise HTTPException(status_code=500, detail="Couldn't save your resume. Please try again.")

    rid = record.get("id")
    if rid:
        background_tasks.add_task(_scan_applicant_resume_background, rid, raw_text)
    return {"id": rid, "status": "processing", "record": record}


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
async def replace_applicant_resume(resume_id: str, background_tasks: BackgroundTasks,
                                   file: UploadFile = File(...), user=Depends(require_user)):
    """Replace a saved resume in place — old file removed, new one re-scanned in the
    background (row returns to 'processing' until the new scan completes)."""
    db = get_admin_db()
    chk = (db.table("applicant_resumes").select("id, file_url")
           .eq("id", resume_id).eq("user_id", str(user.id)).execute())
    if not chk.data:
        raise HTTPException(status_code=404, detail="Resume not found.")

    contents = await _validated_pdf_bytes(file)
    raw_text = extract_text(contents)
    if not raw_text or not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Couldn't read any text from this PDF. If it's a scanned/image resume, please upload a text-based PDF.",
        )

    remove_applicant_resume_pdf(chk.data[0].get("file_url"))
    object_path = upload_applicant_resume_pdf(contents, file.filename, str(user.id))

    # Reset to 'processing' (clear old scan) and re-scan in the background.
    db.table("applicant_resumes").update({
        "file_url": object_path,
        "filename": file.filename,
        "ats_score": None,
        "ats_breakdown": None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", resume_id).execute()

    background_tasks.add_task(_scan_applicant_resume_background, resume_id, raw_text)
    return {"id": resume_id, "status": "processing"}
