-- =========================================================================
-- STUDENT REGION — COMPLETE DATABASE STRUCTURE
-- =========================================================================
-- Single self-contained schema for the two-sided (recruiter <-> student)
-- marketplace. This is the source of truth for every table/column/policy the
-- Phase 2 backend (routes/applications.py, routes/student.py) reads or writes.
--
-- Safe to run on top of an existing HireSense DB — every statement is additive
-- and idempotent (IF NOT EXISTS / upsert-style). Run in the Supabase SQL Editor.
--
-- RLS note: the FastAPI backend uses the SERVICE ROLE key, which BYPASSES RLS.
-- The policies below only govern DIRECT client access (the public job feed and
-- the Supabase Realtime subscriptions on the student & recruiter dashboards).
-- auth.uid() is a UUID; legacy *_id columns are TEXT, so we compare
-- auth.uid()::text. The new applicant_id column is UUID (= auth.users.id).
-- =========================================================================


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ 1. PERSONA ROLE  (profiles.role)                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
-- profiles already exists (recruiter accounts). Add the persona discriminator.
-- routes/auth.py (signup) and routes/student.py upsert this to 'student'.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'recruiter';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ 2. STUDENT PROFILES  (public.applicant_profiles)                          ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
-- One row per student, keyed to the Supabase auth user.
CREATE TABLE IF NOT EXISTS public.applicant_profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    email           TEXT NOT NULL,
    avatar_url      TEXT,
    major           TEXT,
    graduation_year TEXT,
    skills_json     JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ 3. JOB BOARD METADATA  (public.job_descriptions)                        ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
-- job_descriptions already exists. Add board fields used by the student feed.
-- status: 'draft' | 'published' | 'archived'. The public feed shows 'published'.
ALTER TABLE public.job_descriptions ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'active';
ALTER TABLE public.job_descriptions ADD COLUMN IF NOT EXISTS location     TEXT;
ALTER TABLE public.job_descriptions ADD COLUMN IF NOT EXISTS salary_range TEXT;


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ 4. APPLICATIONS  (public.applications)                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
-- The central join: student <-> job <-> resume <-> match_result.
-- status lifecycle: applied -> screening -> shortlisted | rejected (| failed).
CREATE TABLE IF NOT EXISTS public.applications (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id          UUID REFERENCES public.job_descriptions(id) ON DELETE CASCADE NOT NULL,
    applicant_id      UUID REFERENCES public.applicant_profiles(id) ON DELETE CASCADE NOT NULL,
    resume_id       UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
    match_result_id UUID REFERENCES public.match_results(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'applied',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ 5. INDEXES                                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
CREATE INDEX IF NOT EXISTS idx_applications_job_id     ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON public.applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_resume_id  ON public.applications(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_status ON public.job_descriptions(status);


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ 6. REALTIME REPLICATION                                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
-- Every write to these tables is broadcast to subscribed dashboards.
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;     EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.resumes;          EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.match_results;    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.job_descriptions; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ 7. ROW LEVEL SECURITY                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
ALTER TABLE public.applicant_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results     ENABLE ROW LEVEL SECURITY;

-- ---- applicant_profiles ----------------------------------------------------
DROP POLICY IF EXISTS "applicant manages own profile"        ON public.applicant_profiles;
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

-- ---- applications --------------------------------------------------------
DROP POLICY IF EXISTS "applicant views own applications"     ON public.applications;
DROP POLICY IF EXISTS "applicant creates applications"       ON public.applications;
DROP POLICY IF EXISTS "recruiter views job applications"   ON public.applications;
DROP POLICY IF EXISTS "recruiter updates job applications" ON public.applications;

CREATE POLICY "applicant views own applications"
    ON public.applications FOR SELECT USING (applicant_id = auth.uid());

CREATE POLICY "applicant creates applications"
    ON public.applications FOR INSERT WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "recruiter views job applications"
    ON public.applications FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.job_descriptions j
                   WHERE j.id = applications.job_id AND j.user_id = auth.uid()::text));

CREATE POLICY "recruiter updates job applications"
    ON public.applications FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.job_descriptions j
                   WHERE j.id = applications.job_id AND j.user_id = auth.uid()::text));

-- ---- job_descriptions ----------------------------------------------------
DROP POLICY IF EXISTS "anyone views published jobs" ON public.job_descriptions;
DROP POLICY IF EXISTS "recruiter manages own jobs"  ON public.job_descriptions;

CREATE POLICY "anyone views published jobs"
    ON public.job_descriptions FOR SELECT USING (status = 'published');

CREATE POLICY "recruiter manages own jobs"
    ON public.job_descriptions FOR ALL
    USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- ---- resumes -------------------------------------------------------------
DROP POLICY IF EXISTS "owner views own resumes"          ON public.resumes;
DROP POLICY IF EXISTS "recruiter views applicant resumes" ON public.resumes;

CREATE POLICY "owner views own resumes"
    ON public.resumes FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "recruiter views applicant resumes"
    ON public.resumes FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.applications a
                   JOIN public.job_descriptions j ON j.id = a.job_id
                   WHERE a.resume_id = resumes.id AND j.user_id = auth.uid()::text));

-- ---- match_results -------------------------------------------------------
DROP POLICY IF EXISTS "owner views own match results"     ON public.match_results;
DROP POLICY IF EXISTS "recruiter views job match results" ON public.match_results;

CREATE POLICY "owner views own match results"
    ON public.match_results FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.resumes r
                   WHERE r.id = match_results.resume_id AND r.user_id = auth.uid()::text));

CREATE POLICY "recruiter views job match results"
    ON public.match_results FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.job_descriptions j
                   WHERE j.id = match_results.job_id AND j.user_id = auth.uid()::text));


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ 8. STORAGE                                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
-- Student resumes reuse the existing private 'resumes' bucket (proxied via the
-- backend /uploads endpoint). Recruitment docs use the public 'job_documents'
-- bucket. Both are created by the earlier migrations; included here for clarity.
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false)
    ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('job_documents', 'job_documents', true)
    ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- =========================================================================
-- END — Student Region database structure complete.
-- =========================================================================
