-- =========================================================================
-- RECRUITER MANAGEMENT — Admin-controlled recruiter accounts + audit trail
-- =========================================================================
-- Recruiters can no longer self-register. Admins create/manage them from the
-- Admin Dashboard. This adds the structured recruiter record + an audit log.
--
-- Run in the Supabase SQL Editor. Additive and idempotent.
-- The FastAPI backend uses the SERVICE ROLE key (bypasses RLS); both tables
-- have RLS enabled with NO policies, so they are unreachable by anon/auth
-- clients — only the admin-guarded backend can touch them.
-- =========================================================================


-- ── Recruiter accounts (one row per recruiter auth user) ──────────────────
CREATE TABLE IF NOT EXISTS public.recruiter_accounts (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name    TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    phone           TEXT,
    designation     TEXT,
    company_website TEXT,
    linkedin_url    TEXT,
    status          TEXT NOT NULL DEFAULT 'active',     -- 'active' | 'inactive'
    created_by      UUID,                               -- admin auth.users.id
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recruiter_accounts_status ON public.recruiter_accounts(status);
CREATE INDEX IF NOT EXISTS idx_recruiter_accounts_email  ON public.recruiter_accounts(email);

ALTER TABLE public.recruiter_accounts ENABLE ROW LEVEL SECURITY;
-- (no policies → only the service-role backend can read/write)


-- ── Admin audit log (recruiter create/update/delete/status changes) ───────
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    admin_id     UUID,
    admin_email  TEXT,
    action       TEXT NOT NULL,    -- recruiter.create | recruiter.update | recruiter.delete | recruiter.status
    target_id    UUID,
    target_email TEXT,
    details      JSONB
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action     ON public.admin_audit_logs(action);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
-- (no policies → only the service-role backend can read/write)

-- =========================================================================
-- END — Recruiter management structure complete.
-- =========================================================================
