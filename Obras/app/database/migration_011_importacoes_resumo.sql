-- ============================================================
-- Migration 011: Adiciona colunas de detalhamento ao log de sync
-- Necessário para que o histórico mostre requests usados e resumo
-- por módulo na tela Integração Sienge.
-- ============================================================

ALTER TABLE importacoes_sienge
  ADD COLUMN IF NOT EXISTS resumo          JSONB    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requests_usados INTEGER  DEFAULT 0;

COMMENT ON COLUMN importacoes_sienge.resumo
  IS 'Detalhamento por módulo: { obras: { total, importados, remoto, modo }, ... }';

COMMENT ON COLUMN importacoes_sienge.requests_usados
  IS 'Total de requests HTTP usados na execução (budget máximo = 90)';
