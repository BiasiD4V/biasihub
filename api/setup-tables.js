import pg from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    return res.status(500).json({ error: 'SUPABASE_DB_PASSWORD not configured' });
  }

  // Try multiple connection methods
  const configs = [
    {
      name: 'Session pooler (5432)',
      host: 'aws-0-sa-east-1.pooler.supabase.com',
      port: 5432,
      user: 'postgres.vzaabtzcilyoknksvhrc',
    },
    {
      name: 'Transaction pooler (6543)',
      host: 'aws-0-sa-east-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.vzaabtzcilyoknksvhrc',
    },
    {
      name: 'Direct',
      host: 'db.vzaabtzcilyoknksvhrc.supabase.co',
      port: 5432,
      user: 'postgres',
    },
  ];

  let client = null;
  let connName = '';
  const errors = [];

  for (const cfg of configs) {
    try {
      client = new pg.Client({
        host: cfg.host,
        port: cfg.port,
        database: 'postgres',
        user: cfg.user,
        password: dbPassword,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      await client.connect();
      connName = cfg.name;
      break;
    } catch (err) {
      errors.push({ name: cfg.name, error: err.message });
      client = null;
    }
  }

  if (!client) {
    return res.status(500).json({ error: 'All connections failed', details: errors });
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.mudancas_etapa (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
        etapa_anterior text,
        etapa_nova text NOT NULL,
        responsavel text NOT NULL DEFAULT '',
        observacao text,
        arquivo text,
        created_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.follow_ups (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
        tipo text NOT NULL DEFAULT 'observacao',
        data timestamptz NOT NULL DEFAULT now(),
        responsavel text NOT NULL DEFAULT '',
        resumo text NOT NULL DEFAULT '',
        proxima_acao text,
        data_proxima_acao date,
        arquivo text,
        created_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`ALTER TABLE public.mudancas_etapa ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;`);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mudancas_etapa_all') THEN
          CREATE POLICY mudancas_etapa_all ON public.mudancas_etapa FOR ALL USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'follow_ups_all') THEN
          CREATE POLICY follow_ups_all ON public.follow_ups FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `);

    await client.query("NOTIFY pgrst, 'reload schema';");
    await client.end();

    return res.status(200).json({ ok: true, connection: connName, message: 'Tables created' });
  } catch (error) {
    try { await client.end(); } catch {}
    return res.status(500).json({ error: error.message, connection: connName });
  }
}

