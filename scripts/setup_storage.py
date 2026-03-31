import requests, json

url = 'https://vzaabtzcilyoknksvhrc.supabase.co'
project_ref = 'vzaabtzcilyoknksvhrc'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o'
anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjQyNDYsImV4cCI6MjA5MDEwMDI0Nn0.L0nCAztRmHFTaJAoT22P_Y5eHUNG9-HStY3it1nSq1U'

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
}

# First create an RPC function that can execute arbitrary SQL
print('--- Creating exec_sql function ---')
create_fn_sql = """
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
"""

# Use the Supabase SQL endpoint (service_role can use it)
# Since we can't use RPC, try to use the postgrest approach with a function first
# Let's try a creative approach: insert into a temp table via postgrest

# Actually, let's use the supabase-py client to run SQL
from supabase import create_client
sb = create_client(url, key)

# Create the exec_sql function first
print('Trying to create exec_sql function via supabase-py...')
try:
    result = sb.rpc('exec_sql', {'query': 'SELECT 1'}).execute()
    print(f'exec_sql already exists: {result}')
except Exception as e:
    print(f'exec_sql not found, need to create: {e}')

# Let's try using postgrest to create the function
# Actually the simplest approach: use direct Postgres connection via supabase-py
# But supabase-py doesn't support raw SQL.

# Alternative: use the Management API
print('\n--- Trying Management API SQL endpoint ---')
mgmt_headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
}

# The Supabase SQL API endpoint:
sql_endpoint = f'https://{project_ref}.supabase.co/rest/v1/'

# Actually let's try to use database functions approach
# Create the policies by using the supabase admin client
print('\n--- Creating policies via supabase admin ---')

# Try creating RPC function first, then call it to create policies
# Use raw HTTP to postgres endpoint (which is what supabase studio uses)

# Actually the simplest: use psycopg2 or similar to connect directly
# But we don't have db password. Service role key IS the auth.

# Let me try the undocumented /sql endpoint
sql_url = f'{url}/pg/sql'
for sql_text in [
    "CREATE POLICY IF NOT EXISTS auth_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'anexos')",
    "CREATE POLICY IF NOT EXISTS auth_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'anexos')",
    "CREATE POLICY IF NOT EXISTS auth_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'anexos')",
    "CREATE POLICY IF NOT EXISTS public_read ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'anexos')",
]:
    r = requests.post(sql_url, headers=mgmt_headers, json={'query': sql_text})
    print(f'SQL: {r.status_code} - {r.text[:150]}')

# If none of the above works, check alternate endpoints
for path in ['/rest/v1/rpc/query', '/sql', '/admin/sql']:
    r = requests.post(f'{url}{path}', headers=mgmt_headers, json={'query': 'SELECT 1'})
    print(f'{path}: {r.status_code} - {r.text[:80]}')

