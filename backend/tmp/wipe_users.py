"""
DANGER: Wipes all users and cascade-deletes all linked data.
The database URL is read from DATABASE_URL — never hardcode it here.

Required env vars (add to backend/.env for local use):
  DATABASE_URL=postgresql://user:pass@host:port/dbname
"""
import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    raise SystemExit(
        "ERROR: DATABASE_URL must be set in the environment.\n"
        "Add it to backend/.env — never hardcode credentials in source files."
    )


def wipe_users():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        print("Wiping user and dependent tables...")
        # TRUNCATE CASCADE is more efficient and handles FKs
        cur.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE;")
        conn.commit()
        print("Success: All users and linked data cleared.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error wiping users: {e}")


if __name__ == "__main__":
    wipe_users()
