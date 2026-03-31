import pg from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Not configured' });
  }

  // Connect via Supabase's transaction-mode pooler with service_role JWT
  const connectionString = `postgresql://postgres.vzaabtzcilyoknksvhrc:${serviceKey}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;
  
  const client = new pg.Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Create mudancas_etapa table
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

    // Create follow_ups table
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

    // Enable RLS
    await client.query(`ALTER TABLE public.mudancas_etapa ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;`);

    // Create policies
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

    // Notify PostgREST to reload schema cache
    await client.query(`NOTIFY pgrst, 'reload schema';`);

    await client.end();
    return res.status(200).json({ ok: true, message: 'Tables created successfully' });
  } catch (error) {
    try { await client.end(); } catch {}
    console.error('Setup error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create tables' });
  }
}

