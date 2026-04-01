-- =============================================
-- PLANILHA ORÇAMENTÁRIA DETALHADA
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Tabela principal: cabeçalho da planilha
CREATE TABLE IF NOT EXISTS planilhas_orcamentarias (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  numero           TEXT         NOT NULL,          -- ex: "PO-202604-2250"
  revisao          SMALLINT     DEFAULT 0,         -- 0=R0, 1=R1, 2=R2...
  tipo             TEXT         DEFAULT 'PO',      -- 'PO' | 'PTC'
  status           TEXT         DEFAULT 'rascunho',-- rascunho | emitido | aprovado | cancelado
  cliente_id       UUID         REFERENCES clientes(id) ON DELETE SET NULL,
  nome_obra        TEXT         NOT NULL,
  objeto           TEXT,
  municipio        TEXT,
  condicoes_pagamento TEXT,
  prazo_execucao   TEXT,
  data_proposta    DATE         DEFAULT CURRENT_DATE,
  responsavel      TEXT,
  faturamento_direto BOOLEAN    DEFAULT false,
  observacoes      TEXT,
  -- Parâmetros BDI (valores em %, ex: 8.0 = 8%)
  bdi_ac           NUMERIC(6,2) DEFAULT 8.00,
  bdi_riscos       NUMERIC(6,2) DEFAULT 0.50,
  bdi_cf           NUMERIC(6,2) DEFAULT 1.11,
  bdi_seguros      NUMERIC(6,2) DEFAULT 0.30,
  bdi_garantias    NUMERIC(6,2) DEFAULT 0.50,
  bdi_lucro        NUMERIC(6,2) DEFAULT 8.00,
  bdi_pis          NUMERIC(6,2) DEFAULT 0.65,
  bdi_cofins       NUMERIC(6,2) DEFAULT 3.00,
  bdi_irpj         NUMERIC(6,2) DEFAULT 1.20,
  bdi_csll         NUMERIC(6,2) DEFAULT 1.08,
  bdi_iss          NUMERIC(6,2) DEFAULT 5.00,
  -- Totais cacheados (atualizados ao salvar)
  total_material   NUMERIC(15,2) DEFAULT 0,
  total_mo         NUMERIC(15,2) DEFAULT 0,
  total_geral      NUMERIC(15,2) DEFAULT 0,
  total_com_bdi    NUMERIC(15,2) DEFAULT 0,
  -- Metadados
  criado_em        TIMESTAMPTZ  DEFAULT now(),
  atualizado_em    TIMESTAMPTZ  DEFAULT now()
);

-- 2. Tabela de itens da planilha (hierarquia CC→E→SE→S)
CREATE TABLE IF NOT EXISTS planilha_itens (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  planilha_id      UUID         NOT NULL REFERENCES planilhas_orcamentarias(id) ON DELETE CASCADE,
  nivel            TEXT         NOT NULL CHECK (nivel IN ('CC','E','SE','S')),
  numero_item      TEXT         NOT NULL,   -- ex: "1", "1.1", "1.1.1", "1.1.1.1"
  descricao        TEXT         NOT NULL,
  unidade          TEXT,
  quantidade       NUMERIC(12,3) DEFAULT 1,
  preco_unit_material NUMERIC(12,2) DEFAULT 0,
  preco_unit_mo    NUMERIC(12,2) DEFAULT 0,
  is_verba         BOOLEAN      DEFAULT false,
  verba_pct        NUMERIC(6,2) DEFAULT 0,  -- % se is_verba = true
  ordem            INTEGER      DEFAULT 0,  -- posição relativa dentro do pai
  criado_em        TIMESTAMPTZ  DEFAULT now()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_planilhas_status ON planilhas_orcamentarias(status);
CREATE INDEX IF NOT EXISTS idx_planilhas_cliente ON planilhas_orcamentarias(cliente_id);
CREATE INDEX IF NOT EXISTS idx_planilha_itens_planilha ON planilha_itens(planilha_id);
CREATE INDEX IF NOT EXISTS idx_planilha_itens_ordem ON planilha_itens(planilha_id, ordem);

-- 4. RLS
ALTER TABLE planilhas_orcamentarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "allow_all_planilhas" ON planilhas_orcamentarias
  USING (true) WITH CHECK (true);

ALTER TABLE planilha_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "allow_all_planilha_itens" ON planilha_itens
  USING (true) WITH CHECK (true);

-- 5. View com join de cliente para a listagem
CREATE OR REPLACE VIEW planilhas_orcamentarias_view AS
SELECT
  p.*,
  c.nome AS cliente_nome,
  c.cidade AS cliente_cidade
FROM planilhas_orcamentarias p
LEFT JOIN clientes c ON c.id = p.cliente_id;

-- 6. Função para gerar próximo número de proposta
--    Lê o máximo de numero_composto da tabela propostas e retorna o próximo sequencial
CREATE OR REPLACE FUNCTION proximo_numero_planilha()
RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  ultimo_seq   INTEGER;
  proximo_seq  INTEGER;
  ano_mes      TEXT;
BEGIN
  -- Pegar o último sequencial de propostas (formato YYYYMM-NNNN)
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(numero_composto, '-', 2) AS INTEGER)),
    2249
  )
  INTO ultimo_seq
  FROM propostas
  WHERE numero_composto IS NOT NULL
    AND numero_composto ~ '^\d{6}-\d+$';

  proximo_seq := ultimo_seq + 1;
  ano_mes := TO_CHAR(NOW(), 'YYYYMM');

  RETURN 'PO-' || ano_mes || '-' || LPAD(proximo_seq::TEXT, 4, '0');
END;
$$;
