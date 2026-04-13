-- ============================================================================
-- migration_006_progresso_execucao.sql
-- Campos de execução real nas atividades de planejamento
-- Executar no SQL Editor do Supabase
-- ============================================================================

ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS data_real_inicio  DATE,
  ADD COLUMN IF NOT EXISTS data_real_fim     DATE,
  ADD COLUMN IF NOT EXISTS obs_execucao      TEXT;

-- status já existe ('nao_iniciada','em_andamento','concluida','pausada','atrasada')
-- peso_realizado_perc já existe
-- Garantir que o CHECK do status inclua todos os valores
ALTER TABLE planejamento_atividades
  DROP CONSTRAINT IF EXISTS planejamento_atividades_status_check;

ALTER TABLE planejamento_atividades
  ADD CONSTRAINT planejamento_atividades_status_check
  CHECK (status IN ('nao_iniciada','em_andamento','concluida','pausada','atrasada'));

-- Índice para filtrar por status
CREATE INDEX IF NOT EXISTS idx_atv_status ON planejamento_atividades(status);
