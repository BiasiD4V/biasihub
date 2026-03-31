-- =====================================================
-- BIASI HUB - MIGRAÇÃO COMPLETA: Colunas + Tabelas
-- Execute TODO este SQL no Supabase SQL Editor
-- =====================================================

-- 1. ADICIONAR COLUNAS FALTANTES NA TABELA PROPOSTAS
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS etapa_funil text;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS resultado_comercial text;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS chance_fechamento text;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS urgencia text;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS proxima_acao text;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS data_proxima_acao text;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS ultima_interacao text;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS observacao_comercial text;

-- 2. CRIAR TABELA MUDANCAS DE ETAPA
CREATE TABLE IF NOT EXISTS public.mudancas_etapa (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  etapa_anterior text,
  etapa_nova text NOT NULL,
  responsavel text NOT NULL DEFAULT '',
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- 3. CRIAR TABELA FOLLOW-UPS
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

-- 4. RLS (Row Level Security)
ALTER TABLE public.mudancas_etapa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES (acesso total para authenticated e anon)
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

-- 6. GRANTS
GRANT ALL ON public.mudancas_etapa TO anon, authenticated;
GRANT ALL ON public.follow_ups TO anon, authenticated;

-- 7. NOTIFY PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- PRONTO! Agora o app vai funcionar corretamente.
