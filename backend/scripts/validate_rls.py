"""Validate RLS is enabled on all public tables and API roles lack direct access."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2

# Load backend/.env when run standalone (mirrors app config behaviour).
_env_path = Path(__file__).resolve().parents[1] / ".env"
if _env_path.exists():
    for line in _env_path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, val = s.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip("'\""))

EXPECTED_TABLES = {
    "users",
    "properties",
    "site_visits",
    "notifications",
    "investments",
    "reviews",
    "favorites",
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "industries",
    "stages",
    "investor_profiles",
    "investor_industries",
    "investor_stages",
    "startup_profiles",
    "startup_saves",
    "startup_deck_requests",
    "startup_contact_requests",
    "startup_interest_expressions",
    "alembic_version",
}

API_ROLES = ("anon", "authenticated")


def main() -> int:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        return 1

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute(
        """
        SELECT tablename, rowsecurity, relforcerowsecurity
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
        WHERE t.schemaname = 'public'
        ORDER BY tablename
        """
    )
    rows = cur.fetchall()
    tables_found = {r[0] for r in rows}
    missing_rls = [r[0] for r in rows if not r[1]]
    missing_force = [r[0] for r in rows if not r[2]]

    print("=== RLS Status (public schema) ===")
    for name, rls, forced in rows:
        status = "OK" if rls and forced else "FAIL"
        print(f"  [{status}] {name}: rls={rls}, force={forced}")

    # Privilege check for API roles
    print("\n=== API Role Privileges ===")
    issues = 0
    for role in API_ROLES:
        cur.execute(
            """
            SELECT table_name, privilege_type
            FROM information_schema.table_privileges
            WHERE grantee = %s AND table_schema = 'public'
            ORDER BY table_name, privilege_type
            """,
            (role,),
        )
        privs = cur.fetchall()
        if privs:
            issues += 1
            print(f"  FAIL {role}: {len(privs)} privilege(s) remain")
            for table, priv in privs[:5]:
                print(f"    - {table}: {priv}")
            if len(privs) > 5:
                print(f"    ... and {len(privs) - 5} more")
        else:
            print(f"  OK   {role}: no table privileges")

    unexpected = tables_found - EXPECTED_TABLES
    missing = EXPECTED_TABLES - tables_found
    if unexpected:
        print(f"\nNOTE: Extra tables in public schema: {sorted(unexpected)}")
    if missing:
        print(f"\nNOTE: Expected tables not found: {sorted(missing)}")

    conn.close()

    failed = bool(missing_rls or missing_force or issues)
    if failed:
        print("\nVALIDATION FAILED")
        if missing_rls:
            print(f"  RLS disabled: {missing_rls}")
        if missing_force:
            print(f"  FORCE RLS disabled: {missing_force}")
        return 1

    print("\nVALIDATION PASSED — all tables protected, API roles revoked")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
