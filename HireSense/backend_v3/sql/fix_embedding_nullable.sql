-- ───────────────────────────────────────────────────────────────────────────
-- FIX: "Unable to create job roles" (and, latently, resume uploads)
--
-- Symptom: POST /upload-job returns 500; Postgres error
--   23502: null value in column "embedding" of relation "job_descriptions"
--          violates not-null constraint
--
-- Cause: embedding generation was moved off the request path into a background
-- task (perf — instant job/resume creation). The row is now inserted with
-- embedding = NULL and the vector is filled in moments later. Matching also
-- regenerates embeddings on the fly, so a briefly-null vector is harmless.
-- But the `embedding` column still carries a NOT NULL constraint from the
-- original (inline-embedding) schema, so the deferred insert is rejected.
--
-- Fix: allow NULL embeddings. Run once in the Supabase SQL Editor (Dashboard →
-- SQL Editor → New query → paste → Run). Affects whichever Supabase project the
-- backend's SUPABASE_URL points at, so it fixes both local and deployed.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.job_descriptions ALTER COLUMN embedding DROP NOT NULL;
ALTER TABLE public.resumes          ALTER COLUMN embedding DROP NOT NULL;
