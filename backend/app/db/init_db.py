"""Ensure all SQLAlchemy models exist in the database before serving traffic."""

from pathlib import Path

from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine


def _import_all_models() -> None:
    import app.models.user       # noqa: F401
    import app.models.property   # noqa: F401
    import app.models.investment # noqa: F401
    import app.models.review     # noqa: F401
    import app.models.favorite   # noqa: F401
    import app.models.rbac       # noqa: F401
    import app.models.investor   # noqa: F401
    import app.models.startup    # noqa: F401
    import app.models.communication  # noqa: F401
    import app.models.crm            # noqa: F401


def _alembic_version_exists() -> bool:
    with engine.connect() as conn:
        return bool(
            conn.execute(
                text(
                    "SELECT EXISTS ("
                    "  SELECT 1 FROM information_schema.tables "
                    "  WHERE table_schema = 'public' AND table_name = 'alembic_version'"
                    ")"
                )
            ).scalar()
        )


def ensure_schema() -> None:
    """Create missing tables and align Alembic revision state."""
    _import_all_models()

    from alembic import command
    from alembic.config import Config

    backend_root = Path(__file__).resolve().parents[2]
    alembic_cfg = Config(str(backend_root / "alembic.ini"))

    if _alembic_version_exists():
        command.upgrade(alembic_cfg, "head")
        print("[DB] Alembic upgrade head [OK]")
    else:
        command.upgrade(alembic_cfg, "head")
        print("[DB] Fresh database — Alembic migrated to head [OK]")

    # Safety net for models not yet captured in migrations (no-op when schema is current).
    Base.metadata.create_all(bind=engine)
    print("[DB] Schema ensured [OK]")

    from app.db.session import SessionLocal
    from app.db.seed_rbac import seed_rbac

    db = SessionLocal()
    try:
        seed_rbac(db)
    finally:
        db.close()
