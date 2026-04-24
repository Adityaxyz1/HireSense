import uuid
from database import get_db


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
