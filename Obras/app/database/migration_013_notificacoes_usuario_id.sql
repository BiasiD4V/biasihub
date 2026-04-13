-- ============================================================
-- MIGRAÇÃO 013: Adiciona usuario_id em notificacoes
-- Permite direcionar notificações a um usuário específico
-- (ex: resposta de solicitação de acesso → só o solicitante vê)
-- ============================================================

-- 1. Adiciona coluna usuario_id (nullable → notificações globais continuam sem ela)
ALTER TABLE notificacoes
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id ON notificacoes(usuario_id);

-- 2. Atualiza a função para respeitar usuario_id quando presente
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
      -- Se a notificação tem usuario_id, mostra SOMENTE para aquele usuário
      (n.usuario_id IS NOT NULL AND n.usuario_id = p_usuario_id)

      -- Notificações sem usuario_id seguem a lógica de perfil/acesso abaixo:

      -- Sistema → admin/master/diretor
      OR (n.usuario_id IS NULL AND n.referencia_tipo = 'sistema' AND EXISTS (
        SELECT 1 FROM perfis p WHERE p.id = p_usuario_id
          AND p.perfil IN ('admin', 'master', 'diretor')
      ))
      -- Solicitação de acesso pendente → admin/master/diretor
      -- (resposta aprovada/negada já vem com usuario_id, portanto cai no primeiro bloco)
      OR (n.usuario_id IS NULL AND n.referencia_tipo = 'solicitacao_acesso' AND EXISTS (
        SELECT 1 FROM perfis p WHERE p.id = p_usuario_id
          AND p.perfil IN ('admin', 'master', 'diretor')
      ))
      -- Obra → user tem acesso à obra
      OR (n.usuario_id IS NULL AND n.referencia_tipo = 'obra' AND EXISTS (
        SELECT 1 FROM usuario_obra uoa
        WHERE uoa.usuario_id = p_usuario_id AND uoa.obra_id = n.referencia_id
      ))
      -- Contrato → user tem acesso à obra do contrato
      OR (n.usuario_id IS NULL AND n.referencia_tipo = 'contrato' AND EXISTS (
        SELECT 1 FROM contratos c
        JOIN usuario_obra uoa ON uoa.obra_id = c.obra_id
        WHERE c.id = n.referencia_id AND uoa.usuario_id = p_usuario_id
      ))
    )
  ORDER BY n.criada_em DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN notificacoes.usuario_id
  IS 'Quando preenchido, a notificação é exclusiva para esse usuário (ex: resposta de solicitação de acesso)';
