import sys
import os
root = r'c:\Users\PHeth\Documents\blackspire'
sys.path.insert(0, root)
from sqlalchemy import text
from app.db.session import engine

with engine.connect() as conn:
    result = conn.execute(text('select id, email, role, is_active, is_verified from users limit 20'))
    for row in result:
        print(dict(row._mapping))
