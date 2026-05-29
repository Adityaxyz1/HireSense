-- ============================================================================
-- HireSense — security & data-consistency migration
-- Run once in the Supabase SQL editor. Idempotent where possible.
-- ============================================================================

-- 1) Prevent duplicate applications atomically (backs the apply-race fix).
--    De-dupe any existing duplicates first, keeping the earliest row.
DELETE FROM applications a
USING applications b
WHERE a.job_id = b.job_id
  AND a.applicant_id = b.applicant_id
  AND a.created_at > b.created_at;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'applications_job_applicant_unique'
    ) THEN
        ALTER TABLE applications
            ADD CONSTRAINT applications_job_applicant_unique
            UNIQUE (job_id, applicant_id);
    END IF;
END $$;

-- 2) Normalise match_results.final_score to a single 0–100 scale.
--    Legacy rows from /evaluate and /applications were stored as 0.0–1.0.
--    Anything <= 1 is treated as the old fractional scale and scaled up.
UPDATE match_results
SET final_score = ROUND((final_score * 100)::numeric, 2)
WHERE final_score IS NOT NULL
  AND final_score <= 1;

-- 3) (Optional, recommended) Add an admin role flag pathway.
--    require_admin() accepts profiles.role = 'admin' in addition to the
--    ADMIN_EMAILS allowlist. Promote your admin user explicitly, e.g.:
--    UPDATE profiles SET role = 'admin' WHERE id = '<admin-user-uuid>';
