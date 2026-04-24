from database import get_db
try:
    db = get_db()
    res = db.table("resumes").select("count", count="exact").execute()
    print(f"Connection Successful! Resume count: {res.count}")
except Exception as e:
    print(f"Connection Failed: {e}")
