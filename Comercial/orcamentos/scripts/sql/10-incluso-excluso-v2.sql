-- ============================================================
-- Migração: Incluso/Excluso v2 — Tabela Interna de Fechamento de Escopo
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Recriar tabela com novo modelo
DROP TABLE IF EXISTS incluso_excluso;

CREATE TABLE incluso_excluso (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  obra             text        NOT NULL DEFAULT '',
  disciplina       text,
  area_ambiente    text,
  item_servico     text        NOT NULL DEFAULT '',
  antes_da_biasi   text,
  o_que_biasi_faz  text,
  onde_faz         text,
  ate_onde_vai     text,
  como_entrega     text,
  quem_entra_depois text,
  o_que_nao_entra  text,
  base_usada       text,
  situacao         text        NOT NULL DEFAULT 'Pendente',
  risco            text        NOT NULL DEFAULT 'Baixo',
  premissa         text,
  pendencia        text,
  responsavel      text,
  criado_em        timestamptz DEFAULT now(),
  atualizado_em    timestamptz DEFAULT now()
);

-- 2. RLS
ALTER TABLE incluso_excluso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura autenticada incluso_excluso" ON incluso_excluso;
CREATE POLICY "Leitura autenticada incluso_excluso"
  ON incluso_excluso FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inserção autenticada incluso_excluso" ON incluso_excluso;
CREATE POLICY "Inserção autenticada incluso_excluso"
  ON incluso_excluso FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Update autenticado incluso_excluso" ON incluso_excluso;
CREATE POLICY "Update autenticado incluso_excluso"
  ON incluso_excluso FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Delete autenticado incluso_excluso" ON incluso_excluso;
CREATE POLICY "Delete autenticado incluso_excluso"
  ON incluso_excluso FOR DELETE TO authenticated USING (true);

-- 3. Índices
CREATE INDEX IF NOT EXISTS incluso_excluso_obra_idx ON incluso_excluso(obra);
CREATE INDEX IF NOT EXISTS incluso_excluso_disciplina_idx ON incluso_excluso(disciplina);
CREATE INDEX IF NOT EXISTS incluso_excluso_situacao_idx ON incluso_excluso(situacao);
