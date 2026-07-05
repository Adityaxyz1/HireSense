"""
Celery task definitions for HireSense.

Each task wraps an existing async background function using asyncio.run(),
which creates a fresh event loop in the Celery worker process. This lets us
reuse all the existing service code without rewriting it.

Task map:
    embed_resume_task    — ATS scan + dense embedding for uploaded recruiter resumes
    embed_job_task       — dense embedding for a job description
    screen_applicant_task — full applicant screening pipeline (ATS + embed + score)
    run_job_match_task   — re-score all applicants for one job (recruiter-triggered)
"""
import asyncio

from worker.celery_app import celery_app


@celery_app.task(
    name="hiresense.embed_resume",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
)
def embed_resume_task(self, resume_id: str, raw_text: str):
    """Generate ATS report + embedding for a recruiter-uploaded resume.

    Reuses process_resume_background from routes/resume.py — imports lazily
    to avoid circular imports at module load time.
    """
    async def _run():
        from routes.resume import process_resume_background
        await process_resume_background(resume_id, raw_text)

    try:
        asyncio.run(_run())
    except Exception as exc:
        print(f"[embed_resume] failed for {resume_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="hiresense.embed_job",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
)
def embed_job_task(self, job_id: str, text: str):
    """Compute and store the dense embedding for a job description.

    Sync-safe: generate_embedding is a regular blocking function (no asyncio
    needed here), so we call it directly without asyncio.run().
    """
    try:
        from database import get_db
        from services.core.embedding_engine import generate_embedding

        vector = generate_embedding(text)
        get_db().table("job_descriptions").update({"embedding": vector}).eq("id", job_id).execute()
    except Exception as exc:
        print(f"[embed_job] failed for {job_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="hiresense.screen_applicant",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def screen_applicant_task(self, app_id: str, resume_id: str, job_id: str,
                          recruiter_id: str, raw_text: str):
    """Full screening pipeline for one applicant application.

    Runs ATS scan → embedding → skill/exp/strength scoring → match persistence.
    Each DB write fires a Supabase Realtime broadcast so the recruiter dashboard
    updates live without any extra polling.
    """
    async def _run():
        from routes.applications import process_applicant_application
        await process_applicant_application(app_id, resume_id, job_id, recruiter_id, raw_text)

    try:
        asyncio.run(_run())
    except Exception as exc:
        print(f"[screen_applicant] failed for app={app_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="hiresense.run_job_match",
    bind=True,
    max_retries=1,
    default_retry_delay=30,
)
def run_job_match_task(self, job_id: str, recruiter_id: str):
    """Re-score ALL applicants for one job — recruiter-triggered re-match.

    Iterates every application for the job and calls rescore_application,
    which upserts each applicant's match_result while preserving the
    recruiter's existing triage status (candidate_status).
    """
    async def _run():
        from database import get_admin_db
        from routes.applications import rescore_application

        db = get_admin_db()
        apps = (
            db.table("applications")
            .select("id, resume_id, resumes(raw_text)")
            .eq("job_id", job_id)
            .execute()
        ).data or []

        for app in apps:
            resume = app.get("resumes") or {}
            raw_text = (resume.get("raw_text") or "").strip()
            if not raw_text:
                continue
            try:
                await rescore_application(
                    app["id"], app["resume_id"], job_id, recruiter_id, raw_text
                )
            except Exception as e:
                print(f"[run_job_match] re-match error for application {app.get('id')}: {e}")

    try:
        asyncio.run(_run())
    except Exception as exc:
        print(f"[run_job_match] failed for job={job_id}: {exc}")
        raise self.retry(exc=exc)
