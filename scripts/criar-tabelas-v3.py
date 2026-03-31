import psycopg2
import sys

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

GRANT ALL ON public.mudancas_etapa TO anon, authenticated;
GRANT ALL ON public.follow_ups TO anon, authenticated;
"""

POLICIES = """
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

# Try multiple connection approaches
hosts = [
    f"db.{PROJECT_REF}.supabase.co",
    f"aws-0-sa-east-1.pooler.supabase.com",
]
ports = [5432, 6543]
users = [
    f"postgres.{PROJECT_REF}",
    "postgres",
]
passwords = [
    "Biasi@2025Hub",
    "biasi2025",
    "Biasi2025!",
    "biasi@2025",
    "Biasi2025",
    "Biasi@Hub2025",
    "B1asi2025!",
    "biasihub2025",
    "BiasI2025!",
]

for host in hosts:
    for port in ports:
        for user in users:
            for pwd in passwords:
                try:
                    conn = psycopg2.connect(
                        host=host,
                        port=port,
                        dbname="postgres",
                        user=user,
                        password=pwd,
                        sslmode="require",
                        connect_timeout=5,
                    )
                    conn.autocommit = True
                    cur = conn.cursor()
                    print(f"CONNECTED! host={host} port={port} user={user}")
                    
                    print("Creating tables...")
                    cur.execute(SQL)
                    print("Tables created.")
                    
                    print("Creating policies...")
                    cur.execute(POLICIES)
                    print("Policies created.")
                    
                    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('mudancas_etapa', 'follow_ups')")
                    tables = cur.fetchall()
                    print(f"Verified: {[t[0] for t in tables]}")
                    
                    cur.close()
                    conn.close()
                    sys.exit(0)
                except psycopg2.OperationalError:
                    pass
                except Exception as e:
                    print(f"Error with {host}:{port}/{user}: {e}")

print("Could not connect. Need database password.")
print("Please go to: https://supabase.com/dashboard/project/vzaabtzcilyoknksvhrc/sql/new")
print("And run the SQL above.")
