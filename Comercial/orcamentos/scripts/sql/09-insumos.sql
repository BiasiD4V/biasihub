-- ══════════════════════════════════════════════════════════
-- TABELAS DE INSUMOS + HISTÓRICO DE PREÇOS
-- ══════════════════════════════════════════════════════════

-- 1. Tabela principal de insumos (catálogo)
CREATE TABLE IF NOT EXISTS insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'PÇ',
  fornecedor TEXT,
  grupo TEXT,
  custo_atual NUMERIC(14,2) DEFAULT 0,
  data_ultimo_preco TIMESTAMPTZ,
  observacao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Histórico de preços (cada cotação/atualização)
CREATE TABLE IF NOT EXISTS insumos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  custo NUMERIC(14,2) NOT NULL,
  fornecedor TEXT,
  data_cotacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  origem TEXT DEFAULT 'manual',
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_insumos_fornecedor ON insumos(fornecedor);
CREATE INDEX IF NOT EXISTS idx_insumos_descricao ON insumos USING gin(to_tsvector('portuguese', descricao));
CREATE INDEX IF NOT EXISTS idx_insumos_historico_insumo ON insumos_historico(insumo_id);
CREATE INDEX IF NOT EXISTS idx_insumos_historico_data ON insumos_historico(data_cotacao DESC);

-- RLS
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insumos_read" ON insumos FOR SELECT USING (TRUE);
CREATE POLICY "insumos_write" ON insumos FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "insumos_historico_read" ON insumos_historico FOR SELECT USING (TRUE);
CREATE POLICY "insumos_historico_write" ON insumos_historico FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- View com dias_sem_atualizar calculado
CREATE OR REPLACE VIEW insumos_view AS
SELECT *,
  EXTRACT(DAY FROM NOW() - COALESCE(data_ultimo_preco, created_at))::INTEGER AS dias_sem_atualizar
FROM insumos;
