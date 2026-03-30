import urllib.request, json

key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o"

endpoints = [
    "https://api.supabase.com/v1/projects/vzaabtzcilyoknksvhrc",
    "https://api.supabase.com/platform/projects/vzaabtzcilyoknksvhrc",
]

for ep in endpoints:
    req = urllib.request.Request(ep, headers={"Authorization": f"Bearer {key}"})
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode())
        print(f"SUCCESS: {ep}")
        region = data.get("region", "unknown")
        print(f"Region: {region}")
        print(json.dumps(data, indent=2)[:800])
    except Exception as e:
        code = getattr(e, "code", "?")
        body = ""
        if hasattr(e, "read"):
            body = e.read().decode()[:200]
        print(f"FAIL: {ep} -> {code}: {body}")
