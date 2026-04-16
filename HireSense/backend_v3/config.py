import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "HireSense API v3"
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    UPLOAD_DIR: str = os.path.join(DATA_DIR, "uploads")
    
    # Supabase config
    SUPABASE_URL: str = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")
    
    # NVIDIA NIM API (must be set in .env)
    NVIDIA_NIM_API_KEY: str = os.getenv("NVIDIA_NIM_API_KEY", "")
    
    # MagicalAPI (optional, must be set in .env)
    MAGICAL_API_KEY: str = os.getenv("MAGICAL_API_KEY", "")

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
