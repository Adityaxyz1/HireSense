-- =========================================================================
-- SQL Migration: Setup Student & Recruiter Feature Additions
-- Run this in your Supabase SQL Editor to set up all required database assets.
-- =========================================================================

-- 1. Configure resumes table for Candidate pipeline tracking & Match caching
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS candidate_status TEXT DEFAULT 'pending';
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS match_score FLOAT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS match_breakdown JSONB;

-- 2. Configure job_descriptions table for Status tracking & Recruitment documents
ALTER TABLE public.job_descriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.job_descriptions ADD COLUMN IF NOT EXISTS recruitment_docs JSONB DEFAULT '[]'::jsonb;

-- 3. Configure profiles table for Persona roles (recruiter vs student)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'recruiter';

-- 4. Set up public Supabase Storage bucket for Student-facing Recruitment Documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('job_documents', 'job_documents', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
