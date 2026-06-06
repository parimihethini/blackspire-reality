"""Phase 1 OAuth fields and RBAC tables

Revision ID: b7c4e1a92d03
Revises: f3a9d2c71b8e
Create Date: 2026-06-06 20:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c4e1a92d03"
down_revision: Union[str, None] = "f3a9d2c71b8e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    user_cols = {c["name"] for c in inspector.get_columns("users")} if inspector.has_table("users") else set()

    if "google_id" not in user_cols:
        op.add_column("users", sa.Column("google_id", sa.String(length=255), nullable=True))
        op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)
    if "linkedin_id" not in user_cols:
        op.add_column("users", sa.Column("linkedin_id", sa.String(length=255), nullable=True))
        op.create_index("ix_users_linkedin_id", "users", ["linkedin_id"], unique=True)
    if "auth_provider" not in user_cols:
        op.add_column("users", sa.Column("auth_provider", sa.String(length=50), nullable=True))

    if "hashed_password" in user_cols:
        op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=True)

    if not inspector.has_table("roles"):
        op.create_table(
            "roles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=50), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_roles_id", "roles", ["id"], unique=False)
        op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    if not inspector.has_table("permissions"):
        op.create_table(
            "permissions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_permissions_id", "permissions", ["id"], unique=False)
        op.create_index("ix_permissions_name", "permissions", ["name"], unique=True)

    if not inspector.has_table("role_permissions"):
        op.create_table(
            "role_permissions",
            sa.Column("role_id", sa.Integer(), nullable=False),
            sa.Column("permission_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("role_id", "permission_id"),
        )

    if not inspector.has_table("user_roles"):
        op.create_table(
            "user_roles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "role_id", name="uq_user_role"),
        )
        op.create_index("ix_user_roles_id", "user_roles", ["id"], unique=False)
        op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"], unique=False)
        op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_roles_role_id", table_name="user_roles")
    op.drop_index("ix_user_roles_user_id", table_name="user_roles")
    op.drop_index("ix_user_roles_id", table_name="user_roles")
    op.drop_table("user_roles")
    op.drop_table("role_permissions")
    op.drop_index("ix_permissions_name", table_name="permissions")
    op.drop_index("ix_permissions_id", table_name="permissions")
    op.drop_table("permissions")
    op.drop_index("ix_roles_name", table_name="roles")
    op.drop_index("ix_roles_id", table_name="roles")
    op.drop_table("roles")
    op.drop_index("ix_users_linkedin_id", table_name="users")
    op.drop_column("users", "linkedin_id")
    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_column("users", "google_id")
    op.drop_column("users", "auth_provider")
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=False)
