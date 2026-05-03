-- ============================================================
-- Table: public.auth_logs
-- Purpose: Track all security events (login, logout, signup)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.auth_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID, -- UUID of the user if authenticated
  email TEXT, -- Email address for quick visibility
  event_type TEXT NOT NULL, -- e.g., 'login', 'logout', 'signup'
  ip_address TEXT,
  user_agent TEXT
);

-- Enable Row Level Security (only accessible via Admin API)
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup in Admin Dashboard
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON public.auth_logs (created_at DESC);
