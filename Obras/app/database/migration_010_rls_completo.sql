-- ============================================================================
-- migration_010_rls_completo.sql
-- RLS COMPLETO — Todas as tabelas do ERP Biasi
--
-- Estratégia:
--   1. Helper auth_perfil() retorna o perfil do usuário logado
--   2. Helper auth_tem_acesso_obra(obra_id) retorna true se o usuário
--      pode ver a obra (perfil global OU vínculo em usuario_obra)
--   3. Políticas por tabela: SELECT/INSERT/UPDATE/DELETE separados
--
-- Perfis com acesso global (veem todas as obras):
--   master, admin, diretor, gerente, planejamento
-- Perfis restritos (apenas obras vinculadas):
--   supervisor, visualizador
--
-- ATENÇÃO: execute como superuser no Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Garantir que o perfil 'master' está permitido na coluna perfil da tabela perfis
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Remove e recria o check constraint para incluir 'master'
  ALTER TABLE perfis DROP CONSTRAINT IF EXISTS perfis_perfil_check;
  ALTER TABLE perfis
    ADD CONSTRAINT perfis_perfil_check
    CHECK (perfil IN (
      'master', 'admin', 'diretor', 'gerente',
      'planejamento', 'supervisor', 'visualizador', 'viewer'
    ));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint já existente ou erro ignorado: %', SQLERRM;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Funções helper
-- ----------------------------------------------------------------------------

-- Retorna o perfil do usuário autenticado (ou '' se não autenticado)
CREATE OR REPLACE FUNCTION auth_perfil()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT perfil FROM perfis WHERE id = auth.uid()),
    ''
  )
$$;

-- Retorna true se o usuário tem acesso global (todos os perfis privilegiados)
CREATE OR REPLACE FUNCTION auth_acesso_global()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth_perfil() IN ('master', 'admin', 'diretor', 'gerente', 'planejamento')
$$;

-- Retorna true se o usuário pode ver uma obra específica
-- (acesso global OU vínculo explícito em usuario_obra)
CREATE OR REPLACE FUNCTION auth_tem_acesso_obra(p_obra_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth_acesso_global()
    OR EXISTS (
      SELECT 1 FROM usuario_obra
      WHERE usuario_id = auth.uid()
        AND obra_id = p_obra_id
    )
$$;

-- Retorna true se o usuário é ativo (não desativado)
CREATE OR REPLACE FUNCTION auth_ativo()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ativo FROM perfis WHERE id = auth.uid()),
    false
  )
$$;

-- ----------------------------------------------------------------------------
-- 2. Tabela: perfis
-- ----------------------------------------------------------------------------
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfis_select" ON perfis;
DROP POLICY IF EXISTS "perfis_insert" ON perfis;
DROP POLICY IF EXISTS "perfis_update" ON perfis;
DROP POLICY IF EXISTS "perfis_delete" ON perfis;

-- SELECT: qualquer usuário autenticado pode ler perfis (necessário para joins)
CREATE POLICY "perfis_select" ON perfis
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: apenas master/admin criam usuários (ou trigger SSO via service_role)
CREATE POLICY "perfis_insert" ON perfis
  FOR INSERT TO authenticated
  WITH CHECK (auth_perfil() IN ('master', 'admin'));

-- UPDATE: master/admin editam qualquer um; usuário edita apenas o próprio perfil
CREATE POLICY "perfis_update" ON perfis
  FOR UPDATE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin')
    OR id = auth.uid()
  )
  WITH CHECK (
    auth_perfil() IN ('master', 'admin')
    OR id = auth.uid()
  );

-- DELETE: apenas master pode deletar (soft delete preferido)
CREATE POLICY "perfis_delete" ON perfis
  FOR DELETE TO authenticated
  USING (auth_perfil() = 'master');

-- ----------------------------------------------------------------------------
-- 3. Tabela: obras
-- ----------------------------------------------------------------------------
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obras_select" ON obras;
DROP POLICY IF EXISTS "obras_insert" ON obras;
DROP POLICY IF EXISTS "obras_update" ON obras;
DROP POLICY IF EXISTS "obras_delete" ON obras;

-- SELECT: acesso global vê todas; restrito vê apenas as vinculadas
CREATE POLICY "obras_select" ON obras
  FOR SELECT TO authenticated
  USING (
    auth_acesso_global()
    OR EXISTS (
      SELECT 1 FROM usuario_obra
      WHERE usuario_id = auth.uid() AND obra_id = obras.id
    )
  );

-- INSERT/UPDATE: apenas master, admin, diretor e gerente
CREATE POLICY "obras_insert" ON obras
  FOR INSERT TO authenticated
  WITH CHECK (auth_perfil() IN ('master', 'admin', 'diretor', 'gerente'));

CREATE POLICY "obras_update" ON obras
  FOR UPDATE TO authenticated
  USING (auth_perfil() IN ('master', 'admin', 'diretor', 'gerente'))
  WITH CHECK (auth_perfil() IN ('master', 'admin', 'diretor', 'gerente'));

-- DELETE: apenas master/admin
CREATE POLICY "obras_delete" ON obras
  FOR DELETE TO authenticated
  USING (auth_perfil() IN ('master', 'admin'));

-- ----------------------------------------------------------------------------
-- 4. Tabela: usuario_obra (vínculos)
-- ----------------------------------------------------------------------------
ALTER TABLE usuario_obra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_obra_select" ON usuario_obra;
DROP POLICY IF EXISTS "usuario_obra_insert" ON usuario_obra;
DROP POLICY IF EXISTS "usuario_obra_delete" ON usuario_obra;

-- SELECT: master/admin/gerente veem todos; outros veem os próprios vínculos
CREATE POLICY "usuario_obra_select" ON usuario_obra
  FOR SELECT TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    OR usuario_id = auth.uid()
  );

-- INSERT/DELETE: apenas master/admin/gerente
CREATE POLICY "usuario_obra_insert" ON usuario_obra
  FOR INSERT TO authenticated
  WITH CHECK (auth_perfil() IN ('master', 'admin', 'gerente'));

CREATE POLICY "usuario_obra_delete" ON usuario_obra
  FOR DELETE TO authenticated
  USING (auth_perfil() IN ('master', 'admin', 'gerente'));

-- ----------------------------------------------------------------------------
-- 5. Tabela: contratos
-- ----------------------------------------------------------------------------
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contratos_select" ON contratos;
DROP POLICY IF EXISTS "contratos_insert" ON contratos;
DROP POLICY IF EXISTS "contratos_update" ON contratos;
DROP POLICY IF EXISTS "contratos_delete" ON contratos;

CREATE POLICY "contratos_select" ON contratos
  FOR SELECT TO authenticated
  USING (auth_tem_acesso_obra(obra_id));

CREATE POLICY "contratos_insert" ON contratos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND auth_tem_acesso_obra(obra_id)
  );

CREATE POLICY "contratos_update" ON contratos
  FOR UPDATE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND auth_tem_acesso_obra(obra_id)
  )
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND auth_tem_acesso_obra(obra_id)
  );

CREATE POLICY "contratos_delete" ON contratos
  FOR DELETE TO authenticated
  USING (auth_perfil() IN ('master', 'admin'));

-- ----------------------------------------------------------------------------
-- 6. Tabela: medicoes_contrato
-- ----------------------------------------------------------------------------
ALTER TABLE medicoes_contrato ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medicoes_contrato_select" ON medicoes_contrato;
DROP POLICY IF EXISTS "medicoes_contrato_insert" ON medicoes_contrato;
DROP POLICY IF EXISTS "medicoes_contrato_update" ON medicoes_contrato;
DROP POLICY IF EXISTS "medicoes_contrato_delete" ON medicoes_contrato;

CREATE POLICY "medicoes_contrato_select" ON medicoes_contrato
  FOR SELECT TO authenticated
  USING (auth_tem_acesso_obra(obra_id));

CREATE POLICY "medicoes_contrato_insert" ON medicoes_contrato
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
    AND auth_tem_acesso_obra(obra_id)
  );

CREATE POLICY "medicoes_contrato_update" ON medicoes_contrato
  FOR UPDATE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND auth_tem_acesso_obra(obra_id)
  )
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND auth_tem_acesso_obra(obra_id)
  );

CREATE POLICY "medicoes_contrato_delete" ON medicoes_contrato
  FOR DELETE TO authenticated
  USING (auth_perfil() IN ('master', 'admin'));

-- ----------------------------------------------------------------------------
-- 7. Tabela: pedidos_compra
-- ----------------------------------------------------------------------------
ALTER TABLE pedidos_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedidos_compra_select" ON pedidos_compra;
DROP POLICY IF EXISTS "pedidos_compra_insert" ON pedidos_compra;
DROP POLICY IF EXISTS "pedidos_compra_update" ON pedidos_compra;
DROP POLICY IF EXISTS "pedidos_compra_delete" ON pedidos_compra;

CREATE POLICY "pedidos_compra_select" ON pedidos_compra
  FOR SELECT TO authenticated
  USING (auth_tem_acesso_obra(obra_id));

CREATE POLICY "pedidos_compra_insert" ON pedidos_compra
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
    AND auth_tem_acesso_obra(obra_id)
  );

CREATE POLICY "pedidos_compra_update" ON pedidos_compra
  FOR UPDATE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
    AND auth_tem_acesso_obra(obra_id)
  )
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
    AND auth_tem_acesso_obra(obra_id)
  );

CREATE POLICY "pedidos_compra_delete" ON pedidos_compra
  FOR DELETE TO authenticated
  USING (auth_perfil() IN ('master', 'admin'));

-- ----------------------------------------------------------------------------
-- 8. Tabela: obra_planejamentos
-- ----------------------------------------------------------------------------
ALTER TABLE obra_planejamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obra_planejamentos_select" ON obra_planejamentos;
DROP POLICY IF EXISTS "obra_planejamentos_insert" ON obra_planejamentos;
DROP POLICY IF EXISTS "obra_planejamentos_update" ON obra_planejamentos;
DROP POLICY IF EXISTS "obra_planejamentos_delete" ON obra_planejamentos;

CREATE POLICY "obra_planejamentos_select" ON obra_planejamentos
  FOR SELECT TO authenticated
  USING (auth_tem_acesso_obra(obra_id));

CREATE POLICY "obra_planejamentos_insert" ON obra_planejamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND auth_tem_acesso_obra(obra_id)
  );

CREATE POLICY "obra_planejamentos_update" ON obra_planejamentos
  FOR UPDATE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND auth_tem_acesso_obra(obra_id)
  )
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND auth_tem_acesso_obra(obra_id)
  );

CREATE POLICY "obra_planejamentos_delete" ON obra_planejamentos
  FOR DELETE TO authenticated
  USING (auth_perfil() IN ('master', 'admin'));

-- ----------------------------------------------------------------------------
-- 9. Tabela: planejamento_eap
-- ----------------------------------------------------------------------------
ALTER TABLE planejamento_eap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planejamento_eap_select" ON planejamento_eap;
DROP POLICY IF EXISTS "planejamento_eap_insert" ON planejamento_eap;
DROP POLICY IF EXISTS "planejamento_eap_update" ON planejamento_eap;
DROP POLICY IF EXISTS "planejamento_eap_delete" ON planejamento_eap;

CREATE POLICY "planejamento_eap_select" ON planejamento_eap
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_eap.planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "planejamento_eap_insert" ON planejamento_eap
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "planejamento_eap_update" ON planejamento_eap
  FOR UPDATE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_eap.planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  )
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "planejamento_eap_delete" ON planejamento_eap
  FOR DELETE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'planejamento')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_eap.planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 10. Tabela: planejamento_atividades
-- ----------------------------------------------------------------------------
ALTER TABLE planejamento_atividades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planejamento_atividades_select" ON planejamento_atividades;
DROP POLICY IF EXISTS "planejamento_atividades_insert" ON planejamento_atividades;
DROP POLICY IF EXISTS "planejamento_atividades_update" ON planejamento_atividades;
DROP POLICY IF EXISTS "planejamento_atividades_delete" ON planejamento_atividades;

CREATE POLICY "planejamento_atividades_select" ON planejamento_atividades
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_atividades.planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "planejamento_atividades_insert" ON planejamento_atividades
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "planejamento_atividades_update" ON planejamento_atividades
  FOR UPDATE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_atividades.planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  )
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "planejamento_atividades_delete" ON planejamento_atividades
  FOR DELETE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'planejamento')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_atividades.planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 11. Tabela: planejamento_predecessoras
-- ----------------------------------------------------------------------------
ALTER TABLE planejamento_predecessoras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planejamento_predecessoras_select" ON planejamento_predecessoras;
DROP POLICY IF EXISTS "planejamento_predecessoras_insert" ON planejamento_predecessoras;
DROP POLICY IF EXISTS "planejamento_predecessoras_delete" ON planejamento_predecessoras;

CREATE POLICY "planejamento_predecessoras_select" ON planejamento_predecessoras
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM planejamento_atividades pa
        JOIN obra_planejamentos op ON op.id = pa.planejamento_id
      WHERE pa.id = planejamento_predecessoras.atividade_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "planejamento_predecessoras_insert" ON planejamento_predecessoras
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND EXISTS (
      SELECT 1 FROM planejamento_atividades pa
        JOIN obra_planejamentos op ON op.id = pa.planejamento_id
      WHERE pa.id = atividade_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "planejamento_predecessoras_delete" ON planejamento_predecessoras
  FOR DELETE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND EXISTS (
      SELECT 1 FROM planejamento_atividades pa
        JOIN obra_planejamentos op ON op.id = pa.planejamento_id
      WHERE pa.id = planejamento_predecessoras.atividade_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 12. Tabela: avancos_fisicos
-- ----------------------------------------------------------------------------
ALTER TABLE avancos_fisicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avancos_fisicos_select" ON avancos_fisicos;
DROP POLICY IF EXISTS "avancos_fisicos_insert" ON avancos_fisicos;
DROP POLICY IF EXISTS "avancos_fisicos_update" ON avancos_fisicos;
DROP POLICY IF EXISTS "avancos_fisicos_delete" ON avancos_fisicos;

CREATE POLICY "avancos_fisicos_select" ON avancos_fisicos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM planejamento_atividades pa
        JOIN obra_planejamentos op ON op.id = pa.planejamento_id
      WHERE pa.id = avancos_fisicos.atividade_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "avancos_fisicos_insert" ON avancos_fisicos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
    AND EXISTS (
      SELECT 1 FROM planejamento_atividades pa
        JOIN obra_planejamentos op ON op.id = pa.planejamento_id
      WHERE pa.id = atividade_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "avancos_fisicos_update" ON avancos_fisicos
  FOR UPDATE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
  )
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
  );

CREATE POLICY "avancos_fisicos_delete" ON avancos_fisicos
  FOR DELETE TO authenticated
  USING (auth_perfil() IN ('master', 'admin'));

-- ----------------------------------------------------------------------------
-- 13. Tabela: reprogramacoes
-- ----------------------------------------------------------------------------
ALTER TABLE reprogramacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reprogramacoes_select" ON reprogramacoes;
DROP POLICY IF EXISTS "reprogramacoes_insert" ON reprogramacoes;
DROP POLICY IF EXISTS "reprogramacoes_update" ON reprogramacoes;
DROP POLICY IF EXISTS "reprogramacoes_delete" ON reprogramacoes;

CREATE POLICY "reprogramacoes_select" ON reprogramacoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = reprogramacoes.planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "reprogramacoes_insert" ON reprogramacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

-- Apenas master/admin/gerente/diretor podem aprovar (atualizar status)
CREATE POLICY "reprogramacoes_update" ON reprogramacoes
  FOR UPDATE TO authenticated
  USING (
    auth_perfil() IN ('master', 'admin', 'diretor', 'gerente')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = reprogramacoes.planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  )
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'diretor', 'gerente')
  );

CREATE POLICY "reprogramacoes_delete" ON reprogramacoes
  FOR DELETE TO authenticated
  USING (auth_perfil() IN ('master', 'admin'));

-- ----------------------------------------------------------------------------
-- 14. Tabela: evm_snapshots
-- ----------------------------------------------------------------------------
ALTER TABLE evm_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evm_snapshots_select" ON evm_snapshots;
DROP POLICY IF EXISTS "evm_snapshots_insert" ON evm_snapshots;
DROP POLICY IF EXISTS "evm_snapshots_delete" ON evm_snapshots;

CREATE POLICY "evm_snapshots_select" ON evm_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = evm_snapshots.planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "evm_snapshots_insert" ON evm_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento')
    AND EXISTS (
      SELECT 1 FROM obra_planejamentos op
      WHERE op.id = planejamento_id
        AND auth_tem_acesso_obra(op.obra_id)
    )
  );

CREATE POLICY "evm_snapshots_delete" ON evm_snapshots
  FOR DELETE TO authenticated
  USING (auth_perfil() IN ('master', 'admin'));

-- ----------------------------------------------------------------------------
-- 15. Tabela: configuracoes
-- ----------------------------------------------------------------------------
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuracoes_select" ON configuracoes;
DROP POLICY IF EXISTS "configuracoes_insert" ON configuracoes;
DROP POLICY IF EXISTS "configuracoes_update" ON configuracoes;
DROP POLICY IF EXISTS "configuracoes_delete" ON configuracoes;

-- Qualquer autenticado pode ler configurações públicas do sistema
CREATE POLICY "configuracoes_select" ON configuracoes
  FOR SELECT TO authenticated
  USING (true);

-- Apenas master/admin escrevem configurações
CREATE POLICY "configuracoes_insert" ON configuracoes
  FOR INSERT TO authenticated
  WITH CHECK (auth_perfil() IN ('master', 'admin'));

CREATE POLICY "configuracoes_update" ON configuracoes
  FOR UPDATE TO authenticated
  USING (auth_perfil() IN ('master', 'admin'))
  WITH CHECK (auth_perfil() IN ('master', 'admin'));

CREATE POLICY "configuracoes_delete" ON configuracoes
  FOR DELETE TO authenticated
  USING (auth_perfil() IN ('master', 'admin'));

-- ----------------------------------------------------------------------------
-- 16. Tabelas opcionais (criar políticas se existirem)
-- ----------------------------------------------------------------------------

-- diario_obra
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'diario_obra') THEN
    ALTER TABLE diario_obra ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "diario_obra_select" ON diario_obra;
    DROP POLICY IF EXISTS "diario_obra_insert" ON diario_obra;
    DROP POLICY IF EXISTS "diario_obra_update" ON diario_obra;

    CREATE POLICY "diario_obra_select" ON diario_obra
      FOR SELECT TO authenticated
      USING (auth_tem_acesso_obra(obra_id));

    CREATE POLICY "diario_obra_insert" ON diario_obra
      FOR INSERT TO authenticated
      WITH CHECK (
        auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
        AND auth_tem_acesso_obra(obra_id)
      );

    CREATE POLICY "diario_obra_update" ON diario_obra
      FOR UPDATE TO authenticated
      USING (
        (auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor'))
        AND auth_tem_acesso_obra(obra_id)
      )
      WITH CHECK (
        (auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor'))
        AND auth_tem_acesso_obra(obra_id)
      );
  END IF;
END $$;

-- tarefas
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tarefas') THEN
    ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tarefas_select" ON tarefas;
    DROP POLICY IF EXISTS "tarefas_insert" ON tarefas;
    DROP POLICY IF EXISTS "tarefas_update" ON tarefas;

    CREATE POLICY "tarefas_select" ON tarefas
      FOR SELECT TO authenticated
      USING (auth_tem_acesso_obra(obra_id));

    CREATE POLICY "tarefas_insert" ON tarefas
      FOR INSERT TO authenticated
      WITH CHECK (
        auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
        AND auth_tem_acesso_obra(obra_id)
      );

    CREATE POLICY "tarefas_update" ON tarefas
      FOR UPDATE TO authenticated
      USING (
        auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
        AND auth_tem_acesso_obra(obra_id)
      )
      WITH CHECK (
        auth_perfil() IN ('master', 'admin', 'gerente', 'planejamento', 'supervisor')
        AND auth_tem_acesso_obra(obra_id)
      );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 17. Permissão de execução das funções helper para role authenticated
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION auth_perfil()               TO authenticated;
GRANT EXECUTE ON FUNCTION auth_acesso_global()        TO authenticated;
GRANT EXECUTE ON FUNCTION auth_tem_acesso_obra(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION auth_ativo()                TO authenticated;

-- ----------------------------------------------------------------------------
-- Verificação final
-- ----------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
