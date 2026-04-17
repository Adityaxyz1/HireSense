-- ============================================================
-- 1. Enable Row Level Security (RLS) on all user data tables
-- ============================================================
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Drop any prior permissive/conflicting policies
-- ============================================================
DROP POLICY IF EXISTS "Users can manage their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can manage their own job_descriptions" ON public.job_descriptions;
DROP POLICY IF EXISTS "Users can manage their own match_results" ON public.match_results;
DROP POLICY IF EXISTS "Users can manage their own profiles" ON public.profiles;

-- ============================================================
-- 3. Create Restrictive Data Policies
-- (Only the owner can SELECT, INSERT, UPDATE, DELETE their data)
-- ============================================================

-- Resumes Table
CREATE POLICY "Users can manage their own resumes" 
ON public.resumes 
FOR ALL 
USING (auth.uid()::text = user_id) 
WITH CHECK (auth.uid()::text = user_id);

-- Job Descriptions Table
CREATE POLICY "Users can manage their own job_descriptions" 
ON public.job_descriptions 
FOR ALL 
USING (auth.uid()::text = user_id) 
WITH CHECK (auth.uid()::text = user_id);

-- Match Results Table
CREATE POLICY "Users can manage their own match_results" 
ON public.match_results 
FOR ALL 
USING (auth.uid()::text = user_id) 
WITH CHECK (auth.uid()::text = user_id);

-- Profiles Table (assuming id is UUID type here)
CREATE POLICY "Users can manage their own profiles" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- ============================================================
-- 4. Secure Supabase Storage Buckets
-- ============================================================

-- A. Resumes Bucket (Private: Only owner can upload and read)
DROP POLICY IF EXISTS "Users can upload their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own resumes" ON storage.objects;

CREATE POLICY "Users can upload their own resumes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own resumes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- B. Avatars Bucket (Avatars are usually public, but only the owner can upload/update)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

CREATE POLICY "Anyone can view avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
