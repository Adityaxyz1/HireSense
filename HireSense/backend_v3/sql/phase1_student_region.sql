-- =========================================================================
-- PHASE 1 MIGRATION: Student Region — Schema, Realtime & Row Level Security
-- =========================================================================
-- Run this in your Supabase SQL Editor (or psql) AFTER the existing
-- db_schema_v3.sql and setup_student_recruiter_features.sql migrations.
--
-- This sets up the two-sided (recruiter <-> student) marketplace described
-- in blueprints/realtime_student_portal_plan.pdf:
--   1. student_profiles + applications tables
--   2. job_descriptions job-board metadata
--   3. Supabase Realtime replication on the 4 live tables
--   4. Performance indexes
--   5. Full Row Level Security (RLS) policies
--
-- IMPORTANT — how RLS interacts with this app:
--   * The FastAPI backend uses the SERVICE ROLE key (see database.py), which
--     BYPASSES RLS. All recruiter reads/writes go through the backend API, so
--     enabling RLS here does NOT break the existing recruiter flows.
--   * RLS only governs DIRECT client access via the anon key + user JWT — i.e.
--     the public student job feed and the Supabase Realtime subscriptions.
--   * auth.uid() returns a UUID. Legacy *_id columns are TEXT, so we compare
--     with auth.uid()::text. The new student_id column is UUID (= auth.users.id).
-- =========================================================================


-- =========================================================================
-- SECTION 1 — TABLES
-- =========================================================================

-- 1a. Student Profiles (separate table, per the blueprint) -----------------
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    email           TEXT NOT NULL,
    avatar_url      TEXT,
    major           TEXT,
    graduation_year TEXT,
    skills_json     JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1b. Job-board metadata on job_descriptions -------------------------------
-- NOTE: `status` already exists from setup_student_recruiter_features.sql
-- (DEFAULT 'active'). The public feed in Phase 2/3 should query status='published'.
ALTER TABLE public.job_descriptions ADD COLUMN IF NOT EXISTS location     TEXT;
ALTER TABLE public.job_descriptions ADD COLUMN IF NOT EXISTS salary_range TEXT;

-- 1c. Applications — the central join: student <-> job <-> resume <-> match -
CREATE TABLE IF NOT EXISTS public.applications (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id          UUID REFERENCES public.job_descriptions(id) ON DELETE CASCADE NOT NULL,
    student_id      UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    resume_id       UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
    match_result_id UUID REFERENCES public.match_results(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'applied',  -- applied | screening | shortlisted | rejected | failed
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- =========================================================================
-- SECTION 2 — PERFORMANCE INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_applications_job_id     ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_resume_id  ON public.applications(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_status ON public.job_descriptions(status);


-- =========================================================================
-- SECTION 3 — REALTIME REPLICATION
-- =========================================================================
-- Adds tables to the supabase_realtime publication so Postgres change events
-- are broadcast to subscribed clients. Wrapped in a DO block because
-- "ADD TABLE" errors if the table is already a member of the publication.
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;      EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.resumes;           EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.match_results;     EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.job_descriptions;  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;


-- =========================================================================
-- SECTION 4 — ROW LEVEL SECURITY
-- =========================================================================
-- Strategy:
--   * Students see only their own profile, applications, resumes, matches.
--   * Recruiters see applications/resumes/matches tied to jobs THEY own.
--   * Anyone (incl. anonymous) can read PUBLISHED jobs (the public feed).
--   * The backend service-role key bypasses all of this.

ALTER TABLE public.student_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results     ENABLE ROW LEVEL SECURITY;

-- ---- student_profiles ----------------------------------------------------
DROP POLICY IF EXISTS "student manages own profile"        ON public.student_profiles;
DROP POLICY IF EXISTS "recruiter views applicant profiles" ON public.student_profiles;

CREATE POLICY "student manages own profile"
    ON public.student_profiles FOR ALL
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Recruiters may read the profile of any student who applied to one of their jobs.
CREATE POLICY "recruiter views applicant profiles"
    ON public.student_profiles FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.applications a
        JOIN public.job_descriptions j ON j.id = a.job_id
        WHERE a.student_id = student_profiles.id
          AND j.user_id = auth.uid()::text
    ));

-- ---- applications --------------------------------------------------------
DROP POLICY IF EXISTS "student views own applications"   ON public.applications;
DROP POLICY IF EXISTS "student creates applications"     ON public.applications;
DROP POLICY IF EXISTS "recruiter views job applications" ON public.applications;
DROP POLICY IF EXISTS "recruiter updates job applications" ON public.applications;

CREATE POLICY "student views own applications"
    ON public.applications FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "student creates applications"
    ON public.applications FOR INSERT
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "recruiter views job applications"
    ON public.applications FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.job_descriptions j
        WHERE j.id = applications.job_id AND j.user_id = auth.uid()::text
    ));

CREATE POLICY "recruiter updates job applications"
    ON public.applications FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.job_descriptions j
        WHERE j.id = applications.job_id AND j.user_id = auth.uid()::text
    ));

-- ---- job_descriptions ----------------------------------------------------
DROP POLICY IF EXISTS "anyone views published jobs" ON public.job_descriptions;
DROP POLICY IF EXISTS "recruiter manages own jobs"  ON public.job_descriptions;

-- Public job feed: readable by everyone, including anonymous visitors.
CREATE POLICY "anyone views published jobs"
    ON public.job_descriptions FOR SELECT
    USING (status = 'published');

CREATE POLICY "recruiter manages own jobs"
    ON public.job_descriptions FOR ALL
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

-- ---- resumes -------------------------------------------------------------
DROP POLICY IF EXISTS "owner views own resumes"        ON public.resumes;
DROP POLICY IF EXISTS "recruiter views applicant resumes" ON public.resumes;

CREATE POLICY "owner views own resumes"
    ON public.resumes FOR SELECT
    USING (user_id = auth.uid()::text);

CREATE POLICY "recruiter views applicant resumes"
    ON public.resumes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.applications a
        JOIN public.job_descriptions j ON j.id = a.job_id
        WHERE a.resume_id = resumes.id AND j.user_id = auth.uid()::text
    ));

-- ---- match_results -------------------------------------------------------
DROP POLICY IF EXISTS "owner views own match results"    ON public.match_results;
DROP POLICY IF EXISTS "recruiter views job match results" ON public.match_results;

CREATE POLICY "owner views own match results"
    ON public.match_results FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.resumes r
        WHERE r.id = match_results.resume_id AND r.user_id = auth.uid()::text
    ));

CREATE POLICY "recruiter views job match results"
    ON public.match_results FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.job_descriptions j
        WHERE j.id = match_results.job_id AND j.user_id = auth.uid()::text
    ));

-- =========================================================================
-- DONE. Phase 1 complete.
-- Next (Phase 2): routes/applications.py — POST /api/applications/apply +
-- the process_student_application() background screening worker.
-- =========================================================================
