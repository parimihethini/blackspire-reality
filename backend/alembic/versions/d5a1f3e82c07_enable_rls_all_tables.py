"""enable_rls_all_tables

Revision ID: d5a1f3e82c07
Revises: c4e8f1a23b05
Create Date: 2026-06-17 15:20:00.000000

Enable Row Level Security on all public-schema tables and revoke direct
PostgREST access for anon/authenticated roles.  The FastAPI backend connects
via the postgres role (BYPASSRLS), so application workflows are unaffected.
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect, text


revision: str = "d5a1f3e82c07"
down_revision: Union[str, None] = "c4e8f1a23b05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# All application tables plus Alembic tracking.
_TABLES: tuple[str, ...] = (
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
)

# Supabase API roles that must not access data directly.
_API_ROLES: tuple[str, ...] = ("anon", "authenticated")


def _existing_public_tables(bind) -> list[str]:
    inspector = inspect(bind)
    return sorted(name for name in _TABLES if inspector.has_table(name))


def _existing_roles(bind) -> set[str]:
    rows = bind.execute(
        text("SELECT rolname FROM pg_roles WHERE rolname = ANY(:roles)"),
        {"roles": list(_API_ROLES)},
    )
    return {row[0] for row in rows}


def upgrade() -> None:
    bind = op.get_bind()
    tables = _existing_public_tables(bind)
    api_roles = _existing_roles(bind)

    for table in tables:
        op.execute(text(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY'))
        op.execute(text(f'ALTER TABLE public."{table}" FORCE ROW LEVEL SECURITY'))

    for table in tables:
        for role in api_roles:
            op.execute(text(f'REVOKE ALL ON public."{table}" FROM "{role}"'))

    for role in api_roles:
        op.execute(text(f'REVOKE ALL ON SCHEMA public FROM "{role}"'))


def downgrade() -> None:
    bind = op.get_bind()
    tables = _existing_public_tables(bind)
    api_roles = _existing_roles(bind)

    for role in api_roles:
        op.execute(text(f'GRANT USAGE ON SCHEMA public TO "{role}"'))

    for table in tables:
        for role in api_roles:
            op.execute(text(f'GRANT ALL ON public."{table}" TO "{role}"'))
        op.execute(text(f'ALTER TABLE public."{table}" NO FORCE ROW LEVEL SECURITY'))
        op.execute(text(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY'))
