"""
Integration test script for Phase 2: Investor Database Module.
Tests CRUD APIs, RBAC, soft-delete, audit fields, and CSV functionality.
Run with:
    venv/Scripts/python.exe verify_investors.py

Required env vars (add to backend/.env for local use):
  TEST_ADMIN_EMAIL=testadmin@example.com
  TEST_ADMIN_PASSWORD=your_admin_password
"""
import os
import sys
import io
from pathlib import Path

# Force load backend root
backend_root = Path(__file__).resolve().parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from dotenv import load_dotenv
load_dotenv()

_ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL")
_ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD")

if not _ADMIN_EMAIL or not _ADMIN_PASSWORD:
    raise SystemExit(
        "ERROR: TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set in the environment.\n"
        "Add them to backend/.env — never hardcode credentials in source files."
    )

# Mock email service to prevent blocking external API/SMTP connection attempts on startup
import app.services.email_service
app.services.email_service.verify_email_service = lambda: True
app.services.email_service._load_credentials = lambda: None
app.services.email_service._get_gmail_service = lambda: None
app.services.email_service.send_otp_email = lambda *a, **kw: print("[MOCK EMAIL] Sent OTP email")
app.services.email_service.send_reset_email = lambda *a, **kw: print("[MOCK EMAIL] Sent reset email")

# ── CRITICAL: import ALL models before any db.query() call ─────────────────
# SQLAlchemy resolves relationship targets (e.g. "Property") lazily on the
# first mapper configuration pass triggered by db.query(User). Every model
# that any other model references must be registered first.
import app.models.user        # noqa: F401  – registers User + UserRole
import app.models.property    # noqa: F401  – registers Property (User.properties)
import app.models.investment  # noqa: F401  – registers Investment
import app.models.review      # noqa: F401  – registers Review
import app.models.favorite    # noqa: F401  – registers Favorite
import app.models.rbac        # noqa: F401  – registers Role / Permission
import app.models.investor    # noqa: F401  – registers InvestorProfile / Industry / Stage
# ─────────────────────────────────────────────────────────────────────────────

from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.investor import InvestorProfile, Industry, Stage
from app.core.security import decode_token, hash_password

client = TestClient(fastapi_app)
db = SessionLocal()

def verify_phase2():
    print("=" * 60)
    print("STARTING PHASE 2: INVESTOR DATABASE MODULE VERIFICATION")
    print("=" * 60)

    # 1. Clean/setup test users
    admin_email = "testadmin@example.com"
    super_email = "superadmin@example.com"
    customer_email = "customer_verifier@example.com"
    existing_user_email = "existing_investor_user@example.com"
    new_user_email = "new_investor_user@example.com"

    # Cleanup any previous runs
    for email in [customer_email, existing_user_email, new_user_email]:
        u = db.query(User).filter(User.email == email).first()
        if u:
            # Delete related profiles
            p = db.query(InvestorProfile).filter(InvestorProfile.user_id == u.id).first()
            if p:
                db.delete(p)
            db.delete(u)
    db.commit()

    # Create customer user (to test RBAC block)
    customer_user = User(
        name="Customer Verifier",
        email=customer_email,
        hashed_password=hash_password("Password123!"),
        role=UserRole.customer,
        is_verified=True,
        is_active=True
    )
    db.add(customer_user)

    # Create existing user (to test linking existing accounts)
    existing_user = User(
        name="Existing Investor User",
        email=existing_user_email,
        hashed_password=hash_password("Password123!"),
        role=UserRole.customer, # starts as customer, will be upgraded
        is_verified=True,
        is_active=True
    )
    db.add(existing_user)
    db.commit()
    print("Test users configured.")

    # Log in admin & customer to get tokens
    admin_login = client.post("/auth/login", json={"email": _ADMIN_EMAIL, "password": _ADMIN_PASSWORD, "role": "admin"})
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    cust_login = client.post("/auth/login", json={"email": customer_email, "password": "Password123!", "role": "customer"})
    assert cust_login.status_code == 200
    cust_token = cust_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # 2. RBAC Protection
    print("\n--- 1. RBAC Verification ---")
    resp = client.get("/admin/investors/", headers=cust_headers)
    assert resp.status_code == 403, f"Expected 403 for customer access, got {resp.status_code}"
    print("Access DENIED for customer to list investors - OK")

    # 3. Create profile (link existing user)
    print("\n--- 2. Create Profile (Link Existing User) ---")
    create_payload = {
        "user_id": existing_user.id,
        "company_name": "Genesis Ventures",
        "designation": "Partner",
        "investor_type": "VC",
        "ticket_size_min": 100000,
        "ticket_size_max": 1000000,
        "preferred_countries": ["India", "US"],
        "preferred_cities": ["Bangalore"],
        "industries": ["AI", "Fintech"],
        "stages": ["Seed", "Series A"],
        "notes": "Interested in B2B AI startups",
        "priority_score": 4
    }
    resp = client.post("/admin/investors/", json=create_payload, headers=admin_headers)
    assert resp.status_code == 201, f"Create investor profile failed: {resp.json()}"
    p_data = resp.json()
    profile_id_1 = p_data["id"]
    print(f"Created InvestorProfile ID {profile_id_1} (Genesis Ventures)")
    assert p_data["company_name"] == "Genesis Ventures"
    assert p_data["user"]["role"] == "investor" # verify user was upgraded
    assert "AI" in p_data["industries"]
    assert "Seed" in p_data["stages"]

    # Check audit creator field
    assert p_data["created_by"] is not None
    print(f"Verified Audit Fields: Created By ID: {p_data['created_by']}")

    # 4. Create profile (new user on-the-fly)
    print("\n--- 3. Create Profile (New User on-the-fly) ---")
    create_payload_new = {
        "email": new_user_email,
        "name": "New Investor User",
        "phone": "9876543210",
        "password": "SecurePassword123!",
        "company_name": "Hyperion PE",
        "designation": "Associate",
        "investor_type": "PE",
        "ticket_size_min": 5000000,
        "ticket_size_max": 20000000,
        "preferred_countries": ["Singapore"],
        "industries": ["Logistics", "AI"],
        "stages": ["Series B", "Growth"],
        "priority_score": 5
    }
    resp = client.post("/admin/investors/", json=create_payload_new, headers=admin_headers)
    assert resp.status_code == 201, f"Create investor profile failed: {resp.json()}"
    p_data_new = resp.json()
    profile_id_2 = p_data_new["id"]
    print(f"Created InvestorProfile ID {profile_id_2} (Hyperion PE)")
    assert p_data_new["user"]["email"] == new_user_email
    assert p_data_new["user"]["role"] == "investor"

    # 5. List and Filters
    print("\n--- 4. List and Filters ---")
    
    # Filter by industry: AI
    resp = client.get("/admin/investors/?industry=AI", headers=admin_headers)
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) >= 2
    print("Filter by industry 'AI' returned correct profiles")

    # Filter by ticket size max (1500000) -> should only return profile 1 (Genesis Ventures)
    resp = client.get("/admin/investors/?ticket_size_max=1500000", headers=admin_headers)
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["company_name"] == "Genesis Ventures"
    print("Filter by ticket size range returned correct profiles")

    # Search keyword matching designation
    resp = client.get("/admin/investors/?q=Associate", headers=admin_headers)
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["company_name"] == "Hyperion PE"
    print("Search by keyword 'Associate' returned correct profile")

    # 6. Patch & Update Audit
    print("\n--- 5. Patch & Audit Update ---")
    patch_payload = {
        "company_name": "Genesis Capital",
        "industries": ["AI", "Fintech", "HealthTech"]
    }
    resp = client.patch(f"/admin/investors/{profile_id_1}", json=patch_payload, headers=admin_headers)
    assert resp.status_code == 200
    updated_data = resp.json()
    assert updated_data["company_name"] == "Genesis Capital"
    assert "HealthTech" in updated_data["industries"]
    assert updated_data["updated_by"] is not None
    print("Patch and audit updated successfully")

    # 7. CSV Export
    print("\n--- 6. CSV Export ---")
    resp = client.get("/admin/investors/export", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "text/csv; charset=utf-8"
    csv_content = resp.text
    assert "Genesis Capital" in csv_content
    assert "Hyperion PE" in csv_content
    print("CSV Export generated correct schema and rows")

    # 8. CSV Import (Do not auto-create user accounts modification)
    print("\n--- 7. CSV Import (User exists / doesn't exist checks) ---")
    # Prepare CSV data
    # Row 1: Existing user (upgrades/updates profile)
    # Row 2: Non-existing user (must be skipped, no account created)
    csv_data = (
        "Email,Name,Phone,Company Name,Designation,Investor Type,Ticket Size Min,Ticket Size Max,Preferred Countries,Preferred Cities,Industries,Stages,Notes,Internal Comments,Priority Score\n"
        f"{existing_user_email},Existing User Update,999999,Genesis CSV Updated,Managing Director,VC,200000,2000000,India,Chennai,AI,Seed,Updated notes,Comments,3\n"
        "nonexisting_import_email@example.com,Non Existing,111111,Import VC,Principal,VC,50000,500000,US,NY,SaaS,Seed,Notes,Comments,1\n"
    )
    
    file_payload = {"file": ("test_import.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    resp = client.post("/admin/investors/import", files=file_payload, headers=admin_headers)
    assert resp.status_code == 200
    import_report = resp.json()
    assert import_report["imported"] == 1
    assert import_report["skipped"] == 1
    print(f"CSV Import Result: Imported: {import_report['imported']}, Skipped: {import_report['skipped']}")
    assert "User with email 'nonexisting_import_email@example.com' does not exist. Skipping." in import_report["errors"][0]
    print("Correctly skipped non-existing user import (no account created) - OK")

    # 9. Soft Delete
    print("\n--- 8. Soft Delete ---")
    # Soft delete profile 1
    resp = client.delete(f"/admin/investors/{profile_id_1}", headers=admin_headers)
    assert resp.status_code == 204
    
    # Assert it is excluded from listing
    resp = client.get("/admin/investors/", headers=admin_headers)
    assert resp.status_code == 200
    current_list = resp.json()
    # Profile 1 should not be listed anymore
    assert all(p["id"] != profile_id_1 for p in current_list)
    print("Soft Deleted profile excluded from default listings - OK")

    # Assert record is STILL in the database (soft deleted)
    profile_db = db.query(InvestorProfile).filter(InvestorProfile.id == profile_id_1).first()
    assert profile_db is not None
    assert profile_db.is_deleted == True
    assert profile_db.deleted_by is not None
    assert profile_db.deleted_at is not None
    print(f"Verified Database soft delete record: deleted_by ID={profile_db.deleted_by}, deleted_at={profile_db.deleted_at}")

    print("\n" + "=" * 60)
    print("ALL PHASE 2 INVESTOR DATABASE MODULE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

    # Cleanup verifiers
    for email in [customer_email, existing_user_email, new_user_email]:
        u = db.query(User).filter(User.email == email).first()
        if u:
            # Delete related profiles
            p = db.query(InvestorProfile).filter(InvestorProfile.user_id == u.id).first()
            if p:
                db.delete(p)
            db.delete(u)
    db.commit()

if __name__ == "__main__":
    try:
        verify_phase2()
    finally:
        db.close()
