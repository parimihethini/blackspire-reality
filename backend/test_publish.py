import urllib.request, json, urllib.error

# Login first
data = json.dumps({'email': 'yaswanthparimi53@gmail.com', 'password': 'Yashu@123', 'role': 'seller'}).encode()
req = urllib.request.Request('http://localhost:8000/auth/login', data=data, headers={'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    token = result.get('access_token', '')
    print(f"Logged in as: {result['user']['email']} (role={result['user']['role']})")
    print(f"Token length: {len(token)}")

# Test with different property types
for ptype in ['plot', 'apartment', 'house', 'studio', 'office']:
    prop_data = json.dumps({
        'title': f'Test {ptype} property',
        'type': ptype,
        'price': 5000000,
        'city': 'Chennai',
        'state': 'Tamil Nadu',
        'country': 'India',
        'pincode': '600001',
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
            print(f"  Type '{ptype}': SUCCESS - Property ID: {presult.get('id')}")
            # cleanup
            del_req = urllib.request.Request(
                f"http://localhost:8000/properties/{presult['id']}", 
                headers={'Authorization': 'Bearer ' + token}, 
                method='DELETE'
            )
            try:
                urllib.request.urlopen(del_req)
                print(f"    Cleaned up ID {presult['id']}")
            except:
                pass
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        print(f"  Type '{ptype}': FAILED {e.code} - {body[:300]}")
