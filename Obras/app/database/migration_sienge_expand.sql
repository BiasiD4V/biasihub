-- ============================================================
-- ERP Biasi — Migration: Limpeza + Tabelas Sienge Expandido
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ─── 1. LIMPAR DADOS FICTÍCIOS ────────────────────────────────
-- (mantém perfis de usuários reais)
TRUNCATE TABLE
  cotacoes,
  solicitacoes_compra,
  notas_fiscais,
  pedidos_compra,
  medicoes_contrato,
  contratos,
  estoque_sienge,
  orcamentos_sienge,
  sienge_sync_control,
  importacoes_sienge,
  tarefas,
  diario_obra,
  medicoes,
  cronograma,
  periodos,
  eap_itens,
  usuario_obra,
  obras
RESTART IDENTITY CASCADE;

-- ─── 2. FIX: importacoes_sienge aceita novos tipos ────────────
ALTER TABLE importacoes_sienge
  DROP CONSTRAINT IF EXISTS importacoes_sienge_tipo_check;

ALTER TABLE importacoes_sienge
  ADD CONSTRAINT importacoes_sienge_tipo_check
  CHECK (tipo IN ('obras','contratos','orcamento','medicoes','sync_incremental'));

-- ─── 3. TABELA: sienge_sync_control ──────────────────────────
CREATE TABLE IF NOT EXISTS sienge_sync_control (
  modulo          TEXT PRIMARY KEY,
  ultimo_offset   INTEGER NOT NULL DEFAULT 0,
  carga_completa  BOOLEAN NOT NULL DEFAULT false,
  budget_por_exec INTEGER NOT NULL DEFAULT 10,
  total_remoto    INTEGER NOT NULL DEFAULT 0,
  total_local     INTEGER NOT NULL DEFAULT 0,
  ultima_sync     TIMESTAMPTZ,
  meta            JSONB DEFAULT '{}'
);
COMMENT ON TABLE sienge_sync_control IS 'Controle de sincronização incremental com Sienge';

-- Registros iniciais (budget distribuído: 100 req/dia)
INSERT INTO sienge_sync_control (modulo, budget_por_exec) VALUES
  ('obras',               10),
  ('contratos',           15),
  ('medicoes_contrato',   15),
  ('pedidos_compra',      15),
  ('notas_fiscais',       10),
  ('solicitacoes_compra', 10),
  ('cotacoes',            10),
  ('orcamentos',          10),
  ('estoque',              5)
ON CONFLICT (modulo) DO NOTHING;

-- ─── 4. TABELA: contratos ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS contratos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Chave Sienge (documentId + contractNumber = único)
  sienge_doc_id         TEXT NOT NULL,
  sienge_contract_num   TEXT NOT NULL,
  sienge_building_id    INTEGER,
  obra_id               UUID REFERENCES obras(id) ON DELETE SET NULL,
  -- Dados do contrato
  fornecedor            TEXT,
  cliente               TEXT,
  responsavel           TEXT,
  objeto                TEXT,
  status                TEXT DEFAULT 'em_andamento'
                        CHECK (status IN ('em_andamento','concluido','cancelado','suspenso')),
  aprovacao             TEXT DEFAULT 'pendente',
  data_contrato         DATE,
  data_inicio           DATE,
  data_fim              DATE,
  valor_mao_obra        NUMERIC(15,2) DEFAULT 0,
  valor_material        NUMERIC(15,2) DEFAULT 0,
  valor_total           NUMERIC(15,2) DEFAULT 0,
  tipo_contrato         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sienge_doc_id, sienge_contract_num)
);
CREATE INDEX IF NOT EXISTS idx_contratos_obra ON contratos(obra_id);
CREATE INDEX IF NOT EXISTS idx_contratos_building ON contratos(sienge_building_id);
COMMENT ON TABLE contratos IS 'Contratos de suprimentos sincronizados do Sienge';

-- ─── 5. TABELA: medicoes_contrato ────────────────────────────
CREATE TABLE IF NOT EXISTS medicoes_contrato (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Chave Sienge
  contrato_doc_id     TEXT NOT NULL,
  contrato_num        TEXT NOT NULL,
  sienge_building_id  INTEGER,
  numero_medicao      INTEGER NOT NULL DEFAULT 0,
  obra_id             UUID REFERENCES obras(id) ON DELETE SET NULL,
  -- Dados da medição
  data_medicao        DATE,
  data_vencimento     DATE,
  valor_mao_obra      NUMERIC(15,2) DEFAULT 0,
  valor_material      NUMERIC(15,2) DEFAULT 0,
  valor_liquido       NUMERIC(15,2) DEFAULT 0,
  aprovacao           TEXT DEFAULT 'pendente',
  autorizada          BOOLEAN DEFAULT false,
  finalizada          BOOLEAN DEFAULT false,
  observacao          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contrato_doc_id, contrato_num, sienge_building_id, numero_medicao)
);
CREATE INDEX IF NOT EXISTS idx_medicoes_contrato_obra ON medicoes_contrato(obra_id);
COMMENT ON TABLE medicoes_contrato IS 'Medições de contratos de suprimentos (Sienge)';

-- ─── 6. TABELA: pedidos_compra ────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_id           INTEGER NOT NULL UNIQUE,
  sienge_building_id  INTEGER,
  obra_id             UUID REFERENCES obras(id) ON DELETE SET NULL,
  fornecedor_id       INTEGER,
  comprador           TEXT,
  data_pedido         DATE,
  status              TEXT DEFAULT 'pendente'
                      CHECK (status IN ('pendente','em_andamento','concluido','cancelado')),
  valor_total         NUMERIC(15,2) DEFAULT 0,
  condicao_pagamento  TEXT,
  autorizado          BOOLEAN DEFAULT false,
  observacao          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_obra ON pedidos_compra(obra_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_data ON pedidos_compra(data_pedido);
COMMENT ON TABLE pedidos_compra IS 'Pedidos de compra sincronizados do Sienge';

-- ─── 7. TABELA: notas_fiscais ─────────────────────────────────
CREATE TABLE IF NOT EXISTS notas_fiscais (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_id           INTEGER NOT NULL UNIQUE,
  sienge_building_id  INTEGER,
  obra_id             UUID REFERENCES obras(id) ON DELETE SET NULL,
  fornecedor_id       INTEGER,
  fornecedor_nome     TEXT,
  numero_nf           TEXT,
  serie               TEXT,
  data_emissao        DATE,
  data_entrada        DATE,
  valor_total         NUMERIC(15,2) DEFAULT 0,
  valor_desconto      NUMERIC(15,2) DEFAULT 0,
  valor_liquido       NUMERIC(15,2) DEFAULT 0,
  status              TEXT DEFAULT 'pendente',
  observacao          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_obra ON notas_fiscais(obra_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_data ON notas_fiscais(data_emissao);
COMMENT ON TABLE notas_fiscais IS 'Notas fiscais de compra sincronizadas do Sienge';

-- ─── 8. TABELA: solicitacoes_compra ──────────────────────────
CREATE TABLE IF NOT EXISTS solicitacoes_compra (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_id           INTEGER NOT NULL,
  sienge_item_id      INTEGER,
  sienge_building_id  INTEGER,
  obra_id             UUID REFERENCES obras(id) ON DELETE SET NULL,
  solicitante         TEXT,
  data_solicitacao    DATE,
  recurso_id          INTEGER,
  recurso_descricao   TEXT,
  quantidade          NUMERIC(15,4) DEFAULT 0,
  unidade             TEXT,
  valor_unitario      NUMERIC(15,2) DEFAULT 0,
  valor_total         NUMERIC(15,2) DEFAULT 0,
  status              TEXT DEFAULT 'pendente',
  observacao          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sienge_id, sienge_item_id)
);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_obra ON solicitacoes_compra(obra_id);
COMMENT ON TABLE solicitacoes_compra IS 'Solicitações de compra sincronizadas do Sienge';

-- ─── 9. TABELA: cotacoes ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotacoes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_negotiation_id INTEGER NOT NULL UNIQUE,
  sienge_building_id    INTEGER,
  obra_id               UUID REFERENCES obras(id) ON DELETE SET NULL,
  fornecedor_id         INTEGER,
  fornecedor_nome       TEXT,
  recurso_id            INTEGER,
  recurso_descricao     TEXT,
  quantidade            NUMERIC(15,4) DEFAULT 0,
  valor_unitario        NUMERIC(15,2) DEFAULT 0,
  valor_total           NUMERIC(15,2) DEFAULT 0,
  data_cotacao          DATE,
  vencedora             BOOLEAN DEFAULT false,
  observacao            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cotacoes_obra ON cotacoes(obra_id);
COMMENT ON TABLE cotacoes IS 'Cotações de preços sincronizadas do Sienge';

-- ─── 10. TABELA: orcamentos_sienge ────────────────────────────
CREATE TABLE IF NOT EXISTS orcamentos_sienge (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id             UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  sienge_building_id  INTEGER NOT NULL,
  sheet_id            TEXT NOT NULL,
  wbs_code            TEXT,
  descricao           TEXT NOT NULL,
  unidade             TEXT,
  quantidade          NUMERIC(15,4) DEFAULT 0,
  preco_unitario      NUMERIC(15,2) DEFAULT 0,
  valor_mo            NUMERIC(15,2) DEFAULT 0,
  valor_material      NUMERIC(15,2) DEFAULT 0,
  valor_total         NUMERIC(15,2) DEFAULT 0,
  categoria           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (obra_id, wbs_code, sheet_id)
);
CREATE INDEX IF NOT EXISTS idx_orcamentos_sienge_obra ON orcamentos_sienge(obra_id);
COMMENT ON TABLE orcamentos_sienge IS 'Itens de orçamento de obra sincronizados do Sienge';

-- ─── 11. TABELA: estoque_sienge ───────────────────────────────
CREATE TABLE IF NOT EXISTS estoque_sienge (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id             UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  sienge_building_id  INTEGER NOT NULL,
  recurso_id          INTEGER NOT NULL,
  recurso_descricao   TEXT,
  unidade             TEXT,
  quantidade          NUMERIC(15,4) DEFAULT 0,
  preco_medio         NUMERIC(15,2) DEFAULT 0,
  valor_total         NUMERIC(15,2) DEFAULT 0,
  localizacao         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (obra_id, recurso_id)
);
CREATE INDEX IF NOT EXISTS idx_estoque_sienge_obra ON estoque_sienge(obra_id);
COMMENT ON TABLE estoque_sienge IS 'Estoque de insumos por obra sincronizado do Sienge';

-- ─── 12. RLS — habilitar nas novas tabelas ────────────────────
ALTER TABLE sienge_sync_control   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes_contrato     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais         ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_compra   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos_sienge     ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_sienge        ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem ler/escrever tudo
-- (controle de acesso feito na aplicação via perfil)
DO $$
DECLARE
  tbls TEXT[] := ARRAY[
    'sienge_sync_control','contratos','medicoes_contrato','pedidos_compra',
    'notas_fiscais','solicitacoes_compra','cotacoes','orcamentos_sienge','estoque_sienge'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS %I ON %I;
      CREATE POLICY %I ON %I
        FOR ALL TO authenticated
        USING (true) WITH CHECK (true);
    ', t||'_auth', t, t||'_auth', t);
  END LOOP;
END $$;

-- ─── VERIFICAÇÃO FINAL ────────────────────────────────────────
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') AS colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'obras','contratos','medicoes_contrato','pedidos_compra',
    'notas_fiscais','solicitacoes_compra','cotacoes',
    'orcamentos_sienge','estoque_sienge','sienge_sync_control',
    'importacoes_sienge'
  )
ORDER BY table_name;
