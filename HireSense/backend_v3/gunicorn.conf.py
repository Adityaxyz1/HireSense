"""
Gunicorn configuration for horizontal scaling.

Start with:
    gunicorn -c gunicorn.conf.py main:app

Or override workers at runtime:
    WEB_CONCURRENCY=4 gunicorn -c gunicorn.conf.py main:app

Memory note: each worker lazy-loads the embedding model (~500MB torch) on first
use. Keep WEB_CONCURRENCY at 2-4 on small VMs (<=4GB RAM). On larger hosts the
formula (2 * CPU + 1) is appropriate. Embedding-heavy work runs in Celery
workers (separate processes), so web workers stay lean after the rate limiter
and DB calls.
"""
import multiprocessing
import os

# ── Binding ────────────────────────────────────────────────────
bind = os.getenv("BIND", "0.0.0.0:8000")

# ── Workers ────────────────────────────────────────────────────
# WEB_CONCURRENCY env var is the standard override (Render, Heroku, etc.)
# Default: 2*CPU+1, capped at 8 to avoid memory exhaustion on small hosts.
_default_workers = min(multiprocessing.cpu_count() * 2 + 1, 8)
workers = int(os.getenv("WEB_CONCURRENCY", _default_workers))

# UvicornWorker wraps uvicorn's async event loop inside gunicorn's
# process management — gives you multiple processes each running uvicorn.
worker_class = "uvicorn.workers.UvicornWorker"

# ── Timeouts ───────────────────────────────────────────────────
# 120s: generous for the inline /match and /evaluate endpoints that race
# 1-3 LLM models. Background tasks (embed, screen) now run in Celery,
# so web request durations should be well under this.
timeout = 120
keepalive = 5

# ── Worker recycling ───────────────────────────────────────────
# Recycle workers after N requests to prevent slow memory leaks from torch.
max_requests = 1000
max_requests_jitter = 100   # Spread restarts to avoid thundering-herd

# ── Preload ────────────────────────────────────────────────────
# OFF: forking after torch/aioredis init causes shared-memory and fd issues.
preload_app = False

# ── Logging ────────────────────────────────────────────────────
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
