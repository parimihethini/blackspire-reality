import sys
import os
sys.path.append(os.getcwd())

try:
    from app.core.security import hash_password, verify_password, pwd_context
    p = "AdminPass123!"
    print(f"Password: {p}, Length: {len(p)}")
    h = hash_password(p)
    print(f"Hash: {h}")
    v = verify_password(p, h)
    print(f"Verify: {v}")
except Exception as e:
    print(f"Security utility failed: {e}")

try:
    import bcrypt
    print(f"Bcrypt library version: {getattr(bcrypt, '__version__', 'unknown')}")
    p_bytes = "AdminPass123!".encode("utf-8")
    salt = bcrypt.gensalt()
    h = bcrypt.hashpw(p_bytes, salt)
    print(f"Direct bcrypt: {h}")
except Exception as e:
    print(f"Direct bcrypt failed: {e}")

try:
    # Test passlib's BCrypt version specifically
    from passlib.handlers.bcrypt import bcrypt as pl_bcrypt
    print(f"Passlib BCrypt backend: {pl_bcrypt.get_backend()}")
except Exception as e:
    print(f"Passlib BCrypt check failed: {e}")
