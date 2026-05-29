-- ============================================================
-- Migration: Add missing columns to resumes table
-- These columns are used by match.py and resume.py but were
-- not included in the original db_schema_v3.sql
-- ============================================================

-- candidate_status: recruiter-facing status (pending/approved/rejected)
-- Used by: routes/resume.py (update_resume_status), Dashboard.jsx
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS candidate_status TEXT DEFAULT 'pending';

-- match_score: cached final match score from the /match endpoint
-- Used by: routes/match.py (line 119), Dashboard.jsx
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS match_score FLOAT;

-- match_breakdown: cached JSON with keyword details from /match endpoint
-- Used by: routes/match.py (line 120-125)
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS match_breakdown JSONB;
