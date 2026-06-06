import os

import psycopg2


def wipe_users() -> None:
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/blackspire")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        print("Wiping user and dependent tables...")
        cur.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE;")
        conn.commit()
        print("Success: All users and linked data cleared.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error wiping users: {e}")


if __name__ == "__main__":
    wipe_users()
