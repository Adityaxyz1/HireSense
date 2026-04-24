import sqlite3

def migrate():
    conn = sqlite3.connect(r"d:\project kes\HireSense\backend_v3\data\hiresense.db")
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE match_results ADD COLUMN candidate_status TEXT DEFAULT 'pending';")
        print("Migration successful")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column already exists")
        else:
            print(f"Error: {e}")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
