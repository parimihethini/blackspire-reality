"""create_startup_ecosystem

Revision ID: c4e8f1a23b05
Revises: a3f8b2c91d04
Create Date: 2026-06-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "c4e8f1a23b05"
down_revision: Union[str, None] = "a3f8b2c91d04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("startup_profiles"):
        op.create_table(
            "startup_profiles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("founder_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("logo_url", sa.String(length=500), nullable=True),
            sa.Column("founder_name", sa.String(length=150), nullable=True),
            sa.Column("co_founder_name", sa.String(length=150), nullable=True),
            sa.Column("industry_id", sa.Integer(), nullable=True),
            sa.Column("stage_id", sa.Integer(), nullable=True),
            sa.Column("revenue", sa.Float(), nullable=True),
            sa.Column("team_size", sa.Integer(), nullable=True),
            sa.Column("funding_requirement", sa.Float(), nullable=True),
            sa.Column("funding_raised", sa.Float(), nullable=True),
            sa.Column("valuation", sa.Float(), nullable=True),
            sa.Column("website", sa.String(length=255), nullable=True),
            sa.Column("linkedin_url", sa.String(length=255), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("problem_statement", sa.Text(), nullable=True),
            sa.Column("solution", sa.Text(), nullable=True),
            sa.Column("target_market", sa.Text(), nullable=True),
            sa.Column("business_model", sa.Text(), nullable=True),
            sa.Column("location", sa.String(length=255), nullable=True),
            sa.Column("country", sa.String(length=100), nullable=True),
            sa.Column("pitch_deck_url", sa.String(length=500), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="draft"),
            sa.Column("verification_status", sa.String(length=50), nullable=False, server_default="unverified"),
            sa.Column("views_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("profile_completion", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("deleted_by", sa.Integer(), nullable=True),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("updated_by", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["deleted_by"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["founder_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["industry_id"], ["industries.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["stage_id"], ["stages.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_startup_profiles_founder_id", "startup_profiles", ["founder_id"])
        op.create_index("ix_startup_profiles_name", "startup_profiles", ["name"])
        op.create_index("ix_startup_profiles_industry_id", "startup_profiles", ["industry_id"])
        op.create_index("ix_startup_profiles_stage_id", "startup_profiles", ["stage_id"])
        op.create_index("ix_startup_profiles_country", "startup_profiles", ["country"])
        op.create_index("ix_startup_profiles_status", "startup_profiles", ["status"])
        op.create_index("ix_startup_profiles_verification_status", "startup_profiles", ["verification_status"])
        op.create_index("ix_startup_profiles_is_deleted", "startup_profiles", ["is_deleted"])
        op.create_index("ix_startup_profiles_funding_requirement", "startup_profiles", ["funding_requirement"])
        op.create_index("ix_startup_profiles_revenue", "startup_profiles", ["revenue"])
        op.create_index("ix_startup_profiles_team_size", "startup_profiles", ["team_size"])

    if not inspector.has_table("startup_saves"):
        op.create_table(
            "startup_saves",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("investor_id", sa.Integer(), nullable=False),
            sa.Column("startup_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.ForeignKeyConstraint(["investor_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["startup_id"], ["startup_profiles.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("investor_id", "startup_id", name="uq_startup_save_investor_startup"),
        )
        op.create_index("ix_startup_saves_investor_id", "startup_saves", ["investor_id"])
        op.create_index("ix_startup_saves_startup_id", "startup_saves", ["startup_id"])

    if not inspector.has_table("startup_deck_requests"):
        op.create_table(
            "startup_deck_requests",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("investor_id", sa.Integer(), nullable=False),
            sa.Column("startup_id", sa.Integer(), nullable=False),
            sa.Column("message", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["investor_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["startup_id"], ["startup_profiles.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_startup_deck_requests_investor_id", "startup_deck_requests", ["investor_id"])
        op.create_index("ix_startup_deck_requests_startup_id", "startup_deck_requests", ["startup_id"])

    if not inspector.has_table("startup_contact_requests"):
        op.create_table(
            "startup_contact_requests",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("investor_id", sa.Integer(), nullable=False),
            sa.Column("startup_id", sa.Integer(), nullable=False),
            sa.Column("subject", sa.String(length=255), nullable=True),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["investor_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["startup_id"], ["startup_profiles.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_startup_contact_requests_investor_id", "startup_contact_requests", ["investor_id"])
        op.create_index("ix_startup_contact_requests_startup_id", "startup_contact_requests", ["startup_id"])

    if not inspector.has_table("startup_interest_expressions"):
        op.create_table(
            "startup_interest_expressions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("investor_id", sa.Integer(), nullable=False),
            sa.Column("startup_id", sa.Integer(), nullable=False),
            sa.Column("interest_level", sa.String(length=20), nullable=False, server_default="medium"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="active"),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["investor_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["startup_id"], ["startup_profiles.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("investor_id", "startup_id", name="uq_startup_interest_investor_startup"),
        )
        op.create_index("ix_startup_interest_expressions_investor_id", "startup_interest_expressions", ["investor_id"])
        op.create_index("ix_startup_interest_expressions_startup_id", "startup_interest_expressions", ["startup_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    for table in (
        "startup_interest_expressions",
        "startup_contact_requests",
        "startup_deck_requests",
        "startup_saves",
        "startup_profiles",
    ):
        if inspector.has_table(table):
            op.drop_table(table)
