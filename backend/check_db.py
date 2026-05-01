import psycopg2

conn = psycopg2.connect("postgresql://postgres:Hethu%40123@127.0.0.1:5432/blackspire")
cur = conn.cursor()

# Check current enum values
cur.execute("SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'propertytype' ORDER BY e.enumsortorder")
print("PropertyType values:", [r[0] for r in cur.fetchall()])

cur.execute("SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'propertystatus' ORDER BY e.enumsortorder")
print("PropertyStatus values:", [r[0] for r in cur.fetchall()])

cur.execute("SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'approvaltype' ORDER BY e.enumsortorder")
print("ApprovalType values:", [r[0] for r in cur.fetchall()])

# Now test inserting a property
cur2 = conn.cursor()
cur2.execute("SELECT id, email, role FROM users WHERE email = 'yaswanthparimi53@gmail.com'")
row = cur2.fetchone()
if row:
    print(f"\nSeller found: id={row[0]}, email={row[1]}, role={row[2]}")
else:
    print("\nSeller NOT FOUND in DB!")

cur.close()
conn.close()
