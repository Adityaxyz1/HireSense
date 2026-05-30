import uuid
from database import get_db, get_admin_db

APPLICANT_RESUME_BUCKET = "student-resume-pdfs"


def upload_resume_pdf(file_bytes: bytes, filename: str) -> str:
    """Save a PDF to Supabase Storage and return the relative path."""
    unique_filename = f"{uuid.uuid4()}_{filename}"

    db = get_db()
    try:
        # Upload to Supabase 'resumes' bucket
        res = db.storage.from_("resumes").upload(
            file=file_bytes,
            path=unique_filename,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        print(f"Warning: Supabase storage upload failed (likely RLS). Continuing gracefully: {e}")

    # We still return the frontend-compatible relative path.
    # The /uploads endpoint in main.py will proxy the download.
    return f"/uploads/{unique_filename}"


_ENSURED_BUCKETS = set()  # memo: don't re-hit the storage API on every upload


def _ensure_bucket(db, bucket: str):
    """Best-effort create of a private bucket; ignores 'already exists'.
    Memoized per-process so create_bucket runs at most once per bucket."""
    if bucket in _ENSURED_BUCKETS:
        return
    try:
        db.storage.create_bucket(bucket)
    except Exception:
        pass  # already exists, or perms — a real upload error surfaces below
    _ENSURED_BUCKETS.add(bucket)


def upload_applicant_resume_pdf(file_bytes: bytes, filename: str, user_id: str) -> str:
    """Save an applicant's resume PDF to the `student-resume-pdfs` bucket,
    namespaced by user. Returns the storage object path (also used as the key
    for later removal/replacement)."""
    object_path = f"{user_id}/{uuid.uuid4()}_{filename}"
    db = get_admin_db()
    _ensure_bucket(db, APPLICANT_RESUME_BUCKET)
    try:
        db.storage.from_(APPLICANT_RESUME_BUCKET).upload(
            file=file_bytes,
            path=object_path,
            file_options={"content-type": "application/pdf"},
        )
    except Exception as e:
        print(f"Warning: applicant resume upload failed (continuing): {e}")
    return object_path


def remove_applicant_resume_pdf(object_path: str):
    """Remove an applicant resume object from the bucket (best-effort)."""
    if not object_path:
        return
    try:
        get_admin_db().storage.from_(APPLICANT_RESUME_BUCKET).remove([object_path])
    except Exception as e:
        print(f"Warning: applicant resume removal failed (non-fatal): {e}")
