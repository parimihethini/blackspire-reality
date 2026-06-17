"""Verify communication/CRM tables and alembic revision."""
import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

TABLES = [
    "notifications",
    "conversations",
    "messages",
    "crm_leads",
    "crm_activities",
    "crm_reminders",
]

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
for t in TABLES:
    cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
        "WHERE table_schema='public' AND table_name=%s)",
        (t,),
    )
    print(f"{t}: {cur.fetchone()[0]}")
cur.execute("SELECT version_num FROM alembic_version")
print("alembic_version:", cur.fetchone()[0])
conn.close()
