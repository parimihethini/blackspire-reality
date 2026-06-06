"""
Verify Phase 1 admin RBAC: roles, login, JWT, and route protection.

Run from backend/ (uses DATABASE_URL from .env):

  python scripts/verify_admin_rbac.py
  python scripts/verify_admin_rbac.py --api https://blackspire-reality.onrender.com
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

import app.models.property  # noqa: F401
import app.models.review  # noqa: F401
import app.models.investment  # noqa: F401
import app.models.rbac  # noqa: F401

import httpx
import os

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.rbac import Role, Permission
from app.models.user import User, UserRole
from app.core.permissions import user_has_permission

TEST_ADMIN_EMAIL = "phase1.admin@blackspire.com"
TEST_ADMIN_PASSWORD = "***REMOVED***"
TEST_CUSTOMER_EMAIL = "phase1.customer@gmail.com"


def _print(title: str, ok: bool, detail: str = "") -> bool:
    status = "PASS" if ok else "FAIL"
    line = f"[{status}] {title}"
    if detail:
        line += f" — {detail}"
    print(line)
    return ok


def verify_roles_in_db(db) -> bool:
    ok = True
    for name in ("super_admin", "admin", "team_member"):
        role = db.query(Role).filter(Role.name == name).first()
        ok &= _print(f"Role exists: {name}", role is not None)
        if role:
            perms = [p.name for p in role.permissions]
            ok &= _print(
                f"  permissions for {name}",
                "admin.access" in perms,
                f"{len(perms)} permissions",
            )
    super_admin = db.query(Role).filter(Role.name == "super_admin").first()
    admin = db.query(Role).filter(Role.name == "admin").first()
    if super_admin and admin:
        super_perms = {p.name for p in super_admin.permissions}
        admin_perms = {p.name for p in admin.permissions}
        ok &= _print(
            "super_admin has admin.roles",
            "admin.roles" in super_perms,
        )
        ok &= _print(
            "admin has admin.access",
            "admin.access" in admin_perms,
        )
        ok &= _print(
            "team_member lacks admin.roles",
            "admin.roles" not in {p.name for p in db.query(Role).filter(Role.name == "team_member").first().permissions},
        )
    return ok


def verify_public_registration_blocked(api_base: str) -> bool:
    ok = True
    with httpx.Client(base_url=api_base, timeout=30.0) as client:
        for role in ("admin", "super_admin", "team_member"):
            r = client.post(
                "/auth/register",
                json={
                    "name": "Blocked User",
                    "email": f"blocked-{role}@test.local",
                    "password": "Password123!",
                    "role": role,
                },
            )
            ok &= _print(
                f"Public register blocked for {role}",
                r.status_code == 403,
                f"HTTP {r.status_code}",
            )
    return ok


def verify_admin_login(api_base: str, email: str, password: str) -> tuple[bool, str | None]:
    with httpx.Client(base_url=api_base, timeout=30.0) as client:
        r = client.post("/auth/admin/login", json={"email": email, "password": password})
        if r.status_code != 200:
            return False, None
        data = r.json()
        token = data.get("access_token")
        role = data.get("role")
        if not token or role not in ("admin", "super_admin"):
            return False, None
        payload = decode_token(token)
        ok = payload.get("role") == role and payload.get("sub") is not None
        return ok, token


def verify_route_access(api_base: str, token: str | None, path: str, expect_ok: bool) -> bool:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    with httpx.Client(base_url=api_base, timeout=30.0) as client:
        r = client.get(path, headers=headers)
    if expect_ok:
        return _print(f"GET {path} allowed", r.status_code == 200, f"HTTP {r.status_code}")
    return _print(f"GET {path} blocked", r.status_code in (401, 403), f"HTTP {r.status_code}")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--api", default=None, help="API base URL (default: from settings)")
    p.add_argument("--skip-api", action="store_true", help="Only verify database roles")
    args = p.parse_args()

    api_base = (args.api or "https://blackspire-reality.onrender.com").rstrip("/")
    print(f"=== RBAC verification (API: {api_base}) ===\n")

    all_ok = True
    db = SessionLocal()
    try:
        all_ok &= verify_roles_in_db(db)

        admin_user = db.query(User).filter(User.email == TEST_ADMIN_EMAIL).first()
        if not admin_user:
            print(f"\n[WARN] Test admin {TEST_ADMIN_EMAIL} not found. Run create_admin.py first.")
        else:
            all_ok &= _print(
                "Test admin account exists",
                admin_user.role in (UserRole.admin, UserRole.super_admin),
                f"role={admin_user.role.value}",
            )
            all_ok &= _print(
                "Test admin has admin.access permission",
                user_has_permission(db, admin_user, "admin.access"),
            )
    finally:
        db.close()

    if args.skip_api:
        return 0 if all_ok else 1

    print("\n--- API checks ---")
    all_ok &= verify_public_registration_blocked(api_base)

    if TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD:
        login_ok, admin_token = verify_admin_login(api_base, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)
        all_ok &= _print("Admin login via POST /auth/admin/login", login_ok)
    else:
        print("[SKIP] Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD env vars for admin login test")
        login_ok, admin_token = False, None
    if admin_token:
        payload = decode_token(admin_token)
        all_ok &= _print(
            "JWT contains admin role",
            payload.get("role") in ("admin", "super_admin"),
            f"role={payload.get('role')}",
        )

    all_ok &= verify_route_access(api_base, admin_token, "/admin/stats", expect_ok=True)
    all_ok &= verify_route_access(api_base, admin_token, "/admin/users", expect_ok=True)
    all_ok &= verify_route_access(api_base, None, "/admin/stats", expect_ok=False)

    # Customer token — use login if test customer exists
    customer_token = None
    with httpx.Client(base_url=api_base, timeout=30.0) as client:
        r = client.post(
            "/auth/login",
            json={"email": TEST_CUSTOMER_EMAIL, "password": TEST_ADMIN_PASSWORD, "role": "customer"},
        )
        if r.status_code == 200:
            customer_token = r.json().get("access_token")

    if customer_token:
        all_ok &= verify_route_access(api_base, customer_token, "/admin/stats", expect_ok=False)
        all_ok &= verify_route_access(api_base, customer_token, "/admin/users", expect_ok=False)
    else:
        print(f"[SKIP] Customer test user {TEST_CUSTOMER_EMAIL} not available for route block test")

    print("\n=== Summary ===")
    if all_ok:
        print("All checks passed.")
        return 0
    print("Some checks failed.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
