-- ============================================================
-- ERP BIASI — Migration 009: Expansão de Obras para Integração Sienge
-- Data: 2026-04-04
-- Adiciona campos e tabelas para captar todos os dados relevantes da API Sienge
-- ============================================================

-- 1. Expansão da tabela obras
ALTER TABLE obras
  ADD COLUMN IF NOT EXISTS sienge_id INTEGER,
  ADD COLUMN IF NOT EXISTS commercial_name TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS enterprise_observation TEXT,
  ADD COLUMN IF NOT EXISTS sienge_type TEXT,
  ADD COLUMN IF NOT EXISTS building_type_id INTEGER,
  ADD COLUMN IF NOT EXISTS building_appropriation_level TEXT,
  ADD COLUMN IF NOT EXISTS building_status TEXT,
  ADD COLUMN IF NOT EXISTS building_cost_estimation_status TEXT,
  ADD COLUMN IF NOT EXISTS cost_center_status TEXT,
  ADD COLUMN IF NOT EXISTS cost_database_id INTEGER,
  ADD COLUMN IF NOT EXISTS cost_database_description TEXT,
  ADD COLUMN IF NOT EXISTS building_enabled_for_integration BOOLEAN,
  ADD COLUMN IF NOT EXISTS creation_date DATE,
  ADD COLUMN IF NOT EXISTS modification_date DATE,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS modified_by TEXT,
  ADD COLUMN IF NOT EXISTS company_id INTEGER,
  ADD COLUMN IF NOT EXISTS construction_details JSONB,
  ADD COLUMN IF NOT EXISTS sales_details JSONB,
  ADD COLUMN IF NOT EXISTS accountable JSONB,
  ADD COLUMN IF NOT EXISTS associated_building JSONB,
  ADD COLUMN IF NOT EXISTS associated_cost_centers JSONB;

-- 2. Tabela para unidades/lotes (groupings)
CREATE TABLE IF NOT EXISTS obra_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  sienge_unit_grouping_id INTEGER,
  unit_grouping_description TEXT,
  order_number INTEGER,
  description TEXT,
  expected_occupancy_date DATE,
  legal_occupancy_date DATE,
  real_occupancy_date DATE,
  release_date DATE,
  date_evolution_work DATE,
  number_floors INTEGER,
  work_progress_percentage NUMERIC(5,2),
  value_grouping_description TEXT,
  dados_raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obra_unidades_obra ON obra_unidades(obra_id);

-- 3. Ajuste de enums (status)
-- (Opcional: criar tabelas de domínio para status, se desejar integridade referencial)

-- 4. Comentários para documentação
COMMENT ON COLUMN obras.sienge_id IS 'ID da obra no Sienge';
COMMENT ON COLUMN obras.commercial_name IS 'Nome comercial da obra (Sienge)';
COMMENT ON COLUMN obras.cnpj IS 'CNPJ do empreendimento (Sienge)';
COMMENT ON COLUMN obras.enterprise_observation IS 'Observações da obra (Sienge)';
COMMENT ON COLUMN obras.sienge_type IS 'Tipo da obra (Sienge: 1-4)';
COMMENT ON COLUMN obras.building_type_id IS 'ID do tipo de obra (Sienge)';
COMMENT ON COLUMN obras.building_appropriation_level IS 'Nível de apropriação (Sienge)';
COMMENT ON COLUMN obras.building_status IS 'Status da obra (Sienge)';
COMMENT ON COLUMN obras.building_cost_estimation_status IS 'Status de orçamento (Sienge)';
COMMENT ON COLUMN obras.cost_center_status IS 'Status do centro de custo (Sienge)';
COMMENT ON COLUMN obras.cost_database_id IS 'ID da base de custos (Sienge)';
COMMENT ON COLUMN obras.cost_database_description IS 'Descrição da base de custos (Sienge)';
COMMENT ON COLUMN obras.building_enabled_for_integration IS 'Obra habilitada para integração (Sienge)';
COMMENT ON COLUMN obras.creation_date IS 'Data de criação (Sienge)';
COMMENT ON COLUMN obras.modification_date IS 'Data de modificação (Sienge)';
COMMENT ON COLUMN obras.created_by IS 'Usuário que criou (Sienge)';
COMMENT ON COLUMN obras.modified_by IS 'Usuário que alterou (Sienge)';
COMMENT ON COLUMN obras.company_id IS 'ID da empresa dona (Sienge)';
COMMENT ON COLUMN obras.construction_details IS 'Detalhes construtivos (Sienge, JSONB)';
COMMENT ON COLUMN obras.sales_details IS 'Detalhes de vendas (Sienge, JSONB)';
COMMENT ON COLUMN obras.accountable IS 'Responsável pela obra (Sienge, JSONB)';
COMMENT ON COLUMN obras.associated_building IS 'Obra associada (Sienge, JSONB)';
COMMENT ON COLUMN obras.associated_cost_centers IS 'Centros de custo associados (Sienge, JSONB)';

COMMENT ON TABLE obra_unidades IS 'Unidades/lotes de obra importados do Sienge (groupings)';
