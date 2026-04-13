-- ============================================================================
-- MIGRATION 001 — Adaptar schema para SPEC-PLN-002-2026
-- Adiciona colunas faltando sem quebrar dados existentes
-- Execute no Supabase SQL Editor
-- ============================================================================

-- ─── 1. obra_planejamentos ────────────────────────────────────────────────────

-- Nome do planejamento (ex: "Planejamento v1", "Revisão Março 2026")
ALTER TABLE obra_planejamentos
  ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT 'Planejamento v1';

-- data_baseline (alias para data_base_assinada, novo nome da spec)
ALTER TABLE obra_planejamentos
  ADD COLUMN IF NOT EXISTS data_baseline DATE;

-- ─── 2. planejamento_eap ──────────────────────────────────────────────────────

-- Tipo da célula EAP: CC = Célula Construtiva, E = Etapa, SE = Sub-etapa, S = Serviço
ALTER TABLE planejamento_eap
  ADD COLUMN IF NOT EXISTS tipo TEXT
    CHECK (tipo IN ('CC', 'E', 'SE', 'S'));

-- Índice para filtrar por tipo
CREATE INDEX IF NOT EXISTS idx_planejamento_eap_tipo
  ON planejamento_eap(planejamento_id, tipo);

-- ─── 3. planejamento_atividades ───────────────────────────────────────────────

-- Responsável pela atividade (supervisor/planejamento)
ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES auth.users(id);

-- Caminho crítico: atividade crítica e folga total
ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS is_critica BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS folga_total INTEGER;

-- Critério de medição conforme spec
-- (coluna já existe, atualizar o CHECK constraint)
ALTER TABLE planejamento_atividades
  DROP CONSTRAINT IF EXISTS planejamento_atividades_criterio_medicao_check;

ALTER TABLE planejamento_atividades
  ADD CONSTRAINT planejamento_atividades_criterio_medicao_check
    CHECK (criterio_medicao IN ('ZERO_CEM', 'VINTE_OITENTA', 'ETAPAS', 'UNIDADE') OR criterio_medicao IS NULL);

UPDATE planejamento_atividades
  SET criterio_medicao = 'ZERO_CEM'
  WHERE criterio_medicao IS NULL OR criterio_medicao NOT IN ('ZERO_CEM', 'VINTE_OITENTA', 'ETAPAS', 'UNIDADE');

-- Datas previstas (spec usa _prevista/_real; atual usa data_inicio/data_fim)
ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS data_inicio_prevista DATE;

ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS data_fim_prevista DATE;

-- Popular datas previstas a partir das datas existentes
UPDATE planejamento_atividades
  SET data_inicio_prevista = data_inicio,
      data_fim_prevista    = data_fim
  WHERE data_inicio_prevista IS NULL;

-- duracao_dias pode ser nullable (atividades sem duração definida ainda)
ALTER TABLE planejamento_atividades
  ALTER COLUMN duracao_dias DROP NOT NULL;

ALTER TABLE planejamento_atividades
  ALTER COLUMN data_inicio DROP NOT NULL;

ALTER TABLE planejamento_atividades
  ALTER COLUMN data_fim DROP NOT NULL;

-- ─── 4. avancos_fisicos ───────────────────────────────────────────────────────

-- semana_ref: segunda-feira da semana de apontamento
ALTER TABLE avancos_fisicos
  ADD COLUMN IF NOT EXISTS semana_ref DATE;

-- Popular semana_ref a partir de data_ref (trunca para segunda-feira)
UPDATE avancos_fisicos
  SET semana_ref = DATE_TRUNC('week', data_ref)::DATE
  WHERE semana_ref IS NULL AND data_ref IS NOT NULL;

-- perc_realizado (alias para peso_realizado_perc)
ALTER TABLE avancos_fisicos
  ADD COLUMN IF NOT EXISTS perc_realizado NUMERIC(5,2);

UPDATE avancos_fisicos
  SET perc_realizado = peso_realizado_perc
  WHERE perc_realizado IS NULL;

-- perc_planejado: % planejado para a semana (vem do cronograma)
ALTER TABLE avancos_fisicos
  ADD COLUMN IF NOT EXISTS perc_planejado NUMERIC(5,2) DEFAULT 0;

-- Índice na semana_ref
CREATE INDEX IF NOT EXISTS idx_avancos_fisicos_semana_ref
  ON avancos_fisicos(planejamento_id, semana_ref DESC);

-- ─── 5. reprogramacoes ────────────────────────────────────────────────────────

-- Spec quer início e fim separados (atual só tem data_original/data_nova)
ALTER TABLE reprogramacoes
  ADD COLUMN IF NOT EXISTS data_inicio_antiga DATE;

ALTER TABLE reprogramacoes
  ADD COLUMN IF NOT EXISTS data_fim_antiga DATE;

ALTER TABLE reprogramacoes
  ADD COLUMN IF NOT EXISTS data_inicio_nova DATE;

ALTER TABLE reprogramacoes
  ADD COLUMN IF NOT EXISTS data_fim_nova DATE;

-- Popular a partir dos campos antigos
UPDATE reprogramacoes
  SET data_inicio_antiga = data_original,
      data_inicio_nova   = data_nova
  WHERE data_inicio_antiga IS NULL;

-- impacto_estimado (opcional na spec)
ALTER TABLE reprogramacoes
  ADD COLUMN IF NOT EXISTS impacto_estimado TEXT;

-- ─── 6. evm_snapshots ────────────────────────────────────────────────────────

-- ONT = Orçamento na Tendência (Budget at Completion / IDC)
ALTER TABLE evm_snapshots
  ADD COLUMN IF NOT EXISTS ont NUMERIC(12,2);

-- PPC = Percent Plan Complete (% tarefas concluídas / planejadas na semana)
ALTER TABLE evm_snapshots
  ADD COLUMN IF NOT EXISTS ppc NUMERIC(5,2);

-- cr pode ser NULL quando não há dados do SIENGE
ALTER TABLE evm_snapshots
  ALTER COLUMN cr DROP NOT NULL;

-- ─── 7. ÍNDICES ADICIONAIS ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_planejamento_atividades_is_critica
  ON planejamento_atividades(planejamento_id, is_critica);

CREATE INDEX IF NOT EXISTS idx_planejamento_atividades_responsavel
  ON planejamento_atividades(responsavel_id);

-- ─── VALIDAÇÃO ───────────────────────────────────────────────────────────────
-- Execute após o migration para confirmar:
/*
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'obra_planejamentos',
    'planejamento_eap',
    'planejamento_atividades',
    'avancos_fisicos',
    'reprogramacoes',
    'evm_snapshots'
  )
ORDER BY table_name, ordinal_position;
*/
