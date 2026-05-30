-- Applicant ATS history
-- One row per resume an applicant uploads via the applicant-side ATS checker.
-- The backend writes/reads this table with the service-role client and scopes
-- every query by user_id, so RLS is optional. `file_url` stores the object path
-- inside the `student-resume-pdfs` storage bucket.
create table if not exists public.applicant_resumes (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null,
  file_url       text,
  filename       text,
  candidate_name text,
  ats_score      int,
  ats_breakdown  jsonb,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_applicant_resumes_user on public.applicant_resumes(user_id);
