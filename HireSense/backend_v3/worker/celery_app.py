"""
Celery application instance.

Import this module to get the configured Celery app.
Tasks are declared in worker/tasks.py and auto-discovered via `include`.

Start the worker (from backend_v3/):
    celery -A worker.celery_app worker --loglevel=info

For the heavy embedding + screening work, run a dedicated queue:
    celery -A worker.celery_app worker -Q embed,screen --concurrency=2 --loglevel=info

Monitor with Flower (optional):
    pip install flower
    celery -A worker.celery_app flower
"""
from celery import Celery
from config import settings

celery_app = Celery(
    "hiresense",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["worker.tasks"],
)

celery_app.conf.update(
    # Serialisation
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Reliability: acknowledge the task only after it finishes (not on pickup).
    # Combined with max_retries on each task, this prevents silent data loss if
    # a worker dies mid-embedding.
    task_acks_late=True,

    # One task at a time per worker process. Embedding and LLM calls are already
    # concurrent (asyncio inside the task); stacking more tasks on top just
    # causes memory pressure from multiple torch instances.
    worker_prefetch_multiplier=1,

    # Route heavy tasks to dedicated queues so a slow re-match run can't starve
    # fast embed jobs. Run separate worker processes per queue in production.
    task_routes={
        "hiresense.embed_resume":    {"queue": "embed"},
        "hiresense.embed_job":       {"queue": "embed"},
        "hiresense.screen_applicant": {"queue": "screen"},
        "hiresense.run_job_match":   {"queue": "screen"},
    },

    # Keep results for 1 hour — enough for status polling; avoids Redis bloat.
    result_expires=3600,

    # Surface task start in the backend (useful for Flower monitoring).
    task_track_started=True,
)
