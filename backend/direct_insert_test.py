import sys
sys.path.insert(0, '.')

import traceback
from app.db.session import SessionLocal
from app.models.user import User
from app.models.property import Property, PropertyType, PropertyStatus, ApprovalType

db = SessionLocal()
user = db.query(User).filter(User.email == 'yaswanthparimi53@gmail.com').first()
print('User ID:', user.id, 'email:', user.email)

try:
    prop = Property(
        seller_id=user.id,
        seller_email=user.email,
        title='Test Direct DB Insert',
        type=PropertyType.plot,
        status=PropertyStatus.available,
        approval=ApprovalType.dtcp,
        price=5000000.0,
        city='Chennai',
        state='Tamil Nadu',
        country='India',
        pincode='600001',
        seller_phone='9999999999',
        images=[],
        features=[],
    )
    db.add(prop)
    db.flush()
    print('FLUSH OK, id=', prop.id)
    db.commit()
    db.refresh(prop)
    print('COMMIT OK! Property ID:', prop.id)
    db.delete(prop)
    db.commit()
    print('Deleted test record')
except Exception as e:
    db.rollback()
    traceback.print_exc()
finally:
    db.close()
