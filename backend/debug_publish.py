import urllib.request, json, urllib.error

# Login first
data = json.dumps({'email': 'yaswanthparimi53@gmail.com', 'password': 'Yashu@123', 'role': 'seller'}).encode()
req = urllib.request.Request('http://localhost:8000/auth/login', data=data, headers={'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    token = result.get('access_token', '')

# Test with original 'plot' type only - get FULL error verbose
prop_data = json.dumps({
    'title': 'Test Plot Property Debug',
    'type': 'plot',
    'status': 'Available',
    'approval': 'DTCP',
    'price': 5000000,
    'city': 'Chennai',
    'state': 'Tamil Nadu',
    'country': 'India',
    'pincode': '600001',
    'seller_phone': '9999999999',
    'features': [],
    'images': []
}).encode()

prop_req = urllib.request.Request(
    'http://localhost:8000/properties/', 
    data=prop_data, 
    headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}, 
    method='POST'
)
try:
    with urllib.request.urlopen(prop_req) as presp:
        presult = json.loads(presp.read())
        print(f"SUCCESS! Property ID: {presult.get('id')}, Title: {presult.get('title')}")
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='replace')
    print(f"FAILED HTTP {e.code}:")
    print(f"Body: {body}")
    # Also try to get the reason from headers
    print(f"Headers: {dict(e.headers)}")
