import uuid
from supabase import create_client, Client
from config import settings

_supabase_client = None
_supabase_admin_client = None

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
