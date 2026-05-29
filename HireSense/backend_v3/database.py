import uuid
from supabase import create_client, Client
from config import settings

_supabase_client = None
_supabase_admin_client = None
_supabase_auth_client = None


def get_auth_db() -> Client:
    """Dedicated client for verifying user JWTs.

    Uses the anon (publishable) key when available so token verification runs
    with least privilege, and is kept separate from the data/admin clients so
    that auth.get_user(token) never taints their sessions.
    """
    global _supabase_auth_client
    if _supabase_auth_client is None:
        if not settings.SUPABASE_URL:
            raise ValueError("SUPABASE_URL must be set in the .env file")
        key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_KEY
        if not key:
            raise ValueError("SUPABASE_ANON_KEY or SUPABASE_KEY must be set in the .env file")
        _supabase_auth_client = create_client(settings.SUPABASE_URL, key)
    return _supabase_auth_client

def get_db() -> Client:
    """Get a Supabase client singleton (used for general DB queries and auth verification)."""
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the .env file")
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client

def get_admin_db() -> Client:
    """Get a dedicated Supabase client for admin operations.
    
    This is separate from get_db() because auth.get_user(token) taints
    the client's auth session, causing admin.list_users() to fail with
    'User not allowed'. This client stays clean with the Service Role Key.
    """
    global _supabase_admin_client
    if _supabase_admin_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the .env file")
        _supabase_admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_admin_client

def init_db():
    """No-op for Supabase. DDL is handled via the Supabase Dashboard SQL Editor."""
    pass

def new_id():
    """Returns a new UUID4 string. Useful for generating IDs if needed."""
    return str(uuid.uuid4())

def row_to_dict(row: dict) -> dict:
    """
    Legacy wrapper. In SQLite this parsed JSON strings, but Supabase 
    REST API returns pure Python dicts with lists/dicts already parsed.
    """
    return row
