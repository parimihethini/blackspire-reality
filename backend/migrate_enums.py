import psycopg2

conn = psycopg2.connect("postgresql://postgres:Hethu%40123@127.0.0.1:5432/blackspire")
conn.autocommit = True
cur = conn.cursor()

# Add new enum values to propertytype enum in postgres
new_types = ['studio', 'penthouse', 'duplex', 'agricultural', 'farm', 'office', 'shop', 'building', 'warehouse', 'industrial', 'coworking', 'coliving', 'resort']

for t in new_types:
    try:
        cur.execute(f"ALTER TYPE propertytype ADD VALUE IF NOT EXISTS '{t}'")
        print(f'Added: {t}')
    except Exception as e:
        print(f'Skip {t}: {e}')

# Add Under Negotiation to propertystatus
try:
    cur.execute("ALTER TYPE propertystatus ADD VALUE IF NOT EXISTS 'Under Negotiation'")
    print('Added: Under Negotiation status')
except Exception as e:
    print(f'Skip Under Negotiation: {e}')

cur.close()
conn.close()
print('Migration DONE')
