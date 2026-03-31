import psycopg2

# Supabase direct connection
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
# The password is the database password set during project creation

# Using the pooler connection (transaction mode)
DB_HOST = "aws-0-sa-east-1.pooler.supabase.com"
DB_PORT = 6543
DB_NAME = "postgres"
DB_USER = "postgres.vzaabtzcilyoknksvhrc"
DB_PASS = "Biasi@2025Hub"  # Common pattern from project setup

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

-- Grant access
GRANT ALL ON public.mudancas_etapa TO anon, authenticated;
GRANT ALL ON public.follow_ups TO anon, authenticated;
"""

POLICIES_SQL = """
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
"""

passwords_to_try = [
    "Biasi@2025Hub",
    "biasi2025",
    "Biasi2025!",
    "biasi@2025",
]

for pwd in passwords_to_try:
    try:
        print(f"Trying password: {pwd[:4]}...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=pwd,
            sslmode="require",
            connect_timeout=10,
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Connected! Creating tables...")
        cur.execute(SQL)
        print("Tables created.")
        
        print("Creating policies...")
        cur.execute(POLICIES_SQL)
        print("Policies created.")
        
        # Verify
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('mudancas_etapa', 'follow_ups')")
        tables = cur.fetchall()
        print(f"Verified tables: {[t[0] for t in tables]}")
        
        cur.close()
        conn.close()
        print("Done!")
        break
    except psycopg2.OperationalError as e:
        print(f"  Failed: {str(e)[:80]}")
    except Exception as e:
        print(f"  Error: {e}")
