
import os
from sqlalchemy import create_engine, inspect
from app.core.config import settings

def debug():
    print(f"DATABASE_URL: {settings.DATABASE_URL[:20]}...")
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    
    tables = inspector.get_table_names()
    print(f"Tables: {tables}")
    
    if 'users' in tables:
        columns = [c['name'] for c in inspector.get_columns('users')]
        print(f"Columns in 'users': {columns}")
        
        needed = ['reset_otp_hash', 'reset_otp_expires_at', 'reset_otp_attempts']
        missing = [n for n in needed if n not in columns]
        print(f"Missing columns: {missing}")
    else:
        print("Table 'users' NOT FOUND!")

    if 'alembic_version' in tables:
        with engine.connect() as conn:
            from sqlalchemy import text
            res = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
            print(f"Alembic Version in DB: {res[0] if res else 'Empty'}")

if __name__ == "__main__":
    debug()
