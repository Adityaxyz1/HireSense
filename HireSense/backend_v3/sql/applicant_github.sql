-- Applicant GitHub enrichment (optional)
-- An applicant may add a GitHub profile URL; the backend pulls public profile +
-- repo aggregates from the free GitHub REST API and caches the normalized result
-- in github_data. github_url is OPTIONAL — everything degrades gracefully when null.
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS github_url        text;
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS github_data       jsonb;        -- normalized GitHub profile
ALTER TABLE public.applicant_profiles ADD COLUMN IF NOT EXISTS github_synced_at  timestamptz;
