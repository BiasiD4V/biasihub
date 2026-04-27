import urllib.request, json

key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o"

headers = {
    "Authorization": f"Bearer {key}",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

# Try Management API
url = "https://api.supabase.com/v1/projects/vzaabtzcilyoknksvhrc"
req = urllib.request.Request(url, headers=headers)
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    print("SUCCESS!")
    print(json.dumps(data, indent=2)[:1000])
except Exception as e:
    code = getattr(e, "code", "?")
    body = ""
    if hasattr(e, "read"):
        body = e.read().decode()[:300]
    print(f"FAIL: {code}: {body}")
    
# Also try running SQL via Management API
print("\n--- Trying SQL endpoint ---")
sql_url = "https://api.supabase.com/v1/projects/vzaabtzcilyoknksvhrc/database/query"
sql_body = json.dumps({"query": "SELECT 1 as test"}).encode()
req2 = urllib.request.Request(sql_url, data=sql_body, headers={**headers, "Content-Type": "application/json"}, method="POST")
try:
    resp2 = urllib.request.urlopen(req2)
    print(f"SQL SUCCESS: {resp2.read().decode()[:300]}")
except Exception as e:
    code = getattr(e, "code", "?")
    body = ""
    if hasattr(e, "read"):
        body = e.read().decode()[:300]
    print(f"SQL FAIL: {code}: {body}")
