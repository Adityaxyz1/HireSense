-- ============================================================================
-- HireSense — performance indexes (Database Indexing Strategy)
-- Run once in the Supabase SQL editor. Safe & idempotent (IF NOT EXISTS, with
-- table-existence guards). Indexes are transparent: they only speed up reads.
--
-- Built directly from the app's hot query patterns:
--   resumes/jobs/match_results: .eq("user_id").order("created_at")
--   evaluate dedup:             match_results.eq("resume_id").eq("job_id")
--   student feed:               job_descriptions.eq("status",'published')
--   applications:               .eq("applicant_id") / .eq("job_id") / by resume_id
--   /uploads ownership:         resumes.eq("file_url")
--   admin log views:            order by created_at desc
--
-- For very large existing tables you can swap CREATE INDEX for
-- CREATE INDEX CONCURRENTLY (run statements individually, outside a txn).
-- ============================================================================

DO $$
BEGIN
    -- ── resumes ──────────────────────────────────────────────────────────
    IF to_regclass('public.resumes') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_resumes_user_created
            ON resumes (user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_resumes_file_url
            ON resumes (file_url);
    END IF;

    -- ── job_descriptions ─────────────────────────────────────────────────
    IF to_regclass('public.job_descriptions') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_jobs_user_created
            ON job_descriptions (user_id, created_at DESC);
        -- Public student feed only ever reads published jobs → partial index.
        CREATE INDEX IF NOT EXISTS idx_jobs_published_created
            ON job_descriptions (created_at DESC)
            WHERE status = 'published';
    END IF;

    -- ── match_results ────────────────────────────────────────────────────
    IF to_regclass('public.match_results') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_match_user_created
            ON match_results (user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_match_resume_job
            ON match_results (resume_id, job_id);
        CREATE INDEX IF NOT EXISTS idx_match_job
            ON match_results (job_id);
        CREATE INDEX IF NOT EXISTS idx_match_resume
            ON match_results (resume_id);
    END IF;

    -- ── applications ─────────────────────────────────────────────────────
    -- (job_id, applicant_id) is already indexed by the UNIQUE constraint.
    IF to_regclass('public.applications') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_applications_applicant_created
            ON applications (applicant_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_applications_job_created
            ON applications (job_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_applications_resume
            ON applications (resume_id);
    END IF;

    -- ── auth_logs (admin audit views) ────────────────────────────────────
    IF to_regclass('public.auth_logs') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_auth_logs_created
            ON auth_logs (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_auth_logs_user
            ON auth_logs (user_id);
    END IF;

    -- ── admin_audit_logs ─────────────────────────────────────────────────
    IF to_regclass('public.admin_audit_logs') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_admin_audit_created
            ON admin_audit_logs (created_at DESC);
    END IF;
END $$;

-- Refresh planner statistics so the new indexes are used immediately.
ANALYZE;
