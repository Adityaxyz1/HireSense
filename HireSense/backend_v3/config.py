import os
from pathlib import Path
from dotenv import load_dotenv

# Env files live in backend_v3/env/, split by target:
#   .env.local       — local dev (default)
#   .env.production   — production values (real secrets live in the host's env vars)
# Select with APP_ENV; load_dotenv no-ops if the file is absent (e.g. on Render,
# where APP_ENV=production is set and the platform injects real env vars).
BASE_DIR = Path(__file__).resolve().parent
APP_ENV = os.getenv("APP_ENV", "local")
load_dotenv(BASE_DIR / "env" / f".env.{APP_ENV}")

class Settings:
    PROJECT_NAME: str = "HireSense API v3"
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    UPLOAD_DIR: str = os.path.join(DATA_DIR, "uploads")
    
    # Supabase config
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    # Anon (publishable) key — used ONLY to verify user JWTs with least privilege.
    # Required: the auth client refuses to fall back to the service-role key.
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    
    # NVIDIA NIM API keys — add multiple for racing strategy
    NVIDIA_NIM_API_KEY_DEEPSEEK: str = os.getenv("NVIDIA_NIM_API_KEY_DEEPSEEK", "")
    NVIDIA_NIM_API_KEY_META: str = os.getenv("NVIDIA_NIM_API_KEY_META", "")
    NVIDIA_NIM_API_KEY_GEMMA: str = os.getenv("NVIDIA_NIM_API_KEY_GEMMA", "")
    
    # MagicalAPI (optional, must be set in .env)
    MAGICAL_API_KEY: str = os.getenv("MAGICAL_API_KEY", "")

    # GitHub enrichment — optional token raises the public API rate limit
    # (60 -> 5000 req/hr). Profile reads work without it.
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

    # Eagerly load the embedding model at startup. Default OFF: on tiny/free
    # instances (e.g. 512MB Render) loading torch at boot strains memory/CPU and
    # slows ALL requests (and can OOM the boot). With it off, the model lazy-loads
    # on first actual use; job creation is still instant because the embedding is
    # computed in a background task. Set WARM_EMBEDDING_MODEL=true to pre-warm
    # (handy on a roomy local dev box).
    WARM_EMBEDDING_MODEL: bool = os.getenv("WARM_EMBEDDING_MODEL", "false").lower() in ("1", "true", "yes")

    # Admin Panel
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

    # Interactive API docs — OFF by default (safe for production). Set
    # ENABLE_DOCS=true in local dev to expose /docs and /openapi.json.
    ENABLE_DOCS: bool = os.getenv("ENABLE_DOCS", "false").lower() in ("1", "true", "yes")

    # Rate limit: max requests per IP per window (generous to avoid breaking
    # normal multi-request page loads while still stopping abusive loops).
    RATE_LIMIT_MAX: int = int(os.getenv("RATE_LIMIT_MAX", "600"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))

    # Redis — shared broker for rate limiting (multi-worker) and Celery tasks.
    # Defaults to local Redis; set REDIS_URL in .env for production.
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Celery broker + result backend. Both default to Redis.
    # Use separate DB index (1) for results so they don't mix with rate-limit keys.
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://localhost:6379/1"))

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
