"""phase2_investor_indexes

Revision ID: a3f8b2c91d04
Revises: e11cf7ab42a5
Create Date: 2026-06-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "a3f8b2c91d04"
down_revision: Union[str, None] = "e11cf7ab42a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INDEXES = [
    ("ix_investor_profiles_investor_type", ["investor_type"]),
    ("ix_investor_profiles_priority_score", ["priority_score"]),
    ("ix_investor_profiles_is_deleted", ["is_deleted"]),
    ("ix_investor_profiles_ticket_size_min", ["ticket_size_min"]),
    ("ix_investor_profiles_ticket_size_max", ["ticket_size_max"]),
]


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = {idx["name"] for idx in inspector.get_indexes("investor_profiles")}
    for name, columns in _INDEXES:
        if name not in existing:
            op.create_index(name, "investor_profiles", columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = {idx["name"] for idx in inspector.get_indexes("investor_profiles")}
    for name, _ in reversed(_INDEXES):
        if name in existing:
            op.drop_index(name, table_name="investor_profiles")
