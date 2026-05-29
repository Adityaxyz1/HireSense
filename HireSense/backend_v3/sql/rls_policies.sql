-- ============================================================================
-- HireSense — Row-Level Security (defense-in-depth)
-- Run once in the Supabase SQL editor. Idempotent.
--
-- WHY: the backend uses the SERVICE ROLE key, which BYPASSES RLS — so these
-- policies do NOT affect any backend query. They protect the ONE place the app
-- touches the DB with the anon/authenticated key: the frontend's Supabase
-- Realtime subscriptions (recruiter "Applicants" + student "My Applications"),
-- which currently stream raw row data to any logged-in client. RLS scopes those
-- events to rows the user is actually allowed to see.
--
-- DESIGN:
--   * SELECT policies only (reads). All writes go through the service-role
--     backend, so the authenticated role gets NO insert/update/delete policy
--     (default-deny) — a logged-in client cannot mutate tables directly.
--   * Cross-ownership checks (recruiter sees applicants' resumes/applications)
--     use SECURITY DEFINER helpers to avoid RLS recursion between tables.
--   * ID columns are stored as TEXT (the backend writes str(user.id)), while
--     auth.uid() returns UUID — so every comparison casts BOTH sides to ::text
--     to stay correct regardless of each column's declared type.
--
-- AFTER APPLYING: smoke-test the live dashboards (recruiter Applicants + student
-- My Applications) — status should still flip in real time. Rollback is at the
-- bottom if anything misbehaves.
-- ============================================================================

-- ── Helper functions (bypass RLS internally to avoid recursion) ─────────────
CREATE OR REPLACE FUNCTION public.hs_owns_job(job text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM job_descriptions j
        WHERE j.id::text = job AND j.user_id::text = auth.uid()::text
    );
$$;

CREATE OR REPLACE FUNCTION public.hs_recruiter_sees_resume(rid text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM applications a
        JOIN job_descriptions j ON j.id::text = a.job_id::text
        WHERE a.resume_id::text = rid AND j.user_id::text = auth.uid()::text
    );
$$;

CREATE OR REPLACE FUNCTION public.hs_student_owns_resume(rid text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM resumes r
        WHERE r.id::text = rid AND r.user_id::text = auth.uid()::text
    );
$$;

GRANT EXECUTE ON FUNCTION public.hs_owns_job(text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.hs_recruiter_sees_resume(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hs_student_owns_resume(text)   TO authenticated;

-- ── profiles ────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hs_profiles_select ON profiles;
CREATE POLICY hs_profiles_select ON profiles
    FOR SELECT TO authenticated
    USING (id::text = auth.uid()::text);

-- ── applicant_profiles ───────────────────────────────────────────────────────
ALTER TABLE applicant_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hs_applicant_profiles_select ON applicant_profiles;
CREATE POLICY hs_applicant_profiles_select ON applicant_profiles
    FOR SELECT TO authenticated
    USING (id::text = auth.uid()::text);

-- ── resumes ──────────────────────────────────────────────────────────────────
-- Owner (student or recruiter) + the recruiter whose job it applied to
-- (needed for the recruiter Applicants realtime "resumes UPDATE" stream).
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hs_resumes_select ON resumes;
CREATE POLICY hs_resumes_select ON resumes
    FOR SELECT TO authenticated
    USING (user_id::text = auth.uid()::text OR public.hs_recruiter_sees_resume(id::text));

-- ── job_descriptions ─────────────────────────────────────────────────────────
-- Owner reads their jobs; published jobs are readable (public board).
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hs_jobs_select ON job_descriptions;
CREATE POLICY hs_jobs_select ON job_descriptions
    FOR SELECT TO authenticated
    USING (user_id::text = auth.uid()::text OR status = 'published');

-- ── match_results ────────────────────────────────────────────────────────────
-- Recruiter owner + the student who owns the scored resume (so the student's
-- "My Applications" realtime match_results INSERT is delivered at insert time).
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hs_match_results_select ON match_results;
CREATE POLICY hs_match_results_select ON match_results
    FOR SELECT TO authenticated
    USING (user_id::text = auth.uid()::text OR public.hs_student_owns_resume(resume_id::text));

-- ── applications ─────────────────────────────────────────────────────────────
-- Student owner + the recruiter who owns the target job.
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hs_applications_select ON applications;
CREATE POLICY hs_applications_select ON applications
    FOR SELECT TO authenticated
    USING (applicant_id::text = auth.uid()::text OR public.hs_owns_job(job_id::text));

-- ── auth_logs / admin_audit_logs ─────────────────────────────────────────────
-- Admin-only, read exclusively via the service-role backend. Enable RLS with NO
-- authenticated policy → default-deny for clients (service role still bypasses).
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF to_regclass('public.admin_audit_logs') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK (run if realtime/live updates regress):
--   ALTER TABLE profiles            DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE applicant_profiles  DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE resumes             DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE job_descriptions    DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE match_results       DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE applications        DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE auth_logs           DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE admin_audit_logs    DISABLE ROW LEVEL SECURITY;
-- ============================================================================
