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

# Securely log the database connection details at runtime (password masked)
from urllib.parse import urlparse
try:
    parsed_url = urlparse(settings.DATABASE_URL)
    password_len = len(parsed_url.password) if parsed_url.password else 0
    port_str = f":{parsed_url.port}" if parsed_url.port else ""
    masked_url = f"{parsed_url.scheme}://{parsed_url.username}:{'*' * password_len}@{parsed_url.hostname}{port_str}{parsed_url.path}"
    print(f"[DB] Initialized engine with URL: {masked_url}")
except Exception as e:
    print(f"[DB] Error parsing DATABASE_URL for logging: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
