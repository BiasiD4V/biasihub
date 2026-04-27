-- ============================================
-- MIGRAÇÃO: Criar tabelas de Mão de Obra
-- ============================================

-- 1. Tabela principal de composições
CREATE TABLE IF NOT EXISTS mao_de_obra_composicoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obra TEXT NOT NULL,
  atividade TEXT NOT NULL,
  jornada INTEGER NOT NULL DEFAULT 8,
  unid TEXT NOT NULL DEFAULT 'm',
  qtd NUMERIC,
  tempo_dias NUMERIC,
  total_hh NUMERIC,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de profissionais (filha da composição)
CREATE TABLE IF NOT EXISTS mao_de_obra_profissionais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  composicao_id UUID NOT NULL REFERENCES mao_de_obra_composicoes(id) ON DELETE CASCADE,
  profissao TEXT NOT NULL DEFAULT '',
  unid TEXT NOT NULL DEFAULT 'H',
  coef NUMERIC,
  hh_total NUMERIC,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Índice para busca por composição
CREATE INDEX IF NOT EXISTS idx_mao_de_obra_profissionais_composicao_id
  ON mao_de_obra_profissionais(composicao_id);

-- 4. Habilitar RLS
ALTER TABLE mao_de_obra_composicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mao_de_obra_profissionais ENABLE ROW LEVEL SECURITY;

-- 5. Políticas permissivas (mesmo padrão do projeto)
CREATE POLICY "Permitir leitura de composicoes MO" ON mao_de_obra_composicoes FOR SELECT USING (true);
CREATE POLICY "Permitir insert de composicoes MO"  ON mao_de_obra_composicoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update de composicoes MO"  ON mao_de_obra_composicoes FOR UPDATE USING (true);
CREATE POLICY "Permitir delete de composicoes MO"  ON mao_de_obra_composicoes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de profissionais MO" ON mao_de_obra_profissionais FOR SELECT USING (true);
CREATE POLICY "Permitir insert de profissionais MO"  ON mao_de_obra_profissionais FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update de profissionais MO"  ON mao_de_obra_profissionais FOR UPDATE USING (true);
CREATE POLICY "Permitir delete de profissionais MO"  ON mao_de_obra_profissionais FOR DELETE USING (true);

-- 6. Confirmar
SELECT 'Migração mao_de_obra concluída com sucesso!' AS resultado;
