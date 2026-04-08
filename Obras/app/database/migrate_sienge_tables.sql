-- CONTRATOS DE SUPRIMENTOS (Sienge supply-contracts)
CREATE TABLE IF NOT EXISTS contratos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id              UUID REFERENCES obras(id) ON DELETE SET NULL,
  sienge_building_id   INTEGER,
  sienge_doc_id        TEXT NOT NULL,
  sienge_contract_num  TEXT NOT NULL,
  fornecedor           TEXT,
  cliente              TEXT,
  responsavel          TEXT,
  objeto               TEXT,
  status               TEXT DEFAULT 'em_andamento',
  aprovacao            TEXT DEFAULT 'pendente',
  data_contrato        DATE,
  data_inicio          DATE,
  data_fim             DATE,
  valor_mao_obra       NUMERIC(15,2) DEFAULT 0,
  valor_material       NUMERIC(15,2) DEFAULT 0,
  valor_total          NUMERIC(15,2) DEFAULT 0,
  tipo_contrato        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sienge_doc_id, sienge_contract_num)
);
CREATE INDEX IF NOT EXISTS idx_contratos_obra ON contratos(obra_id);

-- MEDIÇÕES DE CONTRATO (Sienge supply-contracts/measurements)
CREATE TABLE IF NOT EXISTS medicoes_contrato (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_doc_id      TEXT,
  contrato_num         TEXT,
  sienge_building_id   INTEGER,
  obra_id              UUID REFERENCES obras(id) ON DELETE SET NULL,
  numero_medicao       INTEGER NOT NULL,
  data_medicao         DATE,
  data_vencimento      DATE,
  valor_mao_obra       NUMERIC(15,2) DEFAULT 0,
  valor_material       NUMERIC(15,2) DEFAULT 0,
  valor_liquido        NUMERIC(15,2) DEFAULT 0,
  aprovacao            TEXT DEFAULT 'pendente',
  autorizada           BOOLEAN DEFAULT false,
  finalizada           BOOLEAN DEFAULT false,
  observacao           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contrato_doc_id, contrato_num, sienge_building_id, numero_medicao)
);
CREATE INDEX IF NOT EXISTS idx_medicoes_contrato_obra ON medicoes_contrato(obra_id);

-- PEDIDOS DE COMPRA (Sienge purchase-orders)
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_id            INTEGER NOT NULL UNIQUE,
  sienge_building_id   INTEGER,
  obra_id              UUID REFERENCES obras(id) ON DELETE SET NULL,
  fornecedor_id        INTEGER,
  comprador            TEXT,
  data_pedido          DATE,
  status               TEXT DEFAULT 'pendente',
  valor_total          NUMERIC(15,2) DEFAULT 0,
  condicao_pagamento   TEXT,
  autorizado           BOOLEAN DEFAULT false,
  observacao           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_obra ON pedidos_compra(obra_id);

-- Atualiza check de importacoes_sienge para novos tipos
ALTER TABLE importacoes_sienge DROP CONSTRAINT IF EXISTS importacoes_sienge_tipo_check;
ALTER TABLE importacoes_sienge ADD CONSTRAINT importacoes_sienge_tipo_check
  CHECK (tipo IN ('obras','contratos','orcamento','medicoes','pedidos','sync_completo'));

-- RLS
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY contratos_read ON contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY contratos_all ON contratos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY medicoes_contrato_read ON medicoes_contrato FOR SELECT TO authenticated USING (true);
CREATE POLICY medicoes_contrato_all ON medicoes_contrato FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pedidos_read ON pedidos_compra FOR SELECT TO authenticated USING (true);
CREATE POLICY pedidos_all ON pedidos_compra FOR ALL TO service_role USING (true) WITH CHECK (true);
