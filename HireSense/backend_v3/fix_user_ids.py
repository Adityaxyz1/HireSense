"""
Fix: Update all rows in resumes, job_descriptions, and match_results
to the specified authenticated user's ID so data becomes visible.

Usage: python fix_user_ids.py
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not url or not key:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    exit(1)

db = create_client(url, key)

# Target user ID
TARGET_USER_ID = "35fd0185-247a-4f26-86b8-82ebfb24fe85"

tables = ["resumes", "job_descriptions", "match_results"]

print(f"Target User ID: {TARGET_USER_ID}")
print("=" * 60)

# 1. Show current state of all tables
for table in tables:
    try:
        resp = db.table(table).select("id, user_id").execute()
        total = len(resp.data)
        if total == 0:
            print(f"\n{table}: 0 rows (empty)")
            continue

        # Group by user_id
        user_groups = {}
        for r in resp.data:
            uid = r.get("user_id", "<null>")
            user_groups[uid] = user_groups.get(uid, 0) + 1

        print(f"\n{table}: {total} total rows")
        for uid, count in user_groups.items():
            marker = " ✓ (already correct)" if uid == TARGET_USER_ID else " ← will update"
            print(f"  user_id='{uid}': {count} rows{marker}")
    except Exception as e:
        print(f"\n{table}: Error reading - {e}")

# 2. Update all rows that DON'T already have the target user_id
print(f"\n{'=' * 60}")
print("Updating all rows to target user...")
print(f"{'=' * 60}")

for table in tables:
    try:
        # Fetch rows that need updating (not already set to target)
        resp = db.table(table).select("id, user_id").execute()
        rows_to_update = [r for r in resp.data if r.get("user_id") != TARGET_USER_ID]

        if not rows_to_update:
            print(f"  [OK] {table}: all rows already correct, nothing to update")
            continue

        # Update each row individually to be safe (neq filter may not work on all setups)
        updated = 0
        for row in rows_to_update:
            try:
                db.table(table).update({"user_id": TARGET_USER_ID}).eq("id", row["id"]).execute()
                updated += 1
            except Exception as e:
                print(f"  [WARN] {table} row {row['id']}: {e}")

        print(f"  [OK] {table}: updated {updated}/{len(rows_to_update)} rows")
    except Exception as e:
        print(f"  [FAIL] {table}: {e}")

# 3. Verify
print(f"\n{'=' * 60}")
print("Verification:")
print(f"{'=' * 60}")
for table in tables:
    try:
        resp = db.table(table).select("id, user_id").eq("user_id", TARGET_USER_ID).execute()
        total_resp = db.table(table).select("id").execute()
        print(f"  {table}: {len(resp.data)}/{len(total_resp.data)} rows belong to target user")
    except Exception as e:
        print(f"  {table}: Error verifying - {e}")

print("\n[DONE] Refresh the browser to see your data.")
