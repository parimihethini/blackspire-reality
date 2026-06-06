import os

import psycopg2

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/blackspire")
conn = psycopg2.connect(db_url)
cur = conn.cursor()
print("Connected for enum migration checks")
conn.close()
