-- =========================================================================
-- RENAME: student  ->  applicant   (database objects)
-- =========================================================================
-- Renames the table, the FK column, the index, the stored role value, and the
-- RLS policies so the database speaks "applicant" instead of "student".
--
-- Safe + idempotent: guarded so re-running (or running on an already-renamed
-- DB) is a no-op. Run in the Supabase SQL Editor. Wrapped in a transaction.
--
-- ⚠️ Deploy the matching backend/frontend code at the same time — the app now
-- reads applicant_profiles / applications.applicant_id and the role 'applicant'.
-- =========================================================================

BEGIN;

-- 1. Table:  student_profiles -> applicant_profiles ------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'student_profiles')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                       WHERE table_schema = 'public' AND table_name = 'applicant_profiles') THEN
        ALTER TABLE public.student_profiles RENAME TO applicant_profiles;
    END IF;
END $$;

-- 2. Column:  applications.student_id -> applicant_id ----------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'student_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'applicant_id') THEN
        ALTER TABLE public.applications RENAME COLUMN student_id TO applicant_id;
    END IF;
END $$;

-- 3. Index:  idx_applications_student_id -> idx_applications_applicant_id ---
ALTER INDEX IF EXISTS idx_applications_student_id RENAME TO idx_applications_applicant_id;

-- 4. Stored role value:  'student' -> 'applicant' -------------------------
UPDATE public.profiles SET role = 'applicant' WHERE role = 'student';

-- 5. RLS policies — drop the student-named ones, recreate as applicant -----
--    (Column/table references inside policies follow the rename automatically;
--     we recreate purely so the policy NAMES read "applicant" too.)

-- applicant_profiles
ALTER TABLE public.applicant_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student manages own profile"        ON public.applicant_profiles;
DROP POLICY IF EXISTS "applicant manages own profile"      ON public.applicant_profiles;
DROP POLICY IF EXISTS "recruiter views applicant profiles" ON public.applicant_profiles;

CREATE POLICY "applicant manages own profile"
    ON public.applicant_profiles FOR ALL
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "recruiter views applicant profiles"
    ON public.applicant_profiles FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.applications a
        JOIN public.job_descriptions j ON j.id = a.job_id
        WHERE a.applicant_id = applicant_profiles.id AND j.user_id = auth.uid()::text
    ));

-- applications
DROP POLICY IF EXISTS "student views own applications"   ON public.applications;
DROP POLICY IF EXISTS "student creates applications"     ON public.applications;
DROP POLICY IF EXISTS "applicant views own applications" ON public.applications;
DROP POLICY IF EXISTS "applicant creates applications"   ON public.applications;

CREATE POLICY "applicant views own applications"
    ON public.applications FOR SELECT USING (applicant_id = auth.uid());

CREATE POLICY "applicant creates applications"
    ON public.applications FOR INSERT WITH CHECK (applicant_id = auth.uid());

-- (recruiter policies on applications/resumes/match_results reference job
--  ownership only, so they are unaffected by the rename and left as-is.)

COMMIT;

-- =========================================================================
-- END — student renamed to applicant across the database.
-- =========================================================================
