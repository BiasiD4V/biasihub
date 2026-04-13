-- ============================================================================
-- migration_005_predecessoras.sql
-- Tabela de predecessoras para cronograma (MS Project style)
-- Executar no SQL Editor do Supabase
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tabela principal
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planejamento_predecessoras (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id   UUID NOT NULL REFERENCES planejamento_atividades(id) ON DELETE CASCADE,
  predecessora_id UUID NOT NULL REFERENCES planejamento_atividades(id) ON DELETE CASCADE,
  tipo           VARCHAR(2) NOT NULL DEFAULT 'FS'
                   CHECK (tipo IN ('FS','SS','FF','SF')),
  lag_dias       INTEGER NOT NULL DEFAULT 0,
  criado_em      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (atividade_id, predecessora_id)
);

CREATE INDEX IF NOT EXISTS idx_pred_atividade    ON planejamento_predecessoras(atividade_id);
CREATE INDEX IF NOT EXISTS idx_pred_predecessora ON planejamento_predecessoras(predecessora_id);

COMMENT ON TABLE planejamento_predecessoras IS
  'Relações de precedência entre atividades — suporta FS/SS/FF/SF com lag em dias úteis (MS Project)';
COMMENT ON COLUMN planejamento_predecessoras.tipo IS
  'FS=Fim→Início, SS=Início→Início, FF=Fim→Fim, SF=Início→Fim';
COMMENT ON COLUMN planejamento_predecessoras.lag_dias IS
  'Dias úteis de espera (positivo) ou sobreposição (negativo)';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE planejamento_predecessoras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pred_admin_planejamento_all" ON planejamento_predecessoras;
CREATE POLICY "pred_admin_planejamento_all" ON planejamento_predecessoras
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin','planejamento')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin','planejamento')));

DROP POLICY IF EXISTS "pred_gerente_supervisor_select" ON planejamento_predecessoras;
CREATE POLICY "pred_gerente_supervisor_select" ON planejamento_predecessoras
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('gerente','supervisor')));


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Garantir que migration_004 foi aplicada (idempotente)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS is_critica   BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS folga_total  INTEGER,
  ADD COLUMN IF NOT EXISTS data_inicio_prevista DATE,
  ADD COLUMN IF NOT EXISTS data_fim_prevista    DATE;

ALTER TABLE obra_planejamentos
  ADD COLUMN IF NOT EXISTS nome TEXT;
