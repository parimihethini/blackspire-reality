"""upgrade legacy notifications schema to communication model

Revision ID: a8c3d5e72b10
Revises: f7b2c4e1a309
Create Date: 2026-06-17

The prior migration could be stamped without replacing the legacy property
notifications table (columns: user_id, message).  This revision detects that
schema and recreates the table expected by communication.py.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "a8c3d5e72b10"
down_revision = "f7b2c4e1a309"
branch_labels = None
depends_on = None

_REQUIRED_COLS = {"actor_id", "type", "title", "body", "link", "entity_type", "entity_id"}


def _column_names(bind, table: str) -> set[str]:
    return {c["name"] for c in inspect(bind).get_columns(table)}


def _create_notifications_table() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("type", sa.String(length=60), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("entity_type", sa.String(length=50), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_id", "notifications", ["id"], unique=False)
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"], unique=False)
    op.create_index("ix_notifications_type", "notifications", ["type"], unique=False)
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"], unique=False)
    op.create_index("ix_notifications_created", "notifications", ["created_at"], unique=False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("notifications"):
        _create_notifications_table()
        return

    cols = _column_names(bind, "notifications")
    if _REQUIRED_COLS.issubset(cols):
        return

    op.drop_table("notifications")
    _create_notifications_table()


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("notifications"):
        return
    cols = _column_names(bind, "notifications")
    if "message" in cols and "title" not in cols:
        return
    op.drop_table("notifications")
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
