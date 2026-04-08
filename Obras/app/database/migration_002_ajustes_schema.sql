-- ============================================================================
-- migration_002_ajustes_schema.sql
-- Ajustes no schema de planejamento — 5 correções
-- Executar no SQL Editor do Supabase
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- AJUSTE 1: campo tipo em planejamento_eap (CRÍTICO)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE planejamento_eap
  ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('CC', 'E', 'SE', 'S'));


-- ─────────────────────────────────────────────────────────────────────────────
-- AJUSTE 2: remover NOT NULL de duracao_dias, data_inicio, data_fim (CRÍTICO)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE planejamento_atividades
  ALTER COLUMN duracao_dias DROP NOT NULL,
  ALTER COLUMN data_inicio  DROP NOT NULL,
  ALTER COLUMN data_fim     DROP NOT NULL;

-- Substituir constraint de datas para aceitar NULLs
ALTER TABLE planejamento_atividades
  DROP CONSTRAINT IF EXISTS data_fim_after_inicio;

ALTER TABLE planejamento_atividades
  ADD CONSTRAINT data_fim_after_inicio
  CHECK (data_fim IS NULL OR data_inicio IS NULL OR data_fim >= data_inicio);


-- ─────────────────────────────────────────────────────────────────────────────
-- AJUSTE 3: quantidade, unidade e criterio_medicao em planejamento_atividades
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE planejamento_atividades
  ADD COLUMN IF NOT EXISTS quantidade       NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS unidade          TEXT,
  ADD COLUMN IF NOT EXISTS criterio_medicao TEXT
    CHECK (criterio_medicao IN (
      'ZERO_CEM','VINTE_OITENTA','ETAPAS','UNIDADE','QUANTIDADE'
    ))
    DEFAULT 'ZERO_CEM';


-- ─────────────────────────────────────────────────────────────────────────────
-- AJUSTE 4: campo ppc em evm_snapshots
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE evm_snapshots
  ADD COLUMN IF NOT EXISTS ppc NUMERIC(5,2);


-- ─────────────────────────────────────────────────────────────────────────────
-- AJUSTE 5: RLS — políticas omitidas para planejamento, gerente e supervisor
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: garante RLS ativo nas tabelas
ALTER TABLE planejamento_eap          ENABLE ROW LEVEL SECURITY;
ALTER TABLE planejamento_atividades   ENABLE ROW LEVEL SECURITY;
ALTER TABLE avancos_fisicos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reprogramacoes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE evm_snapshots             ENABLE ROW LEVEL SECURITY;

-- ── planejamento_eap ────────────────────────────────────────────────────────

-- perfil planejamento: tudo
DROP POLICY IF EXISTS "eap_planejamento_all" ON planejamento_eap;
CREATE POLICY "eap_planejamento_all" ON planejamento_eap
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'planejamento'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'planejamento'));

-- perfil gerente: somente leitura
DROP POLICY IF EXISTS "eap_gerente_select" ON planejamento_eap;
CREATE POLICY "eap_gerente_select" ON planejamento_eap
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'gerente'));

-- perfil supervisor: somente leitura (obras autorizadas)
DROP POLICY IF EXISTS "eap_supervisor_select" ON planejamento_eap;
CREATE POLICY "eap_supervisor_select" ON planejamento_eap
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor'
    )
    AND EXISTS (
      SELECT 1
        FROM obra_planejamentos op
        JOIN usuario_obra uo ON uo.obra_id = op.obra_id
       WHERE op.id = planejamento_eap.planejamento_id
         AND uo.usuario_id = auth.uid()
    )
  );


-- ── planejamento_atividades ─────────────────────────────────────────────────

-- perfil planejamento: tudo
DROP POLICY IF EXISTS "atividades_planejamento_all" ON planejamento_atividades;
CREATE POLICY "atividades_planejamento_all" ON planejamento_atividades
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'planejamento'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'planejamento'));

-- perfil gerente: somente leitura
DROP POLICY IF EXISTS "atividades_gerente_select" ON planejamento_atividades;
CREATE POLICY "atividades_gerente_select" ON planejamento_atividades
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'gerente'));

-- perfil supervisor: somente leitura (obras autorizadas)
DROP POLICY IF EXISTS "atividades_supervisor_select" ON planejamento_atividades;
CREATE POLICY "atividades_supervisor_select" ON planejamento_atividades
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor')
    AND EXISTS (
      SELECT 1
        FROM obra_planejamentos op
        JOIN usuario_obra uo ON uo.obra_id = op.obra_id
       WHERE op.id = planejamento_atividades.planejamento_id
         AND uo.usuario_id = auth.uid()
    )
  );


-- ── avancos_fisicos ─────────────────────────────────────────────────────────

-- perfil planejamento: tudo
DROP POLICY IF EXISTS "avancos_planejamento_all" ON avancos_fisicos;
CREATE POLICY "avancos_planejamento_all" ON avancos_fisicos
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'planejamento'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'planejamento'));

-- perfil gerente: somente leitura
DROP POLICY IF EXISTS "avancos_gerente_select" ON avancos_fisicos;
CREATE POLICY "avancos_gerente_select" ON avancos_fisicos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'gerente'));

-- perfil supervisor: leitura + insert/update (obras autorizadas)
DROP POLICY IF EXISTS "avancos_supervisor_select" ON avancos_fisicos;
CREATE POLICY "avancos_supervisor_select" ON avancos_fisicos
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor')
    AND EXISTS (
      SELECT 1
        FROM planejamento_atividades pa
        JOIN obra_planejamentos op ON op.id = pa.planejamento_id
        JOIN usuario_obra uo ON uo.obra_id = op.obra_id
       WHERE pa.id = avancos_fisicos.atividade_id
         AND uo.usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "avancos_supervisor_upsert" ON avancos_fisicos;
CREATE POLICY "avancos_supervisor_upsert" ON avancos_fisicos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor')
    AND EXISTS (
      SELECT 1
        FROM planejamento_atividades pa
        JOIN obra_planejamentos op ON op.id = pa.planejamento_id
        JOIN usuario_obra uo ON uo.obra_id = op.obra_id
       WHERE pa.id = avancos_fisicos.atividade_id
         AND uo.usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "avancos_supervisor_update" ON avancos_fisicos;
CREATE POLICY "avancos_supervisor_update" ON avancos_fisicos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor')
    AND EXISTS (
      SELECT 1
        FROM planejamento_atividades pa
        JOIN obra_planejamentos op ON op.id = pa.planejamento_id
        JOIN usuario_obra uo ON uo.obra_id = op.obra_id
       WHERE pa.id = avancos_fisicos.atividade_id
         AND uo.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor')
  );


-- ── reprogramacoes ──────────────────────────────────────────────────────────

-- perfil planejamento: tudo
DROP POLICY IF EXISTS "reprog_planejamento_all" ON reprogramacoes;
CREATE POLICY "reprog_planejamento_all" ON reprogramacoes
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'planejamento'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'planejamento'));

-- perfil gerente: leitura + insert/update
DROP POLICY IF EXISTS "reprog_gerente_select" ON reprogramacoes;
CREATE POLICY "reprog_gerente_select" ON reprogramacoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'gerente'));

DROP POLICY IF EXISTS "reprog_gerente_upsert" ON reprogramacoes;
CREATE POLICY "reprog_gerente_upsert" ON reprogramacoes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'gerente'));

DROP POLICY IF EXISTS "reprog_gerente_update" ON reprogramacoes;
CREATE POLICY "reprog_gerente_update" ON reprogramacoes
  FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'gerente'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'gerente'));

-- perfil supervisor: leitura + insert/update (obras autorizadas)
DROP POLICY IF EXISTS "reprog_supervisor_select" ON reprogramacoes;
CREATE POLICY "reprog_supervisor_select" ON reprogramacoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor')
    AND EXISTS (
      SELECT 1
        FROM obra_planejamentos op
        JOIN usuario_obra uo ON uo.obra_id = op.obra_id
       WHERE op.id = reprogramacoes.planejamento_id
         AND uo.usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "reprog_supervisor_upsert" ON reprogramacoes;
CREATE POLICY "reprog_supervisor_upsert" ON reprogramacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor')
    AND EXISTS (
      SELECT 1
        FROM obra_planejamentos op
        JOIN usuario_obra uo ON uo.obra_id = op.obra_id
       WHERE op.id = reprogramacoes.planejamento_id
         AND uo.usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "reprog_supervisor_update" ON reprogramacoes;
CREATE POLICY "reprog_supervisor_update" ON reprogramacoes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor')
    AND EXISTS (
      SELECT 1
        FROM obra_planejamentos op
        JOIN usuario_obra uo ON uo.obra_id = op.obra_id
       WHERE op.id = reprogramacoes.planejamento_id
         AND uo.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor')
  );


-- ── evm_snapshots ────────────────────────────────────────────────────────────

-- perfil planejamento: tudo
DROP POLICY IF EXISTS "evm_planejamento_all" ON evm_snapshots;
CREATE POLICY "evm_planejamento_all" ON evm_snapshots
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'planejamento'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'planejamento'));

-- perfil gerente: somente leitura
DROP POLICY IF EXISTS "evm_gerente_select" ON evm_snapshots;
CREATE POLICY "evm_gerente_select" ON evm_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'gerente'));

-- perfil supervisor: somente leitura (obras autorizadas)
DROP POLICY IF EXISTS "evm_supervisor_select" ON evm_snapshots;
CREATE POLICY "evm_supervisor_select" ON evm_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'supervisor')
    AND EXISTS (
      SELECT 1
        FROM obra_planejamentos op
        JOIN usuario_obra uo ON uo.obra_id = op.obra_id
       WHERE op.id = evm_snapshots.planejamento_id
         AND uo.usuario_id = auth.uid()
    )
  );
