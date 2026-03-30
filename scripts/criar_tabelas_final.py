import psycopg2
import sys

SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o"
PROJECT_REF = "vzaabtzcilyoknksvhrc"

SQL = """
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

ALTER TABLE public.mudancas_etapa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mudancas_etapa_all') THEN
    CREATE POLICY mudancas_etapa_all ON public.mudancas_etapa FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'follow_ups_all') THEN
    CREATE POLICY follow_ups_all ON public.follow_ups FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON public.mudancas_etapa TO anon, authenticated;
GRANT ALL ON public.follow_ups TO anon, authenticated;
"""

# Try different connection methods
connection_configs = [
    # Pooler with JWT as password (Supavisor supports this)
    {
        "host": f"aws-0-sa-east-1.pooler.supabase.com",
        "port": 6543,
        "user": f"postgres.{PROJECT_REF}",
        "password": SERVICE_ROLE_KEY,
        "dbname": "postgres",
        "sslmode": "require",
        "connect_timeout": 10,
    },
    # Pooler session mode port 5432
    {
        "host": f"aws-0-sa-east-1.pooler.supabase.com",
        "port": 5432,
        "user": f"postgres.{PROJECT_REF}",
        "password": SERVICE_ROLE_KEY,
        "dbname": "postgres",
        "sslmode": "require",
        "connect_timeout": 10,
    },
    # Direct connection with JWT
    {
        "host": f"db.{PROJECT_REF}.supabase.co",
        "port": 5432,
        "user": "postgres",
        "password": SERVICE_ROLE_KEY,
        "dbname": "postgres",
        "sslmode": "require",
        "connect_timeout": 10,
    },
    # US-East pooler
    {
        "host": f"aws-0-us-east-1.pooler.supabase.com",
        "port": 6543,
        "user": f"postgres.{PROJECT_REF}",
        "password": SERVICE_ROLE_KEY,
        "dbname": "postgres",
        "sslmode": "require",
        "connect_timeout": 10,
    },
    # US-West pooler
    {
        "host": f"aws-0-us-west-1.pooler.supabase.com",
        "port": 6543,
        "user": f"postgres.{PROJECT_REF}",
        "password": SERVICE_ROLE_KEY,
        "dbname": "postgres",
        "sslmode": "require",
        "connect_timeout": 10,
    },
]

connected = False
for i, cfg in enumerate(connection_configs):
    desc = f"{cfg['host']}:{cfg['port']} user={cfg['user']}"
    print(f"\n[{i+1}/{len(connection_configs)}] Trying: {desc}")
    try:
        conn = psycopg2.connect(**cfg)
        conn.autocommit = True
        print(f"  CONNECTED!")
        connected = True
        
        cur = conn.cursor()
        cur.execute(SQL)
        print("  Tables created successfully!")
        
        # Verify
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('mudancas_etapa','follow_ups')")
        tables = [r[0] for r in cur.fetchall()]
        print(f"  Verified tables: {tables}")
        
        cur.close()
        conn.close()
        break
    except Exception as e:
        err = str(e).strip().split('\n')[0]
        print(f"  Failed: {err}")

if not connected:
    print("\n\nCould not connect with any method.")
    print("Please run the SQL manually in Supabase Dashboard SQL Editor.")
    sys.exit(1)
else:
    print("\n\nDONE! Tables created and ready.")
    sys.exit(0)
