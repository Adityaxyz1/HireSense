-- ============================================================
-- Migration: Add user_id to job_descriptions and match_results
-- Purpose: Per-user data isolation — each user only sees their own data
-- ============================================================

-- 1. Add user_id to job_descriptions
ALTER TABLE public.job_descriptions 
  ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'local-user';

-- 2. Add user_id to match_results
ALTER TABLE public.match_results 
  ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'local-user';

-- 3. Backfill: For existing job_descriptions, try to match user_id from
--    match_results -> resumes chain (best effort)
UPDATE public.job_descriptions jd
SET user_id = sub.user_id
FROM (
  SELECT DISTINCT mr.job_id, r.user_id
  FROM public.match_results mr
  JOIN public.resumes r ON mr.resume_id = r.id
  WHERE r.user_id != 'local-user'
) sub
WHERE jd.id = sub.job_id
  AND jd.user_id = 'local-user';

-- 4. Backfill: For existing match_results, copy user_id from resume
UPDATE public.match_results mr
SET user_id = r.user_id
FROM public.resumes r
WHERE mr.resume_id = r.id
  AND mr.user_id = 'local-user'
  AND r.user_id != 'local-user';

-- 5. Create indexes for fast user-scoped queries
CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id 
  ON public.job_descriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_match_results_user_id 
  ON public.match_results (user_id);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id 
  ON public.resumes (user_id);

-- 6. Disable RLS on these tables (we handle auth at the API layer)
ALTER TABLE public.job_descriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results DISABLE ROW LEVEL SECURITY;
