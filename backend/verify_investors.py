"""
Integration test script for Phase 2: Investor Database Module.
Tests CRUD APIs, RBAC, soft-delete, audit fields, pagination, and CSV functionality.
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

import app.services.email_service
app.services.email_service.verify_email_service = lambda: True
app.services.email_service._load_credentials = lambda: None
app.services.email_service._get_gmail_service = lambda: None
app.services.email_service.send_otp_email = lambda *a, **kw: print("[MOCK EMAIL] Sent OTP email")
app.services.email_service.send_reset_email = lambda *a, **kw: print("[MOCK EMAIL] Sent reset email")

import app.models.user        # noqa: F401
import app.models.property    # noqa: F401
import app.models.investment  # noqa: F401
import app.models.review      # noqa: F401
import app.models.favorite    # noqa: F401
import app.models.rbac        # noqa: F401
import app.models.investor    # noqa: F401

from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.investor import InvestorProfile
from app.core.security import hash_password

client = TestClient(fastapi_app)
db = SessionLocal()


def _items(resp_json):
    if isinstance(resp_json, dict) and "items" in resp_json:
        return resp_json["items"]
    return resp_json


def verify_phase2():
    print("=" * 60)
    print("STARTING PHASE 2: INVESTOR DATABASE MODULE VERIFICATION")
    print("=" * 60)

    customer_email = "customer_verifier@example.com"
    team_email = "team_member_verifier@example.com"
    super_email = "super_admin_verifier@example.com"
    existing_user_email = "existing_investor_user@example.com"
    new_user_email = "new_investor_user@example.com"
    test_password = "VerifierTestPass123!"

    for email in [customer_email, team_email, super_email, existing_user_email, new_user_email]:
        u = db.query(User).filter(User.email == email).first()
        if u:
            p = db.query(InvestorProfile).filter(InvestorProfile.user_id == u.id).first()
            if p:
                db.delete(p)
            db.delete(u)
    db.commit()

    customer_user = User(
        name="Customer Verifier",
        email=customer_email,
        hashed_password=hash_password(test_password),
        role=UserRole.customer,
        is_verified=True,
        is_active=True,
    )
    team_user = User(
        name="Team Member Verifier",
        email=team_email,
        hashed_password=hash_password(test_password),
        role=UserRole.team_member,
        is_verified=True,
        is_active=True,
    )
    super_user = User(
        name="Super Admin Verifier",
        email=super_email,
        hashed_password=hash_password(test_password),
        role=UserRole.super_admin,
        is_verified=True,
        is_active=True,
    )
    existing_user = User(
        name="Existing Investor User",
        email=existing_user_email,
        hashed_password=hash_password(test_password),
        role=UserRole.customer,
        is_verified=True,
        is_active=True,
    )
    db.add_all([customer_user, team_user, super_user, existing_user])
    db.commit()
    print("Test users configured.")

    admin_login = client.post("/auth/login", json={"email": _ADMIN_EMAIL, "password": _ADMIN_PASSWORD, "role": "admin"})
    assert admin_login.status_code == 200, admin_login.text
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    super_login = client.post("/auth/login", json={"email": super_email, "password": test_password, "role": "super_admin"})
    assert super_login.status_code == 200, super_login.text
    super_headers = {"Authorization": f"Bearer {super_login.json()['access_token']}"}

    team_login = client.post("/auth/login", json={"email": team_email, "password": test_password, "role": "team_member"})
    assert team_login.status_code == 200, team_login.text
    team_headers = {"Authorization": f"Bearer {team_login.json()['access_token']}"}

    cust_login = client.post("/auth/login", json={"email": customer_email, "password": test_password, "role": "customer"})
    assert cust_login.status_code == 200, cust_login.text
    cust_headers = {"Authorization": f"Bearer {cust_login.json()['access_token']}"}

    print("\n--- 1. RBAC Verification ---")
    for label, headers, expected in [
        ("customer", cust_headers, 403),
        ("team_member", team_headers, 403),
        ("super_admin", super_headers, 200),
        ("admin", admin_headers, 200),
    ]:
        resp = client.get("/admin/investors/", headers=headers)
        assert resp.status_code == expected, f"{label}: expected {expected}, got {resp.status_code}"
        print(f"Access for {label}: {resp.status_code} - OK")

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
        "priority_score": 4,
    }
    resp = client.post("/admin/investors/", json=create_payload, headers=admin_headers)
    assert resp.status_code == 201, resp.json()
    p_data = resp.json()
    profile_id_1 = p_data["id"]
    assert p_data["company_name"] == "Genesis Ventures"
    assert p_data["user"]["role"] == "investor"
    assert p_data["created_by"] is not None
    print(f"Created InvestorProfile ID {profile_id_1}")

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
        "priority_score": 5,
    }
    resp = client.post("/admin/investors/", json=create_payload_new, headers=admin_headers)
    assert resp.status_code == 201, resp.json()
    profile_id_2 = resp.json()["id"]
    print(f"Created InvestorProfile ID {profile_id_2}")

    print("\n--- 4. GET by ID ---")
    resp = client.get(f"/admin/investors/{profile_id_2}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["company_name"] == "Hyperion PE"
    print("GET by ID - OK")

    print("\n--- 5. List, Filters, Pagination, Sort ---")
    resp = client.get("/admin/investors/?industry=AI", headers=admin_headers)
    assert resp.status_code == 200
    payload = resp.json()
    assert len(payload["items"]) >= 2
    assert payload["total"] >= 2
    print("Filter by industry 'AI' - OK")

    resp = client.get("/admin/investors/?ticket_size_max=1500000", headers=admin_headers)
    results = _items(resp.json())
    assert len(results) == 1
    assert results[0]["company_name"] == "Genesis Ventures"
    print("Filter by ticket size - OK")

    resp = client.get("/admin/investors/?q=Associate", headers=admin_headers)
    results = _items(resp.json())
    assert len(results) == 1
    assert results[0]["company_name"] == "Hyperion PE"
    print("Search by keyword - OK")

    resp = client.get("/admin/investors/?per_page=1&page=1&sort_by=company_name&sort_order=asc", headers=admin_headers)
    assert resp.status_code == 200
    page_data = resp.json()
    assert page_data["per_page"] == 1
    assert page_data["page"] == 1
    assert page_data["total"] >= 2
    assert page_data["pages"] >= 2
    assert len(page_data["items"]) == 1
    print("Pagination metadata - OK")

    resp = client.get("/admin/investors/?sort_by=invalid_field", headers=admin_headers)
    assert resp.status_code == 422
    print("Invalid sort_by rejected - OK")

    print("\n--- 6. Validation ---")
    resp = client.post("/admin/investors/", json={
        "email": "bad_validation@example.com",
        "name": "Bad Validation",
        "investor_type": "NotARealType",
        "ticket_size_min": 100,
        "ticket_size_max": 50,
    }, headers=admin_headers)
    assert resp.status_code == 422
    print("Invalid investor_type rejected - OK")

    print("\n--- 7. Patch & Audit Update ---")
    resp = client.patch(f"/admin/investors/{profile_id_1}", json={
        "company_name": "Genesis Capital",
        "industries": ["AI", "Fintech", "HealthTech"],
    }, headers=admin_headers)
    assert resp.status_code == 200
    updated_data = resp.json()
    assert updated_data["company_name"] == "Genesis Capital"
    assert updated_data["updated_by"] is not None
    print("Patch and audit update - OK")

    print("\n--- 8. CSV Export ---")
    resp = client.get("/admin/investors/export", headers=admin_headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["Content-Type"]
    assert "Genesis Capital" in resp.text
    print("CSV Export - OK")

    print("\n--- 9. CSV Import ---")
    csv_data = (
        "Email,Name,Phone,Company Name,Designation,Investor Type,Ticket Size Min,Ticket Size Max,"
        "Preferred Countries,Preferred Cities,Industries,Stages,Notes,Internal Comments,Priority Score\n"
        f"{existing_user_email},Existing User Update,999999,Genesis CSV Updated,Managing Director,VC,200000,2000000,India,Chennai,AI,Seed,Updated notes,Comments,3\n"
        "nonexisting_import_email@example.com,Non Existing,111111,Import VC,Principal,VC,50000,500000,US,NY,SaaS,Seed,Notes,Comments,1\n"
    )
    file_payload = {"file": ("test_import.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    resp = client.post("/admin/investors/import", files=file_payload, headers=admin_headers)
    assert resp.status_code == 200
    import_report = resp.json()
    assert import_report["imported"] == 1
    assert import_report["skipped"] == 1
    print("CSV Import - OK")

    print("\n--- 10. Soft Delete & Restore on Create ---")
    resp = client.delete(f"/admin/investors/{profile_id_1}", headers=admin_headers)
    assert resp.status_code == 204

    resp = client.get("/admin/investors/", headers=admin_headers)
    assert all(p["id"] != profile_id_1 for p in _items(resp.json()))

    profile_db = db.query(InvestorProfile).filter(InvestorProfile.id == profile_id_1).first()
    assert profile_db.is_deleted is True
    assert profile_db.deleted_by is not None
    print("Soft delete persisted - OK")

    restore_payload = {
        "user_id": existing_user.id,
        "company_name": "Genesis Restored",
        "investor_type": "VC",
        "industries": ["AI"],
        "stages": ["Seed"],
    }
    resp = client.post("/admin/investors/", json=restore_payload, headers=admin_headers)
    assert resp.status_code == 201, resp.json()
    assert resp.json()["company_name"] == "Genesis Restored"
    assert resp.json()["is_deleted"] is False
    print("Soft-deleted profile restored on create - OK")

    print("\n" + "=" * 60)
    print("ALL PHASE 2 INVESTOR DATABASE MODULE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

    for email in [customer_email, team_email, super_email, existing_user_email, new_user_email]:
        u = db.query(User).filter(User.email == email).first()
        if u:
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
