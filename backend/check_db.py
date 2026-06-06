import os

import psycopg2

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/blackspire")
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT version()")
print(cur.fetchone())
conn.close()

cur2 = conn.cursor()
cur2.execute("SELECT id, email, role FROM users LIMIT 5")
for row in cur2.fetchall():
    print(row)
