"""Run the profiles table migration on Supabase."""
import sys
sys.path.insert(0, '.')
from database import get_db

def run():
    db = get_db()
    
    # Create profiles table using Supabase REST API
    # We'll use rpc or raw SQL through the management API
    # Since we can't run raw SQL through the client, we'll just 
    # test if the table exists by trying to select from it
    try:
        result = db.table("profiles").select("id").limit(1).execute()
        print("✅ profiles table already exists!")
        return True
    except Exception as e:
        print(f"⚠️  profiles table doesn't exist yet: {e}")
        print("\n📋 Please run this SQL in your Supabase Dashboard SQL Editor:")
        print("=" * 60)
        print("""
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Storage bucket for avatars (run separately if needed)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT DO NOTHING;

-- Allow public access to avatars bucket
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated Update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Delete" ON storage.objects 
FOR DELETE USING (bucket_id = 'avatars');
""")
        print("=" * 60)
        return False

if __name__ == "__main__":
    run()
