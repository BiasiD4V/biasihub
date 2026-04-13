-- ============================================================
-- Migration 012: Solicitações de Acesso
-- Usuário sem permissão pode pedir acesso → admin é notificado
-- ============================================================

-- ─── 1. TABELA ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solicitacoes_acesso (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID         NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  pagina        TEXT         NOT NULL,   -- path da rota negada (ex: /suprimentos)
  permissao     TEXT         NOT NULL,   -- permissão que falta
  status        TEXT         NOT NULL DEFAULT 'pendente'
                             CHECK (status IN ('pendente', 'aprovado', 'negado')),
  mensagem      TEXT,                    -- mensagem opcional do solicitante
  criada_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  respondida_em TIMESTAMPTZ,
  respondido_por UUID        REFERENCES perfis(id)
);

CREATE INDEX IF NOT EXISTS idx_sol_acesso_usuario ON solicitacoes_acesso(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sol_acesso_status  ON solicitacoes_acesso(status);

-- Apenas 1 pedido pendente por usuário por página (evita spam)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sol_acesso_unique
  ON solicitacoes_acesso(usuario_id, pagina)
  WHERE status = 'pendente';

-- RLS
ALTER TABLE solicitacoes_acesso ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas as próprias solicitações
CREATE POLICY sol_acesso_select_proprio ON solicitacoes_acesso
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());

-- Admin/master/diretor veem todas
CREATE POLICY sol_acesso_select_admin ON solicitacoes_acesso
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      WHERE p.id = auth.uid()
        AND p.perfil IN ('admin', 'master', 'diretor', 'gerente')
    )
  );

-- Qualquer autenticado pode inserir (o próprio pedido)
CREATE POLICY sol_acesso_insert ON solicitacoes_acesso
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- Só admin/master/diretor podem atualizar (responder)
CREATE POLICY sol_acesso_update ON solicitacoes_acesso
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p
      WHERE p.id = auth.uid()
        AND p.perfil IN ('admin', 'master', 'diretor')
    )
  );

-- ─── 2. ATUALIZA obter_notificacoes_usuario ───────────────────
-- Adiciona filtro para referencia_tipo = 'solicitacao_acesso'
-- (aparece só para admin / master / diretor)
CREATE OR REPLACE FUNCTION obter_notificacoes_usuario(p_usuario_id UUID)
RETURNS TABLE (
  id UUID, tipo VARCHAR, titulo VARCHAR, mensagem TEXT,
  tempo TEXT, lida BOOLEAN, referencia_tipo VARCHAR, referencia_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id, n.tipo, n.titulo, n.mensagem,
    CASE
      WHEN NOW() - n.criada_em < '1 hour'::INTERVAL
        THEN ROUND(EXTRACT(MINUTE FROM NOW() - n.criada_em))::TEXT || 'm'
      WHEN NOW() - n.criada_em < '24 hours'::INTERVAL
        THEN ROUND(EXTRACT(HOUR FROM NOW() - n.criada_em))::TEXT || 'h'
      WHEN NOW() - n.criada_em < '7 days'::INTERVAL
        THEN ROUND(EXTRACT(DAY FROM NOW() - n.criada_em))::TEXT || 'd'
      ELSE ROUND(EXTRACT(DAY FROM NOW() - n.criada_em) / 7)::TEXT || 'w'
    END AS tempo,
    EXISTS(
      SELECT 1 FROM notificacoes_usuario_lida
      WHERE usuario_id = p_usuario_id AND notificacao_id = n.id
    ) AS lida,
    n.referencia_tipo,
    n.referencia_id
  FROM notificacoes n
  WHERE n.ativa = TRUE
    AND (n.expira_em IS NULL OR n.expira_em > NOW())
    AND (
      -- Sistema → só admin/diretor
      (n.referencia_tipo = 'sistema' AND EXISTS (
        SELECT 1 FROM perfis p WHERE p.id = p_usuario_id
          AND p.perfil IN ('admin', 'master', 'diretor')
      ))
      -- Solicitação de acesso → admin/master/diretor
      OR (n.referencia_tipo = 'solicitacao_acesso' AND EXISTS (
        SELECT 1 FROM perfis p WHERE p.id = p_usuario_id
          AND p.perfil IN ('admin', 'master', 'diretor')
      ))
      -- Obra → user tem acesso à obra
      OR (n.referencia_tipo = 'obra' AND EXISTS (
        SELECT 1 FROM usuario_obra_acesso uoa
        WHERE uoa.usuario_id = p_usuario_id AND uoa.obra_id = n.referencia_id
      ))
      -- Contrato → user tem acesso à obra do contrato
      OR (n.referencia_tipo = 'contrato' AND EXISTS (
        SELECT 1 FROM contratos c
        JOIN usuario_obra_acesso uoa ON uoa.obra_id = c.obra_id
        WHERE c.id = n.referencia_id AND uoa.usuario_id = p_usuario_id
      ))
    )
  ORDER BY n.criada_em DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE solicitacoes_acesso
  IS 'Pedidos de acesso enviados por usuários sem permissão em uma rota';
