-- ============================================================================
-- RLS POLICIES ONLY: Planejamento — Acesso por Obra e Papel
-- ============================================================================
-- NOTA: Execute APÓS schema_planejamento_fix.sql
-- Este arquivo contém APENAS as policies, sem criar tabelas/índices duplicados
-- ============================================================================

-- ─── HELPTER: Verifica se usuário tem acesso à obra ──────────────
CREATE OR REPLACE FUNCTION public.usuario_pode_acessar_obra(obra_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin/Diretor/Gerente/Planejamento acessam (seus respectivos níveis)
  IF EXISTS (
    SELECT 1 FROM perfis
    WHERE id = auth.uid()
      AND perfil IN ('admin', 'diretor', 'gerente', 'planejamento')
      AND ativo = true
  ) THEN
    RETURN true;
  END IF;

  -- Supervisor/Visualizador: deve ter vínculo em usuario_obra
  RETURN EXISTS (
    SELECT 1 FROM usuario_obra uo
    JOIN perfis p ON uo.usuario_id = p.id
    WHERE uo.usuario_id = auth.uid()
      AND uo.obra_id = obra_id
      AND p.ativo = true
      AND uo.papel IN ('supervisor', 'visualizador')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Habilitar RLS em todas as tabelas de planejamento ──────────────
ALTER TABLE obra_planejamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planejamento_eap ENABLE ROW LEVEL SECURITY;
ALTER TABLE planejamento_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE avancos_fisicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reprogramacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evm_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_obra ENABLE ROW LEVEL SECURITY;

-- ─── 1. obra_planejamentos ────────────────────────────────────────
CREATE POLICY "planejamento_select"
  ON obra_planejamentos
  FOR SELECT
  USING (usuario_pode_acessar_obra(obra_id));

CREATE POLICY "planejamento_insert"
  ON obra_planejamentos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'planejamento')
        AND ativo = true
    )
  );

CREATE POLICY "planejamento_update"
  ON obra_planejamentos
  FOR UPDATE
  USING (usuario_pode_acessar_obra(obra_id))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'planejamento')
        AND ativo = true
    )
  );

CREATE POLICY "planejamento_delete"
  ON obra_planejamentos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin')
        AND ativo = true
    )
  );

-- ─── 2. planejamento_eap ─────────────────────────────────────────
CREATE POLICY "eap_select"
  ON planejamento_eap
  FOR SELECT
  USING (
    usuario_pode_acessar_obra(
      (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
    )
  );

CREATE POLICY "eap_insert"
  ON planejamento_eap
  FOR INSERT
  WITH CHECK (
    (
      SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id
    ) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'planejamento')
        AND ativo = true
    )
  );

CREATE POLICY "eap_update"
  ON planejamento_eap
  FOR UPDATE
  USING (
    usuario_pode_acessar_obra(
      (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'planejamento')
        AND ativo = true
    )
  );

CREATE POLICY "eap_delete"
  ON planejamento_eap
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin')
        AND ativo = true
    )
  );

-- ─── 3. planejamento_atividades ──────────────────────────────────
CREATE POLICY "atividades_select"
  ON planejamento_atividades
  FOR SELECT
  USING (
    usuario_pode_acessar_obra(
      (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
    )
  );

CREATE POLICY "atividades_insert"
  ON planejamento_atividades
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'planejamento')
        AND ativo = true
    )
  );

CREATE POLICY "atividades_update"
  ON planejamento_atividades
  FOR UPDATE
  USING (
    usuario_pode_acessar_obra(
      (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'planejamento')
        AND ativo = true
    )
  );

CREATE POLICY "atividades_delete"
  ON planejamento_atividades
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin')
        AND ativo = true
    )
  );

-- ─── 4. avancos_fisicos ─────────────────────────────────────────
CREATE POLICY "avancos_select"
  ON avancos_fisicos
  FOR SELECT
  USING (
    usuario_pode_acessar_obra(
      (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
    )
  );

CREATE POLICY "avancos_insert"
  ON avancos_fisicos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'planejamento', 'supervisor')
        AND ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM usuario_obra uo
      JOIN perfis p ON uo.usuario_id = p.id
      WHERE uo.usuario_id = auth.uid()
        AND uo.obra_id = (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
        AND uo.papel IN ('supervisor')
        AND p.ativo = true
    )
  );

CREATE POLICY "avancos_update"
  ON avancos_fisicos
  FOR UPDATE
  USING (
    usuario_pode_acessar_obra(
      (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'planejamento', 'supervisor')
        AND ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM usuario_obra uo
      JOIN perfis p ON uo.usuario_id = p.id
      WHERE uo.usuario_id = auth.uid()
        AND uo.obra_id = (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
        AND uo.papel IN ('supervisor')
        AND p.ativo = true
    )
  );

-- ─── 5. reprogramacoes ──────────────────────────────────────────
CREATE POLICY "reprogramacoes_select"
  ON reprogramacoes
  FOR SELECT
  USING (
    usuario_pode_acessar_obra(
      (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
    )
  );

CREATE POLICY "reprogramacoes_insert"
  ON reprogramacoes
  FOR INSERT
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM perfis
        WHERE id = auth.uid()
          AND perfil IN ('admin', 'planejamento', 'gerente')
          AND ativo = true
      )
    ) OR (
      EXISTS (
        SELECT 1 FROM usuario_obra uo
        JOIN perfis p ON uo.usuario_id = p.id
        WHERE uo.usuario_id = auth.uid()
          AND uo.obra_id = (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
          AND uo.papel IN ('supervisor')
          AND p.ativo = true
      )
    )
  );

CREATE POLICY "reprogramacoes_update"
  ON reprogramacoes
  FOR UPDATE
  USING (
    usuario_pode_acessar_obra(
      (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
    )
  )
  WITH CHECK (
    -- Apenas admin/diretor/gerente podem aprovar (UPDATE status)
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'diretor', 'gerente')
        AND ativo = true
    )
  );

CREATE POLICY "reprogramacoes_delete"
  ON reprogramacoes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin')
        AND ativo = true
    )
  );

-- ─── 6. evm_snapshots ───────────────────────────────────────────
CREATE POLICY "evm_select"
  ON evm_snapshots
  FOR SELECT
  USING (
    usuario_pode_acessar_obra(
      (SELECT obra_id FROM obra_planejamentos WHERE id = planejamento_id)
    )
  );

CREATE POLICY "evm_insert"
  ON evm_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'planejamento')
        AND ativo = true
    )
  );

-- ─── RLS em usuario_obra (permite ler vínculo próprio) ─────────────
CREATE POLICY "usuario_obra_select"
  ON usuario_obra
  FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'diretor')
        AND ativo = true
    )
  );

CREATE POLICY "usuario_obra_insert"
  ON usuario_obra
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'diretor')
        AND ativo = true
    )
  );

CREATE POLICY "usuario_obra_update"
  ON usuario_obra
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'diretor')
        AND ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'diretor')
        AND ativo = true
    )
  );

CREATE POLICY "usuario_obra_delete"
  ON usuario_obra
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'diretor')
        AND ativo = true
    )
  );

-- ============================================================================
-- VALIDAR RLS ATIVADO
-- ============================================================================
-- Execute isso para confirmar:
/*
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'obra_planejamentos', 'planejamento_eap', 'planejamento_atividades',
    'avancos_fisicos', 'reprogramacoes', 'evm_snapshots', 'usuario_obra'
  )
ORDER BY tablename;

-- Esperado: rowsecurity = true (t) para todas as 7 tabelas
*/
