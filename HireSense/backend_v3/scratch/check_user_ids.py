import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('d:/project kes/HireSense/backend_v3/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

supabase = create_client(url, key)

try:
    res = supabase.table("resumes").select("id, user_id, candidate_name").execute()
    print("Resumes Data:")
    for row in res.data:
        print(row)
except Exception as e:
    print(f"Error: {e}")
