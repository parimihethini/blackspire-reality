from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

connect_args = {}
if "supabase" in settings.DATABASE_URL:
    connect_args["sslmode"] = "require"

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args,
    # Render free tier: keep pool small to minimise memory and connection overhead.
    # 3 persistent + 7 overflow = 10 max simultaneous connections (sufficient for low traffic).
    pool_size=3,
    max_overflow=7,
    pool_timeout=30,
    pool_recycle=1800,  # recycle connections every 30 min to prevent stale connections
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
