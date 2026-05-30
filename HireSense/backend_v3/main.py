import re
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from config import settings
from database import get_db
from routes import api_router
from routes.auth_dependency import require_user


# ── Security: Request size limiter middleware ──────────────────
class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests larger than MAX_BODY_SIZE bytes (default 10MB)."""
    MAX_BODY_SIZE = 10 * 1024 * 1024  # 10 MB

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_BODY_SIZE:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large. Maximum 10MB allowed."}
            )
        return await call_next(request)


# ── Security: Response security headers middleware ────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store"
        return response


# ── Security: Simple in-memory rate limiter ───────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple sliding-window rate limiter: max 60 requests per minute per IP."""
    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean old entries
        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if now - t < self.window_seconds
        ]
        
        if len(self.requests[client_ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."}
            )
        
        self.requests[client_ip].append(now)
        return await call_next(request)


# ── Lifespan (replaces deprecated @app.on_event) ─────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize connections on server start."""
    print(f"Backend started: {settings.PROJECT_NAME}")
    # Warm the embedding model off the event loop so the first job/resume
    # upload doesn't pay the torch + SentenceTransformer cold-start. Boot
    # stays fast — we don't await this. Skippable on memory-constrained hosts
    # (WARM_EMBEDDING_MODEL=false) where it would otherwise slow all requests.
    if settings.WARM_EMBEDDING_MODEL:
        import asyncio
        from services.embedding_engine import warm_model
        asyncio.create_task(asyncio.to_thread(warm_model))
    else:
        print("Embedding model warmup disabled (WARM_EMBEDDING_MODEL=false) — lazy-loading on first use.")
    # Security: warn if critical keys are missing
    if not (settings.NVIDIA_NIM_API_KEY_DEEPSEEK or settings.NVIDIA_NIM_API_KEY_META or settings.NVIDIA_NIM_API_KEY_GEMMA):
        print("WARNING: No NVIDIA_NIM_API_KEY set in .env — AI features will fail.")
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        print("WARNING: Supabase credentials not set in .env — database features will fail.")
    if not settings.SUPABASE_ANON_KEY:
        print("WARNING: SUPABASE_ANON_KEY not set — JWT verification falls back to the "
              "service-role key. Set SUPABASE_ANON_KEY in .env for least-privilege auth.")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered ATS backend for HireSense.",
    version="3.0.0",
    lifespan=lifespan,
    # Security: docs can be disabled in production via ENABLE_DOCS=false
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
)

# ── Middleware stack (order matters: outermost runs first) ─────

# Security: Rate limiting — generous per-IP cap to stop abusive loops/DoS
# without breaking normal multi-request page loads. NOTE: this is in-memory,
# so it only protects a single worker; use a shared store (Redis) or a
# reverse-proxy limit when running multiple workers.
app.add_middleware(
    RateLimitMiddleware,
    max_requests=settings.RATE_LIMIT_MAX,
    window_seconds=settings.RATE_LIMIT_WINDOW,
)

# Security: Request size limit
app.add_middleware(RequestSizeLimitMiddleware)

# Security: Response headers
app.add_middleware(SecurityHeadersMiddleware)

# Security: Strict CORS — origins from config (override via CORS_ORIGINS env)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Secure file proxy ────────────────────────────────────────

# Regex: only allow safe filenames (UUID + alphanumeric + dash/underscore/dot)
SAFE_FILENAME_RE = re.compile(r'^[a-zA-Z0-9_\-\.]+$')

@app.get("/uploads/{filename}")
def get_upload(filename: str, user=Depends(require_user)):
    """Proxy private resume PDFs — requires auth AND ownership.

    Access is granted only if the caller owns the resume, or is the recruiter
    who received it via an application to one of their own jobs.
    """
    # Security: path traversal prevention
    if not SAFE_FILENAME_RE.match(filename) or '..' in filename or '/' in filename or '\\' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    db = get_db()
    file_url = f"/uploads/{filename}"
    uid = str(user.id)

    # Resolve which resume row this file belongs to.
    allowed = False
    try:
        rows = (db.table("resumes").select("id, user_id")
                .eq("file_url", file_url).execute().data) or []
        if any(str(r.get("user_id")) == uid for r in rows):
            allowed = True
        elif rows:
            # Recruiter access: the resume applied to a job this user owns.
            resume_ids = [r["id"] for r in rows]
            apps = (db.table("applications")
                    .select("resume_id, job_descriptions(user_id)")
                    .in_("resume_id", resume_ids).execute().data) or []
            for a in apps:
                jd = a.get("job_descriptions") or {}
                if str(jd.get("user_id")) == uid:
                    allowed = True
                    break
    except Exception:
        allowed = False

    if not allowed:
        # Don't reveal whether the file exists.
        raise HTTPException(status_code=404, detail="File not found.")

    try:
        res = db.storage.from_("resumes").download(filename)
        return Response(content=res, media_type="application/pdf")
    except Exception:
        raise HTTPException(status_code=404, detail="File not found.")


app.include_router(api_router, prefix="/api")




@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}


@app.get("/health")
async def health_check():
    """Health check for deployment monitoring (Render, etc.) — probes the DB."""
    db_ok = False
    try:
        get_db().table("profiles").select("id").limit(1).execute()
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": "3.0.0",
        "database": "up" if db_ok else "down",
    }
