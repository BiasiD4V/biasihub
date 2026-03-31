import urllib.request
import json

SUPABASE_URL = "https://vzaabtzcilyoknksvhrc.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o"

headers = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "apikey": SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Test: try inserting into mudancas_etapa to see if table exists
def table_exists(name):
    url = f"{SUPABASE_URL}/rest/v1/{name}?select=id&limit=1"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        resp = urllib.request.urlopen(req)
        print(f"Table '{name}' exists. Status: {resp.status}")
        return True
    except urllib.error.HTTPError as e:
        print(f"Table '{name}' check: {e.code} - {e.read().decode()}")
        return False

# Create tables by inserting a test row and seeing if it works
# Actually, we can't create tables via REST API. We need to use the SQL editor.
# But we can use the pg-meta api or create an RPC function.

# Alternative: check if exec_sql rpc exists
def try_rpc_sql(sql):
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    body = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        print(f"RPC success: {resp.read().decode()}")
        return True
    except urllib.error.HTTPError as e:
        print(f"RPC error: {e.code} - {e.read().decode()}")
        return False

print("=== Checking existing tables ===")
table_exists("mudancas_etapa")
table_exists("follow_ups")

print("\n=== Trying to create tables via RPC ===")
sql = """
CREATE TABLE IF NOT EXISTS public.mudancas_etapa (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  etapa_anterior text,
  etapa_nova text NOT NULL,
  responsavel text NOT NULL DEFAULT '',
  observacao text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'observacao',
  data timestamptz NOT NULL DEFAULT now(),
  responsavel text NOT NULL DEFAULT '',
  resumo text NOT NULL DEFAULT '',
  proxima_acao text,
  data_proxima_acao date,
  created_at timestamptz DEFAULT now()
);
"""
try_rpc_sql(sql)

# Check again
print("\n=== Re-checking tables ===")
table_exists("mudancas_etapa")
table_exists("follow_ups")
