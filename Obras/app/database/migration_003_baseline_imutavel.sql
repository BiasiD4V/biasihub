-- ============================================================================
-- migration_003_baseline_imutavel.sql
-- Baseline imutável para planejamento
-- - Snapshot de datas no momento do congelamento
-- - Flag baseline_congelada em obra_planejamentos
-- - Coluna para indicar se EAP foi excluído (soft delete)
-- ============================================================================

-- 1. Campos de baseline nas atividades
ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS data_inicio_baseline  DATE,
  ADD COLUMN IF NOT EXISTS data_fim_baseline     DATE,
  ADD COLUMN IF NOT EXISTS duracao_baseline      INTEGER;

-- 2. Flag de congelamento no planejamento
ALTER TABLE obra_planejamentos
  ADD COLUMN IF NOT EXISTS baseline_congelada    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_congelamento     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS congelado_por         UUID REFERENCES perfis(id);

-- 3. Soft delete em EAP (para correção de montagem antes de congelar)
ALTER TABLE planejamento_eap
  ADD COLUMN IF NOT EXISTS deletado_em           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletado_por          UUID REFERENCES perfis(id);

-- 4. Index para filtrar itens não deletados
CREATE INDEX IF NOT EXISTS idx_planejamento_eap_deletado
  ON planejamento_eap(planejamento_id) WHERE deletado_em IS NULL;

-- 5. Index para planejamentos congelados
CREATE INDEX IF NOT EXISTS idx_obra_planejamentos_congelado
  ON obra_planejamentos(obra_id, baseline_congelada);

COMMENT ON COLUMN planejamento_atividades.data_inicio_baseline IS
  'Data início congelada no momento do baseline — NUNCA atualizada após congelamento';
COMMENT ON COLUMN planejamento_atividades.data_fim_baseline IS
  'Data fim congelada no momento do baseline — NUNCA atualizada após congelamento';
COMMENT ON COLUMN obra_planejamentos.baseline_congelada IS
  'true = baseline imutável. Reprogramações só alteram data_fim_prevista, jamais o baseline';
