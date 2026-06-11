"""
Integration test script for Startup Ecosystem Core.
Run with: venv/Scripts/python.exe verify_startups.py

Required env vars in backend/.env:
  TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
"""
import os
import sys
from pathlib import Path

backend_root = Path(__file__).resolve().parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from dotenv import load_dotenv
load_dotenv()


import app.services.email_service
app.services.email_service.verify_email_service = lambda: True
app.services.email_service._load_credentials = lambda: None
app.services.email_service._get_gmail_service = lambda: None
app.services.email_service.send_otp_email = lambda *a, **kw: None
app.services.email_service.send_reset_email = lambda *a, **kw: None

import app.models.user        # noqa: F401
import app.models.property    # noqa: F401
import app.models.investment  # noqa: F401
import app.models.review      # noqa: F401
import app.models.favorite    # noqa: F401
import app.models.rbac        # noqa: F401
import app.models.startup     # noqa: F401
import app.models.investor    # noqa: F401

from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.startup import StartupProfile
from app.core.security import hash_password

client = TestClient(fastapi_app)
db = SessionLocal()


def _login(email: str, password: str, role: str) -> dict:
    resp = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def verify_startups():
    print("=" * 60)
    print("STARTUP ECOSYSTEM CORE VERIFICATION")
    print("=" * 60)

    admin_email = "admin_startup_verifier@example.com"
    founder_email = "founder_verifier@example.com"
    investor_email = "investor_verifier@example.com"
    customer_email = "customer_startup_verifier@example.com"
    test_password = "VerifierTestPass123!"

    for email in [admin_email, founder_email, investor_email, customer_email]:
        u = db.query(User).filter(User.email == email).first()
        if u:
            for sp in db.query(StartupProfile).filter(StartupProfile.founder_id == u.id).all():
                db.delete(sp)
            db.delete(u)
    db.commit()

    admin_user = User(
        name="Admin Startup Verifier", email=admin_email,
        hashed_password=hash_password(test_password),
        role=UserRole.admin, is_verified=True, is_active=True,
    )
    founder = User(
        name="Founder Verifier", email=founder_email,
        hashed_password=hash_password(test_password),
        role=UserRole.startup_founder, is_verified=True, is_active=True,
    )
    investor = User(
        name="Investor Verifier", email=investor_email,
        hashed_password=hash_password(test_password),
        role=UserRole.investor, is_verified=True, is_active=True,
    )
    customer = User(
        name="Customer Verifier", email=customer_email,
        hashed_password=hash_password(test_password),
        role=UserRole.customer, is_verified=True, is_active=True,
    )
    db.add_all([admin_user, founder, investor, customer])
    db.commit()
    db.refresh(founder)

    admin_headers = _login(admin_email, test_password, "admin")
    founder_headers = _login(founder_email, test_password, "startup_founder")
    investor_headers = _login(investor_email, test_password, "investor")
    customer_headers = _login(customer_email, test_password, "customer")

    print("\n--- 1. RBAC ---")
    assert client.get("/admin/startups/", headers=customer_headers).status_code == 403
    assert client.get("/admin/startups/", headers=admin_headers).status_code == 200
    assert client.post("/founder/startups/", json={"name": "X"}, headers=customer_headers).status_code == 403
    print("RBAC - OK")

    print("\n--- 2. Founder Create ---")
    payload = {
        "name": "NovaAI Labs",
        "founder_name": "Founder Verifier",
        "industry": "AI/ML",
        "stage": "Seed",
        "description": "AI platform for enterprises",
        "problem_statement": "Manual workflows are slow",
        "solution": "Automated AI agents",
        "funding_requirement": 500000,
        "country": "India",
        "team_size": 8,
    }
    resp = client.post("/founder/startups/", json=payload, headers=founder_headers)
    assert resp.status_code == 201, resp.text
    startup_id = resp.json()["id"]
    assert resp.json()["status"] == "draft"
    assert resp.json()["profile_completion"] >= 50
    print(f"Created startup ID {startup_id}")

    print("\n--- 3. Founder Ownership ---")
    assert client.patch(f"/founder/startups/{startup_id}", json={"name": "Hacked"}, headers=investor_headers).status_code == 403
    print("Ownership guard - OK")

    print("\n--- 4. Submit & Admin Approve ---")
    resp = client.post(f"/founder/startups/{startup_id}/submit", headers=founder_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "pending_review"

    resp = client.post(f"/admin/startups/{startup_id}/approve", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "published"
    print("Publish workflow - OK")

    print("\n--- 5. Public Marketplace ---")
    resp = client.get("/startups/")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert any(s["id"] == startup_id for s in items)

    resp = client.get("/startups/?q=NovaAI")
    assert resp.status_code == 200
    assert len(resp.json()["items"]) >= 1

    resp = client.get(f"/startups/{startup_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "NovaAI Labs"
    print("Marketplace & search - OK")

    print("\n--- 6. Investor Interactions ---")
    assert client.post(f"/investor/startups/{startup_id}/save", headers=investor_headers).status_code == 200
    saved = client.get("/investor/startups/saved", headers=investor_headers).json()
    assert any(s["id"] == startup_id for s in saved)

    assert client.post(f"/investor/startups/{startup_id}/request-deck", json={"message": "Please share"}, headers=investor_headers).status_code == 201
    assert client.post(f"/investor/startups/{startup_id}/contact", json={"subject": "Intro", "message": "Interested in learning more about your product"}, headers=investor_headers).status_code == 201
    assert client.post(f"/investor/startups/{startup_id}/express-interest", json={"interest_level": "high"}, headers=investor_headers).status_code == 201

    interactions = client.get("/investor/startups/interactions", headers=investor_headers).json()
    assert len(interactions["deck_requests"]) >= 1
    assert len(interactions["contact_requests"]) >= 1
    assert len(interactions["interest_expressions"]) >= 1
    print("Investor interactions - OK")

    print("\n--- 7. Founder Dashboard ---")
    dash = client.get("/founder/startups/dashboard", headers=founder_headers).json()
    assert dash["published_startups"] >= 1
    assert dash["deck_requests"] >= 1
    print("Founder dashboard - OK")

    print("\n--- 8. Admin Moderation ---")
    resp = client.post(f"/admin/startups/{startup_id}/verify", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["verification_status"] == "verified"

    resp = client.post(f"/admin/startups/{startup_id}/suspend", json={"reason": "test"}, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "suspended"
    print("Admin moderation - OK")

    print("\n--- 9. Unpublished Hidden ---")
    resp = client.get(f"/startups/{startup_id}")
    assert resp.status_code == 404
    print("Suspended hidden from public - OK")

    print("\n--- 10. Soft Delete ---")
    resp = client.delete(f"/admin/startups/{startup_id}", headers=admin_headers)
    assert resp.status_code == 204
    sp = db.query(StartupProfile).filter(StartupProfile.id == startup_id).first()
    assert sp.is_deleted is True
    print("Soft delete - OK")

    print("\n" + "=" * 60)
    print("ALL STARTUP ECOSYSTEM TESTS PASSED!")
    print("=" * 60)

    for email in [admin_email, founder_email, investor_email, customer_email]:
        u = db.query(User).filter(User.email == email).first()
        if u:
            for sp in db.query(StartupProfile).filter(StartupProfile.founder_id == u.id).all():
                db.delete(sp)
            db.delete(u)
    db.commit()


if __name__ == "__main__":
    try:
        verify_startups()
    finally:
        db.close()
