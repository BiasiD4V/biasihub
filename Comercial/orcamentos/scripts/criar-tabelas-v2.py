import urllib.request
import json

# Supabase Management API uses project ref + service role
PROJECT_REF = "vzaabtzcilyoknksvhrc"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o"

# Use the pg-meta endpoint which is available on all supabase projects
# The URL format is: https://<project_ref>.supabase.co/pg/query
# But we need to use the direct database connection approach

# Alternative: use supabase-js admin client to run raw SQL via pg
# The simplest approach is to use the Supabase SQL query endpoint

headers = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "apikey": SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
}

SQL = """
-- Create mudancas_etapa table
CREATE TABLE IF NOT EXISTS public.mudancas_etapa (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  etapa_anterior text,
  etapa_nova text NOT NULL,
  responsavel text NOT NULL DEFAULT '',
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- Create follow_ups table
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

-- Enable RLS
ALTER TABLE public.mudancas_etapa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now - anon key access)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mudancas_etapa' AND policyname='mudancas_etapa_all') THEN
    CREATE POLICY mudancas_etapa_all ON public.mudancas_etapa FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follow_ups' AND policyname='follow_ups_all') THEN
    CREATE POLICY follow_ups_all ON public.follow_ups FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Grant access
GRANT ALL ON public.mudancas_etapa TO anon, authenticated;
GRANT ALL ON public.follow_ups TO anon, authenticated;
"""

# Try pg endpoint
url = f"https://{PROJECT_REF}.supabase.co/pg/query"
body = json.dumps({"query": SQL}).encode()
req = urllib.request.Request(url, data=body, headers=headers, method="POST")
try:
    resp = urllib.request.urlopen(req)
    print(f"pg/query success: {resp.read().decode()}")
except urllib.error.HTTPError as e:
    resp_body = e.read().decode()
    print(f"pg/query error {e.code}: {resp_body}")
    
    # Try alternative: /rest/v1/rpc approach - first create the function
    print("\nTrying alternative: create exec_sql function first...")
    
    create_fn_sql = """
    CREATE OR REPLACE FUNCTION public.exec_sql(query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
      EXECUTE query;
    END;
    $func$;
    """
    
    # We can't create the function without SQL access either...
    # Let's try the database connection string approach
    print("Cannot create tables via REST API alone.")
    print("Please run this SQL in the Supabase Dashboard SQL Editor:")
    print("=" * 60)
    print(SQL)
    print("=" * 60)
