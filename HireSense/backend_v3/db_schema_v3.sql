-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Resumes table
CREATE TABLE IF NOT EXISTS public.resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  file_url TEXT,
  raw_text TEXT NOT NULL,
  candidate_name TEXT,
  embedding VECTOR(384),
  ats_score FLOAT DEFAULT 0,
  ats_breakdown JSONB,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Force add ALL potentially missing V3 columns if migrating from V2
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'local-user';
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS candidate_name TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processing';
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS raw_text TEXT DEFAULT '';
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS ats_score FLOAT DEFAULT 0;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS ats_breakdown JSONB;

-- Force type cast if user_id was previously a UUID
-- We must drop any dependent policies first
DROP POLICY IF EXISTS "Users can view their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Individuals can create resumes." ON public.resumes;
DROP POLICY IF EXISTS "Individuals can view their own resumes." ON public.resumes;
DROP POLICY IF EXISTS "Individuals can update their own resumes." ON public.resumes;
DROP POLICY IF EXISTS "Individuals can delete their own resumes." ON public.resumes;

ALTER TABLE public.resumes ALTER COLUMN user_id TYPE TEXT;

-- Re-enable RLS but with a simpler policy for local development if desired
-- Or just disable it for this table to avoid future issues during migration
ALTER TABLE public.resumes DISABLE ROW LEVEL SECURITY;

-- Job Descriptions table (with user_id for per-user isolation)
CREATE TABLE IF NOT EXISTS public.job_descriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  job_text TEXT NOT NULL,
  title TEXT,
  embedding VECTOR(384) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.job_descriptions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.job_descriptions ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'local-user';

-- Match Results table (with user_id for per-user isolation)
CREATE TABLE IF NOT EXISTS public.match_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  resume_id UUID REFERENCES public.resumes(id) NOT NULL,
  job_id UUID REFERENCES public.job_descriptions(id) NOT NULL,
  semantic_score FLOAT,
  skill_score FLOAT,
  experience_score FLOAT,
  final_score FLOAT,
  resume_strength INT,
  risk_level TEXT,
  fair_mode_enabled BOOLEAN DEFAULT false,
  bias_report JSONB,
  candidate_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Force add columns if migrating
ALTER TABLE public.match_results ADD COLUMN IF NOT EXISTS candidate_status TEXT DEFAULT 'pending';
ALTER TABLE public.match_results ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'local-user';

-- Disable RLS (we handle auth at the API layer)
ALTER TABLE public.job_descriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results DISABLE ROW LEVEL SECURITY;

-- Performance indexes for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON public.job_descriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_match_results_user_id ON public.match_results (user_id);

-- Storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false) ON CONFLICT DO NOTHING;
