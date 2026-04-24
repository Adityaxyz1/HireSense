import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('d:/project kes/HireSense/backend_v3/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Missing credentials")
    exit(1)

supabase = create_client(url, key)

try:
    print(f"Connecting to {url}...")
    res = supabase.table("resumes").select("count").execute()
    print(f"Resumes count: {res.data}")
    
    res = supabase.table("job_descriptions").select("count").execute()
    print(f"Jobs count: {res.data}")
    
except Exception as e:
    print(f"Error: {e}")
