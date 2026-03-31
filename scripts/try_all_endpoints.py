"""
Try EVERY possible way to execute DDL SQL on Supabase.
"""
import urllib.request
import json
import ssl

KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o"
REF = "vzaabtzcilyoknksvhrc"
BASE = f"https://{REF}.supabase.co"

SQL = "SELECT 1 as test"

ctx = ssl.create_default_context()

endpoints = [
    ("POST", f"{BASE}/pg-meta/default/query", {"query": SQL}),
    ("POST", f"{BASE}/pg/query", {"query": SQL}),
    ("POST", f"{BASE}/pg-meta/query", {"query": SQL}),
    ("POST", f"{BASE}/rest/v1/rpc/exec_ddl", {"sql": SQL}),
    ("POST", f"{BASE}/functions/v1/sql", {"query": SQL}),
    ("POST", f"{BASE}/graphql/v1", {"query": "{ __typename }"}),
    ("GET",  f"{BASE}/pg-meta/default/tables", None),
    ("GET",  f"{BASE}/pg/tables", None),
]

headers_base = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
    "X-Connection-Encrypted": "true",
}

for method, url, body in endpoints:
    try:
        data = json.dumps(body).encode() if body else None
        req = urllib.request.Request(url, data=data, headers=headers_base, method=method)
        resp = urllib.request.urlopen(req, context=ctx, timeout=10)
        result = resp.read().decode()[:300]
        print(f"OK  {method} {url.replace(BASE,'')} -> {resp.status}: {result}")
    except Exception as e:
        code = getattr(e, "code", "?")
        body_resp = ""
        if hasattr(e, "read"):
            try:
                body_resp = e.read().decode()[:200]
            except:
                pass
        print(f"ERR {method} {url.replace(BASE,'')} -> {code}: {body_resp}")
