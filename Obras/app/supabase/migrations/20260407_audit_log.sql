-- ============================================================================
-- Migração: Audit Log de Ações Sensíveis
-- Data: 2026-04-07
-- Descrição: Registra todas as ações sensíveis do sistema para auditoria
--            e rastreabilidade. Imutável — sem UPDATE ou DELETE para usuários.
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid        REFERENCES perfis(id) ON DELETE SET NULL,
  usuario_nome  text,                   -- snapshot do nome (caso o perfil seja deletado)
  usuario_perfil text,                  -- snapshot do perfil no momento da ação
  acao          text        NOT NULL,   -- ex: 'aprovar_medicao', 'editar_usuario', 'login'
  modulo        text,                   -- ex: 'medicoes', 'usuarios', 'planejamento'
  entidade_id   text,                   -- id da entidade afetada (uuid como string)
  entidade_nome text,                   -- nome/descricao da entidade para facilitar leitura
  dados_antes   jsonb,                  -- snapshot antes da alteração
  dados_apos    jsonb,                  -- snapshot após a alteração
  detalhes      text,                   -- descrição livre da ação
  obra_id       uuid        REFERENCES obras(id) ON DELETE SET NULL,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- Índices para queries de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_usuario    ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_acao       ON audit_log(acao);
CREATE INDEX IF NOT EXISTS idx_audit_modulo     ON audit_log(modulo);
CREATE INDEX IF NOT EXISTS idx_audit_obra       ON audit_log(obra_id);
CREATE INDEX IF NOT EXISTS idx_audit_criado_em  ON audit_log(criado_em DESC);

-- Log é append-only: usuários comuns não podem alterar ou deletar registros
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Somente admin/master lêem o audit log
DROP POLICY IF EXISTS "audit_select" ON audit_log;
CREATE POLICY "audit_select" ON audit_log
  FOR SELECT USING (
    auth_perfil() = ANY(ARRAY['master','admin'])
  );

-- Qualquer usuário autenticado pode inserir (a inserção é feita pelo próprio sistema)
DROP POLICY IF EXISTS "audit_insert" ON audit_log;
CREATE POLICY "audit_insert" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Ninguém pode alterar ou excluir registros do log (imutabilidade)
-- (as políticas de UPDATE e DELETE não são criadas — negação por padrão)

COMMENT ON TABLE audit_log IS
  'Registro imutável de ações sensíveis do sistema. Append-only via RLS.';
COMMENT ON COLUMN audit_log.dados_antes IS
  'Estado da entidade ANTES da ação. Null para criações.';
COMMENT ON COLUMN audit_log.dados_apos IS
  'Estado da entidade APÓS a ação. Null para exclusões.';
