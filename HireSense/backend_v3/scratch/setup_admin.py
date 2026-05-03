"""
Setup script to initialize the Admin Account.
"""
import os
import sys

# Add parent dir to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db

ADMIN_EMAIL = "aditya.poddar3698@gmail.com"
ADMIN_PASS = "Aditya@369089"

def ensure_admin():
    db = get_db()
    
    try:
        print(f"Checking/Creating Admin Account for {ADMIN_EMAIL}...")
        
        # Try sign up
        try:
            db.auth.sign_up({
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASS,
            })
            print("Admin account created successfully.")
        except Exception as e:
            if "already registered" in str(e).lower() or "already exists" in str(e).lower():
                print("Admin account already exists. Updating password to match master key...")
            else:
                print(f"Sign up failed: {e}")
                
        # Forcefully update password and confirm email using Admin API
        users_resp = db.auth.admin.list_users()
        admin_user = next((u for u in users_resp if u.email == ADMIN_EMAIL), None)
        if admin_user:
            db.auth.admin.update_user_by_id(admin_user.id, {
                "password": ADMIN_PASS,
                "email_confirm": True
            })
            print("Admin password forcefully updated and email auto-confirmed.")
        else:
            print("Could not find admin user in list to update password.")
                
        # Verify the login works
        try:
            db.auth.sign_in_with_password({"email": ADMIN_EMAIL, "password": ADMIN_PASS})
            print("Login verification successful!")
        except Exception as login_e:
            print(f"Login verification failed: {login_e}")
            
    except Exception as e:
        print(f"Failed to setup admin: {e}")

if __name__ == "__main__":
    ensure_admin()
