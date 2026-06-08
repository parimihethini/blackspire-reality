"""
One-time migration script to add new enum values to PostgreSQL.
The database URL is read from the DATABASE_URL environment variable.

Required env vars (add to backend/.env for local use):
  DATABASE_URL=postgresql://user:pass@host:port/dbname
"""
import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    raise SystemExit(
        "ERROR: DATABASE_URL must be set in the environment.\n"
        "Add it to backend/.env — never hardcode credentials in source files."
    )

conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

# Add new enum values to propertytype enum in postgres
new_types = [
    "studio", "penthouse", "duplex", "agricultural", "farm",
    "office", "shop", "building", "warehouse", "industrial",
    "coworking", "coliving", "resort",
]

for t in new_types:
    try:
        cur.execute(f"ALTER TYPE propertytype ADD VALUE IF NOT EXISTS '{t}'")
        print(f"Added: {t}")
    except Exception as e:
        print(f"Skip {t}: {e}")

# Add Under Negotiation to propertystatus
try:
    cur.execute("ALTER TYPE propertystatus ADD VALUE IF NOT EXISTS 'Under Negotiation'")
    print("Added: Under Negotiation status")
except Exception as e:
    print(f"Skip Under Negotiation: {e}")

cur.close()
conn.close()
print("Migration DONE")
