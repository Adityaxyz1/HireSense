import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from config import settings
from database import init_db
from routes import api_router


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
import time
from collections import defaultdict

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


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered ATS backend for HireSense.",
    version="3.0.0",
    # Security: hide docs in production (set via env if needed)
    docs_url="/docs",
    redoc_url=None,
)

# ── Middleware stack (order matters: outermost runs first) ─────

# Security: Rate limiting (Disabled for local dev / relaxed)
# app.add_middleware(RateLimitMiddleware, max_requests=6000, window_seconds=60)

# Security: Request size limit
app.add_middleware(RequestSizeLimitMiddleware)

# Security: Response headers
app.add_middleware(SecurityHeadersMiddleware)

# Security: Strict CORS — local development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Secure file proxy ────────────────────────────────────────
from database import get_db
from fastapi import HTTPException

# Regex: only allow safe filenames (UUID + alphanumeric + dash/underscore/dot)
SAFE_FILENAME_RE = re.compile(r'^[a-zA-Z0-9_\-\.]+$')

@app.get("/uploads/{filename}")
def get_upload(filename: str):
    """Proxy private Supabase Storage files to the frontend."""
    # Security: path traversal prevention
    if not SAFE_FILENAME_RE.match(filename) or '..' in filename or '/' in filename or '\\' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    
    db = get_db()
    try:
        res = db.storage.from_("resumes").download(filename)
        return Response(content=res, media_type="application/pdf")
    except Exception:
        raise HTTPException(status_code=404, detail="File not found.")


app.include_router(api_router, prefix="/api")


@app.on_event("startup")
def startup():
    """Initialize connections on server start."""
    print(f"Backend started: {settings.PROJECT_NAME}")
    # Security: warn if critical keys are missing
    if not settings.NVIDIA_NIM_API_KEY:
        print("WARNING: NVIDIA_NIM_API_KEY not set in .env — AI features will fail.")
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        print("WARNING: Supabase credentials not set in .env — database features will fail.")


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}
