"""
Programmatic verification script for SUPER_ADMIN role features and RBAC rules.
Run with:
    venv/Scripts/python.exe verify_super_admin.py

Required env vars (add to backend/.env for local use):
  TEST_SUPER_ADMIN_EMAIL=superadmin@example.com
  TEST_SUPER_ADMIN_PASSWORD=your_super_admin_password
  TEST_ADMIN_EMAIL=testadmin@example.com
  TEST_ADMIN_PASSWORD=your_admin_password
"""
import os
import sys
from pathlib import Path

# Force load backend root
backend_root = Path(__file__).resolve().parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from dotenv import load_dotenv
load_dotenv()

_SUPER_ADMIN_EMAIL = os.environ.get("TEST_SUPER_ADMIN_EMAIL")
_SUPER_ADMIN_PASSWORD = os.environ.get("TEST_SUPER_ADMIN_PASSWORD")
_ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL")
_ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD")

_missing = [k for k, v in {
    "TEST_SUPER_ADMIN_EMAIL": _SUPER_ADMIN_EMAIL,
    "TEST_SUPER_ADMIN_PASSWORD": _SUPER_ADMIN_PASSWORD,
    "TEST_ADMIN_EMAIL": _ADMIN_EMAIL,
    "TEST_ADMIN_PASSWORD": _ADMIN_PASSWORD,
}.items() if not v]
if _missing:
    raise SystemExit(
        f"ERROR: Missing required environment variables: {', '.join(_missing)}\n"
        "Add them to backend/.env — never hardcode credentials in source files."
    )

# Mock email service to prevent blocking external API/SMTP connection attempts on startup
import app.services.email_service
app.services.email_service.verify_email_service = lambda: True
app.services.email_service._load_credentials = lambda: None
app.services.email_service._get_gmail_service = lambda: None
app.services.email_service.send_otp_email = lambda *a, **kw: print("[MOCK EMAIL] Sent OTP email")
app.services.email_service.send_reset_email = lambda *a, **kw: print("[MOCK EMAIL] Sent reset email")

from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import decode_token, hash_password
from app.core.permissions import user_has_permission
from app.db.seed_rbac import PERMISSION_DEFINITIONS
from app.core.permissions import sync_user_role_assignment

# Import related models for SQLAlchemy mapper mapping
import app.models.property
import app.models.review
import app.models.investment

client = TestClient(fastapi_app)
db = SessionLocal()

def verify_all():
    print("=" * 60)
    print("STARTING SUPER_ADMIN ROLE AND RBAC VERIFICATION")
    print("=" * 60)

    # Clean/setup temp test customer user if already exists
    temp_email = "temp_verification_user@example.com"
    existing_temp = db.query(User).filter(User.email == temp_email).first()
    if existing_temp:
        db.delete(existing_temp)
        db.commit()
    
    # Create a clean temp test user with role customer
    temp_user = User(
        name="Temp Verification User",
        email=temp_email,
        hashed_password=hash_password("TempPassword123!"),
        role=UserRole.customer,
        is_verified=True,
        is_active=True
    )
    db.add(temp_user)
    db.commit()
    db.refresh(temp_user)
    sync_user_role_assignment(db, temp_user)
    db.commit()
    print(f"Created temporary verification user: {temp_email} (ID: {temp_user.id})")

    # 1. Verify SUPER_ADMIN login works
    print("\n--- 1. Verification: SUPER_ADMIN login works ---")
    login_payload = {
        "email": _SUPER_ADMIN_EMAIL,
        "password": _SUPER_ADMIN_PASSWORD,
        "role": "super_admin"
    }

    # Check general public login endpoint
    login_resp = client.post("/auth/login", json=login_payload)
    assert login_resp.status_code == 200, f"Public login failed: {login_resp.json()}"
    super_token = login_resp.json()["access_token"]
    print("Public /auth/login successful for super_admin")

    # Check dedicated admin portal login endpoint
    admin_login_resp = client.post("/auth/admin/login", json=login_payload)
    assert admin_login_resp.status_code == 200, f"Admin portal login failed: {admin_login_resp.json()}"
    print("Admin portal /auth/admin/login successful for super_admin")

    # Log in standard admin for comparisons
    admin_login_payload = {
        "email": _ADMIN_EMAIL,
        "password": _ADMIN_PASSWORD,
        "role": "admin"
    }
    admin_login_resp = client.post("/auth/login", json=admin_login_payload)
    assert admin_login_resp.status_code == 200, f"Admin login failed: {admin_login_resp.json()}"
    admin_token = admin_login_resp.json()["access_token"]
    print("Login successful for standard admin")

    # 2. Verify SUPER_ADMIN can access all admin routes
    print("\n--- 2. Verification: SUPER_ADMIN can access all admin routes ---")
    headers = {"Authorization": f"Bearer {super_token}"}
    
    # Admin Users route
    resp = client.get("/admin/users", headers=headers)
    assert resp.status_code == 200, f"Failed to access /admin/users: {resp.json()}"
    print("Accessed GET /admin/users successfully")

    # Admin Properties route
    resp = client.get("/admin/properties", headers=headers)
    assert resp.status_code == 200, f"Failed to access /admin/properties: {resp.json()}"
    print("Accessed GET /admin/properties successfully")

    # Admin Stats route
    resp = client.get("/admin/stats", headers=headers)
    assert resp.status_code == 200, f"Failed to access /admin/stats: {resp.json()}"
    print("Accessed GET /admin/stats successfully")

    # 3. Verify SUPER_ADMIN can manage roles and permissions
    print("\n--- 3. Verification: SUPER_ADMIN can manage roles ---")
    # Change temp user role to admin
    role_update_payload = {"role": "admin"}
    resp = client.patch(f"/admin/users/{temp_user.id}/role", json=role_update_payload, headers=headers)
    assert resp.status_code == 200, f"Failed to change role to admin: {resp.json()}"
    print(f"Role updated successfully by super_admin for user ID {temp_user.id} to admin")

    # 4. Verify SUPER_ADMIN can access functionality restricted from ADMIN users
    print("\n--- 4. Verification: SUPER_ADMIN can access functionality restricted from ADMIN users ---")
    
    # Standard admin tries to assign the 'super_admin' role to the temp user (Should fail with 403)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    role_update_payload = {"role": "super_admin"}
    resp = client.patch(f"/admin/users/{temp_user.id}/role", json=role_update_payload, headers=admin_headers)
    assert resp.status_code == 403, f"Expected 403 when standard admin tries to assign super_admin role, got {resp.status_code}"
    print("Standard ADMIN is forbidden from assigning the super_admin role (Got HTTP 403) - OK")

    # Super admin tries to assign the 'super_admin' role to the temp user (Should succeed)
    resp = client.patch(f"/admin/users/{temp_user.id}/role", json=role_update_payload, headers=headers)
    assert resp.status_code == 200, f"Expected 200 when super admin assigns super_admin role, got {resp.status_code}: {resp.json()}"
    print("SUPER_ADMIN successfully assigned the super_admin role - OK")

    # 5. Verify JWT contains role=super_admin
    print("\n--- 5. Verification: JWT contains role=super_admin ---")
    payload = decode_token(super_token)
    assert payload.get("role") == "super_admin", f"JWT role is {payload.get('role')}, expected super_admin"
    print(f"JWT decoded successfully. Contents: {payload}")
    print("JWT role claim is 'super_admin' - OK")

    # 6. Verify RBAC verification results for SUPER_ADMIN
    print("\n--- 6. Verification: RBAC verification results for SUPER_ADMIN ---")
    super_admin_db_user = db.query(User).filter(User.email == _SUPER_ADMIN_EMAIL).first()
    assert super_admin_db_user is not None
    
    print("Checking permissions in database:")
    for perm_name, desc in PERMISSION_DEFINITIONS:
        has_perm = user_has_permission(db, super_admin_db_user, perm_name)
        assert has_perm, f"SUPER_ADMIN lacks permission: {perm_name}"
        print(f" - Permission [{perm_name: <25}] ({desc}): GRANTED (True)")

    print("\n" + "=" * 60)
    print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)

    # Cleanup temp user
    db.delete(temp_user)
    db.commit()
    print("Temporary user cleaned up successfully.")

if __name__ == "__main__":
    try:
        verify_all()
    finally:
        db.close()
