from app.db.session import SessionLocal
from app.models.user import User

def test_db():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if user:
            print(f"DB OK: First user is {user.email}")
        else:
            print("DB OK: No users found")
    except Exception as e:
        print(f"DB ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_db()
