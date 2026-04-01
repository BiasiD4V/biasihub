-- ============================================================
-- Migração: Responsáveis Comerciais
-- Execute no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS responsaveis_comerciais (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE responsaveis_comerciais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura autenticada responsaveis_comerciais" ON responsaveis_comerciais;
CREATE POLICY "Leitura autenticada responsaveis_comerciais"
  ON responsaveis_comerciais FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inserção autenticada responsaveis_comerciais" ON responsaveis_comerciais;
CREATE POLICY "Inserção autenticada responsaveis_comerciais"
  ON responsaveis_comerciais FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Update autenticado responsaveis_comerciais" ON responsaveis_comerciais;
CREATE POLICY "Update autenticado responsaveis_comerciais"
  ON responsaveis_comerciais FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Delete autenticado responsaveis_comerciais" ON responsaveis_comerciais;
CREATE POLICY "Delete autenticado responsaveis_comerciais"
  ON responsaveis_comerciais FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS responsaveis_comerciais_nome_idx ON responsaveis_comerciais (nome);
CREATE INDEX IF NOT EXISTS responsaveis_comerciais_ativo_idx ON responsaveis_comerciais (ativo);

INSERT INTO responsaveis_comerciais (nome, ativo) VALUES
  ('ANTONIO', true),
  ('BORGES', true),
  ('BRUNO', true),
  ('HEBER', true),
  ('JAOQIM', true),
  ('JOAQIM', true),
  ('JONH', true),
  ('LUIZ', true),
  ('PAULO', true),
  ('PHILIP', true),
  ('RODRIGO', true),
  ('RODRIGO/HEBER', true)
ON CONFLICT (nome) DO NOTHING;
