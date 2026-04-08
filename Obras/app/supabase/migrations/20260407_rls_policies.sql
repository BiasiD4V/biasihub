-- ============================================================================
-- Migração: Row Level Security (RLS)
-- Data: 2026-04-07
-- Descrição: Políticas de segurança no banco — garante que mesmo chamadas
--            diretas à API do Supabase respeitem as permissões do ERP.
--            Complementa (não substitui) a segurança do frontend.
-- ============================================================================

-- ─── FUNÇÃO AUXILIAR: retorna o perfil do usuário logado ─────────────────
CREATE OR REPLACE FUNCTION auth_perfil()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT perfil FROM perfis WHERE id = auth.uid() AND ativo = true AND deletado_em IS NULL
$$;

-- ─── FUNÇÃO AUXILIAR: verifica acesso global (vê todas as obras) ──────────
CREATE OR REPLACE FUNCTION tem_acesso_global()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT auth_perfil() = ANY(ARRAY['master','admin','diretor','gerente','planejamento'])
$$;

-- ─── FUNÇÃO AUXILIAR: verifica se usuário pode ver uma obra específica ────
CREATE OR REPLACE FUNCTION pode_ver_obra(p_obra_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tem_acesso_global()
    OR EXISTS (
      SELECT 1 FROM usuario_obra
      WHERE usuario_id = auth.uid() AND obra_id = p_obra_id
    )
$$;

-- ─── FUNÇÃO AUXILIAR: verifica se tem uma permissão específica ───────────
-- Considera a tabela de overrides também.
CREATE OR REPLACE FUNCTION tem_permissao(p_permissao text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT CASE
    -- master sempre tem tudo
    WHEN auth_perfil() = 'master' THEN true
    -- verifica override individual (tem prioridade)
    WHEN EXISTS (
      SELECT 1 FROM usuario_permissoes_override
      WHERE usuario_id = auth.uid()
        AND permissao = p_permissao
        AND (validade_em IS NULL OR validade_em > now())
    ) THEN (
      SELECT concedida FROM usuario_permissoes_override
      WHERE usuario_id = auth.uid()
        AND permissao = p_permissao
        AND (validade_em IS NULL OR validade_em > now())
      LIMIT 1
    )
    -- fallback: verifica na configuração de permissões do banco
    ELSE EXISTS (
      SELECT 1 FROM configuracoes c
      WHERE c.chave = 'permissoes_perfil'
        AND (c.valor->auth_perfil()) ? p_permissao
    )
  END
$$;

-- ============================================================================
-- TABELA: perfis
-- ============================================================================
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ver perfis ativos (necessário para selects de usuário)
DROP POLICY IF EXISTS "perfis_select" ON perfis;
CREATE POLICY "perfis_select" ON perfis
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND deletado_em IS NULL
  );

-- Somente admin/master podem inserir perfis
DROP POLICY IF EXISTS "perfis_insert" ON perfis;
CREATE POLICY "perfis_insert" ON perfis
  FOR INSERT WITH CHECK (
    auth_perfil() = ANY(ARRAY['master','admin'])
    -- Exceção: inserção do próprio perfil durante SSO (novo usuário)
    OR auth.uid() = id
  );

-- Admin/master podem atualizar qualquer perfil; usuário pode atualizar o próprio
DROP POLICY IF EXISTS "perfis_update" ON perfis;
CREATE POLICY "perfis_update" ON perfis
  FOR UPDATE USING (
    auth_perfil() = ANY(ARRAY['master','admin'])
    OR auth.uid() = id
  );

-- Apenas master pode deletar perfis (soft delete feito via update pelo admin)
DROP POLICY IF EXISTS "perfis_delete" ON perfis;
CREATE POLICY "perfis_delete" ON perfis
  FOR DELETE USING (auth_perfil() = 'master');

-- ============================================================================
-- TABELA: obras
-- ============================================================================
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver apenas obras às quais tem acesso
DROP POLICY IF EXISTS "obras_select" ON obras;
CREATE POLICY "obras_select" ON obras
  FOR SELECT USING (pode_ver_obra(id));

-- Somente quem tem 'cadastrar_obras' pode inserir
DROP POLICY IF EXISTS "obras_insert" ON obras;
CREATE POLICY "obras_insert" ON obras
  FOR INSERT WITH CHECK (tem_permissao('cadastrar_obras'));

-- Somente quem tem 'cadastrar_obras' pode atualizar — e deve ter acesso à obra
DROP POLICY IF EXISTS "obras_update" ON obras;
CREATE POLICY "obras_update" ON obras
  FOR UPDATE USING (
    pode_ver_obra(id) AND tem_permissao('cadastrar_obras')
  );

-- Apenas master pode deletar obras
DROP POLICY IF EXISTS "obras_delete" ON obras;
CREATE POLICY "obras_delete" ON obras
  FOR DELETE USING (auth_perfil() = 'master');

-- ============================================================================
-- TABELA: usuario_obra (vínculos usuário ↔ obra)
-- ============================================================================
ALTER TABLE usuario_obra ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver seus próprios vínculos; admin/master vêem todos
DROP POLICY IF EXISTS "usuario_obra_select" ON usuario_obra;
CREATE POLICY "usuario_obra_select" ON usuario_obra
  FOR SELECT USING (
    tem_acesso_global()
    OR usuario_id = auth.uid()
  );

-- Somente admin/master podem gerenciar vínculos
DROP POLICY IF EXISTS "usuario_obra_insert" ON usuario_obra;
CREATE POLICY "usuario_obra_insert" ON usuario_obra
  FOR INSERT WITH CHECK (auth_perfil() = ANY(ARRAY['master','admin']));

DROP POLICY IF EXISTS "usuario_obra_delete" ON usuario_obra;
CREATE POLICY "usuario_obra_delete" ON usuario_obra
  FOR DELETE USING (auth_perfil() = ANY(ARRAY['master','admin']));

-- ============================================================================
-- TABELA: usuario_permissoes_override
-- ============================================================================
ALTER TABLE usuario_permissoes_override ENABLE ROW LEVEL SECURITY;

-- Admin/master vêem todos; usuário vê apenas os próprios overrides
DROP POLICY IF EXISTS "upo_select" ON usuario_permissoes_override;
CREATE POLICY "upo_select" ON usuario_permissoes_override
  FOR SELECT USING (
    auth_perfil() = ANY(ARRAY['master','admin'])
    OR usuario_id = auth.uid()
  );

-- Somente admin/master podem criar/editar/excluir overrides
DROP POLICY IF EXISTS "upo_insert" ON usuario_permissoes_override;
CREATE POLICY "upo_insert" ON usuario_permissoes_override
  FOR INSERT WITH CHECK (auth_perfil() = ANY(ARRAY['master','admin']));

DROP POLICY IF EXISTS "upo_update" ON usuario_permissoes_override;
CREATE POLICY "upo_update" ON usuario_permissoes_override
  FOR UPDATE USING (auth_perfil() = ANY(ARRAY['master','admin']));

DROP POLICY IF EXISTS "upo_delete" ON usuario_permissoes_override;
CREATE POLICY "upo_delete" ON usuario_permissoes_override
  FOR DELETE USING (auth_perfil() = ANY(ARRAY['master','admin']));

-- ============================================================================
-- TABELA: contratos
-- ============================================================================
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contratos_select" ON contratos;
CREATE POLICY "contratos_select" ON contratos
  FOR SELECT USING (pode_ver_obra(obra_id) AND tem_permissao('ver_contratos'));

DROP POLICY IF EXISTS "contratos_insert" ON contratos;
CREATE POLICY "contratos_insert" ON contratos
  FOR INSERT WITH CHECK (pode_ver_obra(obra_id) AND tem_permissao('ver_contratos'));

DROP POLICY IF EXISTS "contratos_update" ON contratos;
CREATE POLICY "contratos_update" ON contratos
  FOR UPDATE USING (pode_ver_obra(obra_id) AND tem_permissao('ver_contratos'));

-- ============================================================================
-- TABELA: medicoes (e boletins de medição)
-- ============================================================================
ALTER TABLE medicoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medicoes_select" ON medicoes;
CREATE POLICY "medicoes_select" ON medicoes
  FOR SELECT USING (pode_ver_obra(obra_id) AND tem_permissao('ver_medicoes'));

DROP POLICY IF EXISTS "medicoes_insert" ON medicoes;
CREATE POLICY "medicoes_insert" ON medicoes
  FOR INSERT WITH CHECK (pode_ver_obra(obra_id) AND tem_permissao('lancar_medicao'));

DROP POLICY IF EXISTS "medicoes_update" ON medicoes;
CREATE POLICY "medicoes_update" ON medicoes
  FOR UPDATE USING (
    pode_ver_obra(obra_id)
    AND (tem_permissao('lancar_medicao') OR tem_permissao('aprovar_medicoes'))
  );

-- ============================================================================
-- TABELA: diario_obra (entradas do diário)
-- ============================================================================
ALTER TABLE diario_obra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diario_select" ON diario_obra;
CREATE POLICY "diario_select" ON diario_obra
  FOR SELECT USING (pode_ver_obra(obra_id) AND tem_permissao('diario_obra'));

DROP POLICY IF EXISTS "diario_insert" ON diario_obra;
CREATE POLICY "diario_insert" ON diario_obra
  FOR INSERT WITH CHECK (pode_ver_obra(obra_id) AND tem_permissao('diario_obra'));

DROP POLICY IF EXISTS "diario_update" ON diario_obra;
CREATE POLICY "diario_update" ON diario_obra
  FOR UPDATE USING (pode_ver_obra(obra_id) AND tem_permissao('diario_obra'));

-- ============================================================================
-- TABELA: configuracoes (permissões dinâmicas etc.)
-- ============================================================================
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados lêem configurações (necessário para permissoesConfig)
DROP POLICY IF EXISTS "config_select" ON configuracoes;
CREATE POLICY "config_select" ON configuracoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Somente admin/master podem alterar configurações
DROP POLICY IF EXISTS "config_upsert" ON configuracoes;
CREATE POLICY "config_upsert" ON configuracoes
  FOR ALL USING (auth_perfil() = ANY(ARRAY['master','admin']));

-- ============================================================================
-- TABELA: solicitacoes_acesso
-- ============================================================================
ALTER TABLE solicitacoes_acesso ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas as próprias solicitações
DROP POLICY IF EXISTS sol_acesso_select_proprio ON solicitacoes_acesso;
DROP POLICY IF EXISTS "sol_acesso_select_proprio" ON solicitacoes_acesso;
CREATE POLICY "sol_acesso_select_proprio" ON solicitacoes_acesso
  FOR SELECT USING (usuario_id = auth.uid());

-- Admin/master/diretor/gerente vêem todas
DROP POLICY IF EXISTS sol_acesso_select_admin ON solicitacoes_acesso;
DROP POLICY IF EXISTS "sol_acesso_select_admin" ON solicitacoes_acesso;
CREATE POLICY "sol_acesso_select_admin" ON solicitacoes_acesso
  FOR SELECT USING (
    auth_perfil() = ANY(ARRAY['master','admin','diretor','gerente'])
  );

-- Qualquer autenticado pode inserir (apenas o próprio pedido)
DROP POLICY IF EXISTS sol_acesso_insert ON solicitacoes_acesso;
DROP POLICY IF EXISTS "sol_acesso_insert" ON solicitacoes_acesso;
CREATE POLICY "sol_acesso_insert" ON solicitacoes_acesso
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- Somente admin/master/diretor podem responder (atualizar status)
DROP POLICY IF EXISTS sol_acesso_update ON solicitacoes_acesso;
DROP POLICY IF EXISTS "sol_acesso_update" ON solicitacoes_acesso;
CREATE POLICY "sol_acesso_update" ON solicitacoes_acesso
  FOR UPDATE USING (
    auth_perfil() = ANY(ARRAY['master','admin','diretor'])
  );
