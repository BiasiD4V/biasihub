-- ============================================================================
-- migration_004_fix_colunas_planejamento.sql
-- Corrige alinhamento entre schema e código do módulo de planejamento
-- Executar no SQL Editor do Supabase
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Renomear data_inicio → data_inicio_prevista e data_fim → data_fim_prevista
--    (semântica correta: distingue datas previstas de baseline e reais)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Renomear data_inicio se ainda não foi renomeada
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planejamento_atividades' AND column_name = 'data_inicio'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planejamento_atividades' AND column_name = 'data_inicio_prevista'
  ) THEN
    ALTER TABLE planejamento_atividades
      RENAME COLUMN data_inicio TO data_inicio_prevista;
  END IF;

  -- Renomear data_fim se ainda não foi renomeada
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planejamento_atividades' AND column_name = 'data_fim'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planejamento_atividades' AND column_name = 'data_fim_prevista'
  ) THEN
    ALTER TABLE planejamento_atividades
      RENAME COLUMN data_fim TO data_fim_prevista;
  END IF;
END $$;

-- Recriar constraint de data (nome pode ter mudado)
ALTER TABLE planejamento_atividades
  DROP CONSTRAINT IF EXISTS data_fim_after_inicio;

ALTER TABLE planejamento_atividades
  ADD CONSTRAINT data_fim_after_inicio
  CHECK (
    data_fim_prevista IS NULL
    OR data_inicio_prevista IS NULL
    OR data_fim_prevista >= data_inicio_prevista
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Adicionar colunas ausentes em planejamento_atividades
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS is_critica   BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS folga_total  INTEGER;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Adicionar coluna nome em obra_planejamentos
--    (usado no código para identificar a versão do planejamento)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE obra_planejamentos
  ADD COLUMN IF NOT EXISTS nome TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Garantir que migration_003 foi aplicada (idempotente)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS data_inicio_baseline DATE,
  ADD COLUMN IF NOT EXISTS data_fim_baseline    DATE,
  ADD COLUMN IF NOT EXISTS duracao_baseline     INTEGER;

ALTER TABLE obra_planejamentos
  ADD COLUMN IF NOT EXISTS baseline_congelada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_congelamento  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS congelado_por      UUID REFERENCES perfis(id);

ALTER TABLE planejamento_eap
  ADD COLUMN IF NOT EXISTS deletado_em  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletado_por UUID REFERENCES perfis(id);

CREATE INDEX IF NOT EXISTS idx_planejamento_eap_deletado
  ON planejamento_eap(planejamento_id) WHERE deletado_em IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Recriar views que referenciam colunas renomeadas
-- ─────────────────────────────────────────────────────────────────────────────

-- View: EAP completo com progresso agregado
CREATE OR REPLACE VIEW vw_eap_completo AS
SELECT
  e.id,
  e.planejamento_id,
  e.codigo,
  e.nome,
  e.descricao,
  e.nivel,
  e.parent_id,
  e.hierarquia,
  e.peso_percentual,
  e.valor_orcado,
  e.valor_contratado,
  e.ordem,
  COALESCE(
    MAX(a.peso_realizado_perc) FILTER (WHERE a.status = 'concluida'),
    AVG(a.peso_realizado_perc) FILTER (WHERE a.status IN ('em_andamento', 'concluida')),
    0
  ) AS peso_realizado_agregado,
  COUNT(a.id) FILTER (WHERE a.status = 'em_andamento') AS atividades_em_andamento,
  COUNT(a.id) AS total_atividades,
  MAX(COALESCE(a.data_fim_real, a.data_fim_prevista)) AS data_fim_latest,
  e.created_at,
  e.updated_at
FROM planejamento_eap e
LEFT JOIN planejamento_atividades a ON e.id = a.eap_item_id
GROUP BY e.id, e.planejamento_id, e.codigo, e.nome, e.descricao, e.nivel, e.parent_id,
         e.hierarquia, e.peso_percentual, e.valor_orcado, e.valor_contratado, e.ordem,
         e.created_at, e.updated_at;

-- View: Atividades críticas
CREATE OR REPLACE VIEW vw_atividades_criticas AS
WITH atividades_com_folga AS (
  SELECT
    pa.id,
    pa.planejamento_id,
    pa.nome,
    pa.data_inicio_prevista,
    pa.data_fim_prevista,
    pa.duracao_dias,
    pa.predecessores_json,
    COALESCE(
      MAX(DATE_PART('day', pap_pred.data_fim_prevista)::INTEGER),
      DATE_PART('day', pa.data_inicio_prevista)::INTEGER
    ) AS early_start,
    COALESCE(
      MAX(DATE_PART('day', pap_pred.data_fim_prevista)::INTEGER),
      DATE_PART('day', pa.data_inicio_prevista)::INTEGER
    ) + pa.duracao_dias AS early_finish
  FROM planejamento_atividades pa
  LEFT JOIN LATERAL jsonb_array_elements(pa.predecessores_json) AS pred ON true
  LEFT JOIN planejamento_atividades pap_pred ON pap_pred.id = (pred->>'id')::UUID
  GROUP BY pa.id, pa.planejamento_id, pa.nome, pa.data_inicio_prevista, pa.data_fim_prevista,
           pa.duracao_dias, pa.predecessores_json
)
SELECT
  id,
  planejamento_id,
  nome,
  data_inicio_prevista,
  data_fim_prevista,
  duracao_dias,
  early_start,
  early_finish,
  CASE
    WHEN data_inicio_prevista IS NULL OR data_fim_prevista IS NULL THEN 'NAO'
    WHEN duracao_dias = (data_fim_prevista - data_inicio_prevista) THEN 'SIM'
    ELSE 'NAO'
  END AS e_critica
FROM atividades_com_folga
ORDER BY planejamento_id, early_start;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS — adicionar políticas para perfil admin em todas as tabelas
-- ─────────────────────────────────────────────────────────────────────────────

-- obra_planejamentos
ALTER TABLE obra_planejamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planejamentos_admin_all" ON obra_planejamentos;
CREATE POLICY "planejamentos_admin_all" ON obra_planejamentos
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin'));

DROP POLICY IF EXISTS "planejamentos_planejamento_all" ON obra_planejamentos;
CREATE POLICY "planejamentos_planejamento_all" ON obra_planejamentos
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('planejamento','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('planejamento','admin')));

DROP POLICY IF EXISTS "planejamentos_gerente_select" ON obra_planejamentos;
CREATE POLICY "planejamentos_gerente_select" ON obra_planejamentos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('gerente','supervisor')));

-- planejamento_eap
DROP POLICY IF EXISTS "eap_admin_all" ON planejamento_eap;
CREATE POLICY "eap_admin_all" ON planejamento_eap
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin'));

-- Ampliar policy planejamento para incluir admin
DROP POLICY IF EXISTS "eap_planejamento_all" ON planejamento_eap;
CREATE POLICY "eap_planejamento_all" ON planejamento_eap
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('planejamento','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('planejamento','admin')));

-- planejamento_atividades
DROP POLICY IF EXISTS "atividades_admin_all" ON planejamento_atividades;
CREATE POLICY "atividades_admin_all" ON planejamento_atividades
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin'));

DROP POLICY IF EXISTS "atividades_planejamento_all" ON planejamento_atividades;
CREATE POLICY "atividades_planejamento_all" ON planejamento_atividades
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('planejamento','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('planejamento','admin')));
