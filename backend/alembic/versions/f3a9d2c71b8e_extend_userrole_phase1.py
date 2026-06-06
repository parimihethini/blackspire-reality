"""Extend UserRole enum with Phase 1 roles

Revision ID: f3a9d2c71b8e
Revises: ee8bd42b269d
Create Date: 2026-06-06 16:10:00.000000

Adds: super_admin, team_member, startup_founder, investor

NOTE: PostgreSQL ALTER TYPE ... ADD VALUE cannot execute inside a transaction block.
      This migration explicitly commits before running the DDL statements.
      IF NOT EXISTS prevents errors on re-runs.

Downgrade: PostgreSQL does not support DROP VALUE from an enum natively.
           Downgrade is intentionally a no-op — the extra values are inert
           as long as no rows use them.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3a9d2c71b8e"
down_revision: Union[str, None] = "ee8bd42b269d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# New Phase 1 role values to add to the existing 'userrole' PostgreSQL enum
_NEW_ROLES = ["super_admin", "team_member", "startup_founder", "investor"]


def upgrade() -> None:
    """
    Extend the 'userrole' PostgreSQL enum with 4 new Phase 1 values.

    Strategy:
    - ALTER TYPE ... ADD VALUE IF NOT EXISTS is safe to re-run (idempotent).
    - We commit the current Alembic transaction first because PostgreSQL
      does not allow ALTER TYPE ADD VALUE inside a transaction block.
    - Existing rows (customer / seller / admin) are completely unaffected.
    """
    connection = op.get_bind()

    # Commit any open Alembic transaction so we can run DDL outside a tx block.
    connection.execute(sa.text("COMMIT"))

    for role in _NEW_ROLES:
        connection.execute(
            sa.text(f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{role}'")
        )

    print(f"[Migration] Added UserRole values: {_NEW_ROLES}")


def downgrade() -> None:
    """
    PostgreSQL does not support ALTER TYPE ... DROP VALUE.

    Safe no-op: new values are unused at this migration point.
    To fully revert, a full enum recreation (complex) would be required —
    document here for manual execution if ever needed:

      -- Manual downgrade steps (run outside a transaction):
      -- CREATE TYPE userrole_new AS ENUM ('customer', 'seller', 'admin');
      -- ALTER TABLE users ALTER COLUMN role TYPE userrole_new
      --   USING role::text::userrole_new;
      -- DROP TYPE userrole;
      -- ALTER TYPE userrole_new RENAME TO userrole;
    """
    print(
        "[Migration] downgrade() is a no-op. "
        "PostgreSQL enum values cannot be removed without a full type recreation. "
        "See migration docstring for manual steps."
    )
