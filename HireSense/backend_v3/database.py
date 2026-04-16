import uuid
from supabase import create_client, Client
from config import settings

_supabase_client = None

def get_db() -> Client:
    """Get a Supabase client singleton."""
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the .env file")
        # Initialize Supabase client
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client

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
