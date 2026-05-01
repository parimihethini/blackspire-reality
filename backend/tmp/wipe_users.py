import psycopg2

def wipe_users():
    try:
        conn = psycopg2.connect("postgresql://postgres:Hethu%40123@127.0.0.1:5432/blackspire")
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
