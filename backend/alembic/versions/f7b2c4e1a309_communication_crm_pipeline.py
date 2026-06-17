"""Communication & CRM pipeline tables.

Revision ID: f7b2c4e1a309
Revises: d5a1f3e82c07
Create Date: 2026-06-17

Creates:
  - notifications
  - conversations
  - messages
  - crm_leads
  - crm_activities
  - crm_reminders
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# ── revision identifiers ──────────────────────────────────────────────────────
revision = "f7b2c4e1a309"
down_revision = "d5a1f3e82c07"
branch_labels = None
depends_on = None


def _table_names(bind) -> set[str]:
    return set(inspect(bind).get_table_names())


def _column_names(bind, table: str) -> set[str]:
    return {c["name"] for c in inspect(bind).get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    tables = _table_names(bind)

    # Legacy notifications table (property visit stub) used a `message` column.
    if "notifications" in tables:
        cols = _column_names(bind, "notifications")
        if "message" in cols and "title" not in cols:
            op.drop_table("notifications")
            tables.discard("notifications")

    # ── notifications ──────────────────────────────────────────────────────────
    if "notifications" not in tables:
        op.create_table(
            "notifications",
            sa.Column("id",          sa.Integer(),                            nullable=False),
            sa.Column("user_id",     sa.Integer(),                            nullable=False),
            sa.Column("actor_id",    sa.Integer(),                            nullable=True),
            sa.Column("type",        sa.String(length=60),                    nullable=False),
            sa.Column("title",       sa.String(length=255),                   nullable=False),
            sa.Column("body",        sa.Text(),                               nullable=True),
            sa.Column("link",        sa.String(length=500),                   nullable=True),
            sa.Column("entity_type", sa.String(length=50),                    nullable=True),
            sa.Column("entity_id",   sa.Integer(),                            nullable=True),
            sa.Column("is_read",     sa.Boolean(),    server_default="false", nullable=False),
            sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"],  ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_notifications_id",       "notifications", ["id"],       unique=False)
        op.create_index("ix_notifications_user_id",  "notifications", ["user_id"],  unique=False)
        op.create_index("ix_notifications_type",     "notifications", ["type"],     unique=False)
        op.create_index("ix_notifications_is_read",  "notifications", ["is_read"],  unique=False)
        op.create_index("ix_notifications_created",  "notifications", ["created_at"], unique=False)

    # ── conversations ──────────────────────────────────────────────────────────
    if "conversations" not in tables:
        op.create_table(
        "conversations",
        sa.Column("id",               sa.Integer(),                nullable=False),
        sa.Column("startup_id",       sa.Integer(),                nullable=True),
        sa.Column("investor_id",      sa.Integer(),                nullable=False),
        sa.Column("founder_id",       sa.Integer(),                nullable=False),
        sa.Column("subject",          sa.String(length=255),       nullable=True),
        sa.Column("last_message_at",  sa.DateTime(timezone=True),  nullable=True),
        sa.Column("investor_deleted", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("founder_deleted",  sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at",       sa.DateTime(timezone=True),  server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["founder_id"],  ["users.id"],            ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["investor_id"], ["users.id"],            ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["startup_id"],  ["startup_profiles.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("startup_id", "investor_id", name="uq_conversation_startup_investor"),
        )
        op.create_index("ix_conversations_id",          "conversations", ["id"],          unique=False)
        op.create_index("ix_conversations_startup_id",  "conversations", ["startup_id"],  unique=False)
        op.create_index("ix_conversations_investor_id", "conversations", ["investor_id"], unique=False)
        op.create_index("ix_conversations_founder_id",  "conversations", ["founder_id"],  unique=False)

    # ── messages ───────────────────────────────────────────────────────────────
    if "messages" not in tables:
        op.create_table(
        "messages",
        sa.Column("id",              sa.Integer(),               nullable=False),
        sa.Column("conversation_id", sa.Integer(),               nullable=False),
        sa.Column("sender_id",       sa.Integer(),               nullable=False),
        sa.Column("body",            sa.Text(),                  nullable=False),
        sa.Column("attachment_url",  sa.String(length=500),      nullable=True),
        sa.Column("attachment_name", sa.String(length=255),      nullable=True),
        sa.Column("is_read",         sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_deleted",      sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at",      sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"],       ["users.id"],         ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_messages_id",              "messages", ["id"],              unique=False)
        op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"], unique=False)
        op.create_index("ix_messages_sender_id",       "messages", ["sender_id"],       unique=False)
        op.create_index("ix_messages_created_at",      "messages", ["created_at"],      unique=False)

    # ── crm_leads ──────────────────────────────────────────────────────────────
    if "crm_leads" not in tables:
        op.create_table(
        "crm_leads",
        sa.Column("id",              sa.Integer(),              nullable=False),
        sa.Column("startup_id",      sa.Integer(),              nullable=False),
        sa.Column("investor_id",     sa.Integer(),              nullable=False),
        sa.Column("founder_id",      sa.Integer(),              nullable=False),
        sa.Column("status",          sa.String(length=50),      server_default="new_lead", nullable=False),
        sa.Column("interest_level",  sa.String(length=20),      nullable=True),
        sa.Column("estimated_value", sa.Float(),                nullable=True),
        sa.Column("notes",           sa.Text(),                 nullable=True),
        sa.Column("conversation_id", sa.Integer(),              nullable=True),
        sa.Column("source",          sa.String(length=50),      server_default="interest_expression", nullable=False),
        sa.Column("assigned_to",     sa.Integer(),              nullable=True),
        sa.Column("created_at",      sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at",      sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["assigned_to"],     ["users.id"],            ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"],    ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["founder_id"],      ["users.id"],            ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["investor_id"],     ["users.id"],            ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["startup_id"],      ["startup_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("startup_id", "investor_id", name="uq_crm_lead_startup_investor"),
        )
        op.create_index("ix_crm_leads_id",         "crm_leads", ["id"],         unique=False)
        op.create_index("ix_crm_leads_startup_id", "crm_leads", ["startup_id"], unique=False)
        op.create_index("ix_crm_leads_founder_id", "crm_leads", ["founder_id"], unique=False)
        op.create_index("ix_crm_leads_status",     "crm_leads", ["status"],     unique=False)
        op.create_index("ix_crm_leads_created_at", "crm_leads", ["created_at"], unique=False)

    # ── crm_activities ─────────────────────────────────────────────────────────
    if "crm_activities" not in tables:
        op.create_table(
        "crm_activities",
        sa.Column("id",          sa.Integer(),              nullable=False),
        sa.Column("lead_id",     sa.Integer(),              nullable=False),
        sa.Column("actor_id",    sa.Integer(),              nullable=True),
        sa.Column("action",      sa.String(length=100),     nullable=False),
        sa.Column("from_status", sa.String(length=50),      nullable=True),
        sa.Column("to_status",   sa.String(length=50),      nullable=True),
        sa.Column("note",        sa.Text(),                 nullable=True),
        sa.Column("metadata",    sa.JSON(),                 nullable=True),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"],    ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["lead_id"],  ["crm_leads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_crm_activities_id",         "crm_activities", ["id"],         unique=False)
        op.create_index("ix_crm_activities_lead_id",    "crm_activities", ["lead_id"],    unique=False)
        op.create_index("ix_crm_activities_created_at", "crm_activities", ["created_at"], unique=False)

    # ── crm_reminders ──────────────────────────────────────────────────────────
    if "crm_reminders" not in tables:
        op.create_table(
        "crm_reminders",
        sa.Column("id",         sa.Integer(),              nullable=False),
        sa.Column("lead_id",    sa.Integer(),              nullable=False),
        sa.Column("owner_id",   sa.Integer(),              nullable=False),
        sa.Column("title",      sa.String(length=255),     nullable=False),
        sa.Column("due_at",     sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_done",    sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["lead_id"],  ["crm_leads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"],     ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_crm_reminders_id",      "crm_reminders", ["id"],      unique=False)
        op.create_index("ix_crm_reminders_lead_id", "crm_reminders", ["lead_id"], unique=False)
        op.create_index("ix_crm_reminders_due_at",  "crm_reminders", ["due_at"],  unique=False)


def downgrade() -> None:
    op.drop_table("crm_reminders")
    op.drop_table("crm_activities")
    op.drop_table("crm_leads")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("notifications")
