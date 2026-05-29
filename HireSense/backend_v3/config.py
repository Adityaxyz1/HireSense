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
    # Anon (publishable) key — used ONLY to verify user JWTs with least privilege.
    # Falls back to the service key if unset (logs a warning at startup).
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    
    # NVIDIA NIM API keys — add multiple for racing strategy
    NVIDIA_NIM_API_KEY_DEEPSEEK: str = os.getenv("NVIDIA_NIM_API_KEY_DEEPSEEK", "")
    NVIDIA_NIM_API_KEY_META: str = os.getenv("NVIDIA_NIM_API_KEY_META", "")
    NVIDIA_NIM_API_KEY_GEMMA: str = os.getenv("NVIDIA_NIM_API_KEY_GEMMA", "")
    
    # MagicalAPI (optional, must be set in .env)
    MAGICAL_API_KEY: str = os.getenv("MAGICAL_API_KEY", "")

    # Admin Panel
    ADMIN_MASTER_KEY: str = os.getenv("ADMIN_MASTER_KEY", "")
    # Admin allowlist — comma-separated emails. Defaults to the legacy admin so
    # existing deployments keep working; override via ADMIN_EMAILS in .env.
    ADMIN_EMAILS: list = [
        e.strip().lower()
        for e in os.getenv("ADMIN_EMAILS", "aditya.poddar3698@gmail.com").split(",")
        if e.strip()
    ]

    # CORS allowed origins — comma-separated. Override in production via env.
    CORS_ORIGINS: list = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,https://hiresense.pages.dev",
        ).split(",")
        if o.strip()
    ]

    # Interactive API docs — disable in production by setting ENABLE_DOCS=false
    ENABLE_DOCS: bool = os.getenv("ENABLE_DOCS", "true").lower() in ("1", "true", "yes")

    # Rate limit: max requests per IP per window (generous to avoid breaking
    # normal multi-request page loads while still stopping abusive loops).
    RATE_LIMIT_MAX: int = int(os.getenv("RATE_LIMIT_MAX", "600"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
