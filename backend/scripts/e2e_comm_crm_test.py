"""End-to-end test: investor interest -> notification -> CRM lead -> messaging."""
from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.main import app
from app.db.init_db import _import_all_models
from app.models.startup import StartupListingStatus, StartupProfile
from app.models.user import User, UserRole
from app.services import crm_service, notification_service

client = TestClient(app)


def _mk_user(db, role: UserRole, prefix: str) -> User:
    email = f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"
    user = User(
        email=email,
        name=f"{prefix} User",
        hashed_password=hash_password("E2eTestPass123!"),
        role=role,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(email: str, password: str, role: str) -> dict:
    resp = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def main() -> int:
    db = SessionLocal()
    _import_all_models()
    password = "E2eTestPass123!"
    try:
        founder = _mk_user(db, UserRole.startup_founder, "founder")
        investor = _mk_user(db, UserRole.investor, "investor")
        admin = _mk_user(db, UserRole.admin, "admin")

        startup = StartupProfile(
            founder_id=founder.id,
            name=f"E2E Startup {uuid.uuid4().hex[:6]}",
            description="Communication CRM pipeline test",
            status=StartupListingStatus.published.value,
            is_deleted=False,
        )
        db.add(startup)
        db.commit()
        db.refresh(startup)

        investor_headers = _login(investor.email, password, "investor")
        founder_headers = _login(founder.email, password, "startup_founder")
        admin_headers = _login(admin.email, password, "admin")

        # 1. Investor expresses interest
        r = client.post(
            f"/investor/startups/{startup.id}/express-interest",
            json={"interest_level": "high", "notes": "E2E interest"},
            headers=investor_headers,
        )
        assert r.status_code == 201, r.text
        print("STEP1 express_interest: OK")

        # 2. Founder receives notification
        r = client.get("/notifications/", headers=founder_headers)
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        assert any(n.get("type") == "investor_expressed_interest" for n in items), items
        print("STEP2 founder_notification: OK")

        # 3. CRM lead auto-created
        r = client.get("/crm/leads", headers=founder_headers)
        assert r.status_code == 200, r.text
        leads = r.json()
        assert isinstance(leads, list), leads
        lead = next((l for l in leads if l["startup_id"] == startup.id), None)
        assert lead is not None, leads
        print("STEP3 crm_lead_created: OK lead_id=", lead["id"])

        # 4. Start conversation and send message
        r = client.post(
            "/messaging/conversations",
            json={"startup_id": startup.id},
            headers=investor_headers,
        )
        assert r.status_code == 201, r.text
        conv_id = r.json()["id"]
        r = client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"body": "Hello founder, interested in your startup."},
            headers=investor_headers,
        )
        assert r.status_code == 201, r.text
        print("STEP4 message_sent: OK conv_id=", conv_id)

        # 5. Founder sees conversation
        r = client.get("/messaging/conversations", headers=founder_headers)
        assert r.status_code == 200, r.text
        assert any(c["id"] == conv_id for c in r.json()), r.json()
        print("STEP5 founder_conversations: OK")

        # 6. Admin CRM metrics
        r = client.get("/admin/crm/metrics", headers=admin_headers)
        assert r.status_code == 200, r.text
        metrics = r.json()
        assert metrics.get("total_leads", 0) >= 1
        print("STEP6 admin_metrics: OK", metrics)

        print("E2E_COMM_CRM: PASS")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
