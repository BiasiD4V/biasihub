-- ============================================================
-- ERP BIASI — Migração: Sync Incremental + 5 Novos Módulos Sienge
-- Data: 2026-04
--
-- Cria: sienge_sync_control, notas_fiscais, solicitacoes_compra,
--       cotacoes, orcamentos_sienge, estoque_sienge
-- ============================================================

-- ── CONTROLE DE SINCRONIZAÇÃO INCREMENTAL ──────────────────
-- Cada módulo tem seu estado: onde parou, total remoto, se
-- já fez o carregamento inicial completo, budget por execução.
CREATE TABLE IF NOT EXISTS sienge_sync_control (
  modulo          TEXT PRIMARY KEY,
  ultimo_offset   INTEGER NOT NULL DEFAULT 0,
  total_remoto    INTEGER DEFAULT 0,
  total_local     INTEGER DEFAULT 0,
  carga_completa  BOOLEAN NOT NULL DEFAULT false,
  ultima_sync     TIMESTAMPTZ,
  budget_por_exec INTEGER NOT NULL DEFAULT 10,
  meta            JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE sienge_sync_control IS 'Controle incremental de sync p/ cada módulo Sienge — não re-baixa tudo, retoma de onde parou';

-- Seed: módulos existentes já com carga completa (data já carregada).
-- Novos módulos começam do zero.
INSERT INTO sienge_sync_control (modulo, carga_completa, budget_por_exec) VALUES
  ('obras',               true,  2),
  ('contratos',           true,  5),
  ('medicoes_contrato',   true,  3),
  ('pedidos_compra',      true,  3),
  ('notas_fiscais',       false, 15),
  ('solicitacoes_compra', false, 10),
  ('cotacoes',            false, 10),
  ('orcamentos',          false, 10),
  ('estoque',             false, 10)
ON CONFLICT (modulo) DO NOTHING;

-- ── NOTAS FISCAIS DE COMPRA (Sienge /purchase-invoices) ────
CREATE TABLE IF NOT EXISTS notas_fiscais (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_id          INTEGER NOT NULL UNIQUE,
  obra_id            UUID REFERENCES obras(id) ON DELETE SET NULL,
  sienge_building_id INTEGER,
  fornecedor_id      INTEGER,
  fornecedor_nome    TEXT,
  numero_nf          TEXT,
  serie              TEXT,
  data_emissao       DATE,
  data_entrada       DATE,
  valor_total        NUMERIC(15,2) DEFAULT 0,
  valor_desconto     NUMERIC(15,2) DEFAULT 0,
  valor_liquido      NUMERIC(15,2) DEFAULT 0,
  status             TEXT DEFAULT 'pendente',
  observacao         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nf_obra ON notas_fiscais(obra_id);
CREATE INDEX IF NOT EXISTS idx_nf_fornecedor ON notas_fiscais(fornecedor_id);

-- ── SOLICITAÇÕES DE COMPRA (Sienge /purchase-requests) ─────
CREATE TABLE IF NOT EXISTS solicitacoes_compra (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_id          INTEGER NOT NULL,
  sienge_item_id     INTEGER,
  obra_id            UUID REFERENCES obras(id) ON DELETE SET NULL,
  sienge_building_id INTEGER,
  solicitante        TEXT,
  data_solicitacao   DATE,
  recurso_id         INTEGER,
  recurso_descricao  TEXT,
  quantidade         NUMERIC(15,4) DEFAULT 0,
  unidade            TEXT,
  valor_unitario     NUMERIC(15,4) DEFAULT 0,
  valor_total        NUMERIC(15,2) DEFAULT 0,
  status             TEXT DEFAULT 'pendente',
  observacao         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacoes_unique ON solicitacoes_compra(sienge_id, COALESCE(sienge_item_id, 0));
CREATE INDEX IF NOT EXISTS idx_solicitacoes_obra ON solicitacoes_compra(obra_id);

-- ── COTAÇÕES (Sienge /purchase-quotations) ─────────────────
CREATE TABLE IF NOT EXISTS cotacoes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sienge_negotiation_id   INTEGER NOT NULL UNIQUE,
  obra_id                 UUID REFERENCES obras(id) ON DELETE SET NULL,
  sienge_building_id      INTEGER,
  fornecedor_id           INTEGER,
  fornecedor_nome         TEXT,
  recurso_id              INTEGER,
  recurso_descricao       TEXT,
  quantidade              NUMERIC(15,4) DEFAULT 0,
  valor_unitario          NUMERIC(15,4) DEFAULT 0,
  valor_total             NUMERIC(15,2) DEFAULT 0,
  data_cotacao            DATE,
  vencedora               BOOLEAN DEFAULT false,
  observacao              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cotacoes_obra ON cotacoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_fornecedor ON cotacoes(fornecedor_id);

-- ── ORÇAMENTOS SIENGE (Building Cost Estimations por obra) ─
CREATE TABLE IF NOT EXISTS orcamentos_sienge (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id            UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  sienge_building_id INTEGER NOT NULL,
  sheet_id           TEXT,
  wbs_code           TEXT,
  descricao          TEXT NOT NULL,
  unidade            TEXT,
  quantidade         NUMERIC(15,4) DEFAULT 0,
  preco_unitario     NUMERIC(15,4) DEFAULT 0,
  valor_mo           NUMERIC(15,2) DEFAULT 0,
  valor_material     NUMERIC(15,2) DEFAULT 0,
  valor_total        NUMERIC(15,2) DEFAULT 0,
  categoria          TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orcamentos_unique ON orcamentos_sienge(obra_id, COALESCE(wbs_code, ''), COALESCE(sheet_id, ''));
CREATE INDEX IF NOT EXISTS idx_orcamentos_obra ON orcamentos_sienge(obra_id);

-- ── ESTOQUE SIENGE (Stock Inventory por obra/centro custo) ─
CREATE TABLE IF NOT EXISTS estoque_sienge (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id            UUID REFERENCES obras(id) ON DELETE SET NULL,
  sienge_building_id INTEGER,
  recurso_id         INTEGER NOT NULL,
  recurso_descricao  TEXT,
  unidade            TEXT,
  quantidade         NUMERIC(15,4) DEFAULT 0,
  preco_medio        NUMERIC(15,4) DEFAULT 0,
  valor_total        NUMERIC(15,2) DEFAULT 0,
  localizacao        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_estoque_unique ON estoque_sienge(COALESCE(obra_id, '00000000-0000-0000-0000-000000000000'::uuid), recurso_id);
CREATE INDEX IF NOT EXISTS idx_estoque_obra ON estoque_sienge(obra_id);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE sienge_sync_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais       ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos_sienge   ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_sienge      ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado | Escrita: service_role (sync)
CREATE POLICY sync_ctrl_read ON sienge_sync_control FOR SELECT TO authenticated USING (true);
CREATE POLICY sync_ctrl_all  ON sienge_sync_control FOR ALL    TO service_role  USING (true) WITH CHECK (true);

CREATE POLICY nf_read  ON notas_fiscais       FOR SELECT TO authenticated USING (true);
CREATE POLICY nf_all   ON notas_fiscais       FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY sc_read  ON solicitacoes_compra  FOR SELECT TO authenticated USING (true);
CREATE POLICY sc_all   ON solicitacoes_compra  FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY cot_read ON cotacoes             FOR SELECT TO authenticated USING (true);
CREATE POLICY cot_all  ON cotacoes             FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY orc_read ON orcamentos_sienge    FOR SELECT TO authenticated USING (true);
CREATE POLICY orc_all  ON orcamentos_sienge    FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY est_read ON estoque_sienge       FOR SELECT TO authenticated USING (true);
CREATE POLICY est_all  ON estoque_sienge       FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- ── ATUALIZA CHECK DE IMPORTACOES ──────────────────────────
ALTER TABLE importacoes_sienge DROP CONSTRAINT IF EXISTS importacoes_sienge_tipo_check;
ALTER TABLE importacoes_sienge ADD CONSTRAINT importacoes_sienge_tipo_check
  CHECK (tipo IN ('obras','contratos','orcamento','medicoes','pedidos','sync_completo','sync_incremental'));

-- ── TRIGGERS DE UPDATED_AT ─────────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_ctrl_updated   ON sienge_sync_control;
DROP TRIGGER IF EXISTS trg_nf_updated          ON notas_fiscais;
DROP TRIGGER IF EXISTS trg_orcamentos_updated  ON orcamentos_sienge;
DROP TRIGGER IF EXISTS trg_estoque_updated     ON estoque_sienge;
DROP TRIGGER IF EXISTS trg_contratos_updated   ON contratos;

CREATE TRIGGER trg_sync_ctrl_updated  BEFORE UPDATE ON sienge_sync_control FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();
CREATE TRIGGER trg_nf_updated         BEFORE UPDATE ON notas_fiscais       FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();
CREATE TRIGGER trg_orcamentos_updated BEFORE UPDATE ON orcamentos_sienge   FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();
CREATE TRIGGER trg_estoque_updated    BEFORE UPDATE ON estoque_sienge      FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();
CREATE TRIGGER trg_contratos_updated  BEFORE UPDATE ON contratos           FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();
