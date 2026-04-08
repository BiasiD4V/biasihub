-- Verifica se tabelas existem e limpa policies antigas
DROP POLICY IF EXISTS "notificacoes_select" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_usuario_lida_select" ON notificacoes_usuario_lida;
DROP POLICY IF EXISTS "notificacoes_usuario_lida_insert" ON notificacoes_usuario_lida;

-- Cria tabelas se não existirem
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT,
  referencia_tipo VARCHAR(50),
  referencia_id UUID,
  criada_em TIMESTAMP DEFAULT NOW(),
  expira_em TIMESTAMP,
  ativa BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS notificacoes_usuario_lida (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notificacao_id UUID NOT NULL REFERENCES notificacoes(id) ON DELETE CASCADE,
  lida_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, notificacao_id)
);

-- Cria indexes se não existirem
CREATE INDEX IF NOT EXISTS idx_notificacoes_ativa ON notificacoes(ativa);
CREATE INDEX IF NOT EXISTS idx_notificacoes_referencia ON notificacoes(referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida_usuario ON notificacoes_usuario_lida(usuario_id);

-- Habilita RLS
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_usuario_lida ENABLE ROW LEVEL SECURITY;

-- Cria policies
CREATE POLICY "notificacoes_select" ON notificacoes FOR SELECT USING (TRUE);

CREATE POLICY "notificacoes_usuario_lida_select" ON notificacoes_usuario_lida
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "notificacoes_usuario_lida_insert" ON notificacoes_usuario_lida
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- Function RPC para buscar notificações do usuário
CREATE OR REPLACE FUNCTION obter_notificacoes_usuario(p_usuario_id UUID)
RETURNS TABLE (
  id UUID, tipo VARCHAR, titulo VARCHAR, mensagem TEXT, tempo TEXT, lida BOOLEAN, referencia_tipo VARCHAR, referencia_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.tipo, n.titulo, n.mensagem,
    CASE
      WHEN NOW() - n.criada_em < '1 hour'::INTERVAL THEN ROUND(EXTRACT(MINUTE FROM NOW() - n.criada_em))::TEXT || 'm'
      WHEN NOW() - n.criada_em < '24 hours'::INTERVAL THEN ROUND(EXTRACT(HOUR FROM NOW() - n.criada_em))::TEXT || 'h'
      WHEN NOW() - n.criada_em < '7 days'::INTERVAL THEN ROUND(EXTRACT(DAY FROM NOW() - n.criada_em))::TEXT || 'd'
      ELSE ROUND(EXTRACT(DAY FROM NOW() - n.criada_em) / 7)::TEXT || 'w'
    END,
    EXISTS(SELECT 1 FROM notificacoes_usuario_lida WHERE usuario_id = p_usuario_id AND notificacao_id = n.id),
    n.referencia_tipo, n.referencia_id
  FROM notificacoes n
  WHERE n.ativa = TRUE AND (n.expira_em IS NULL OR n.expira_em > NOW())
    AND (
      (n.referencia_tipo = 'sistema' AND EXISTS (SELECT 1 FROM perfis p WHERE p.usuario_id = p_usuario_id AND p.perfil IN ('admin', 'diretor')))
      OR (n.referencia_tipo = 'obra' AND EXISTS (SELECT 1 FROM usuario_obra_acesso uoa WHERE uoa.usuario_id = p_usuario_id AND uoa.obra_id = n.referencia_id))
      OR (n.referencia_tipo = 'contrato' AND EXISTS (SELECT 1 FROM contratos c JOIN usuario_obra_acesso uoa ON uoa.obra_id = c.obra_id WHERE c.id = n.referencia_id AND uoa.usuario_id = p_usuario_id))
      OR (n.referencia_tipo = 'medicao' AND EXISTS (SELECT 1 FROM mediacoes m JOIN contratos c ON c.id = m.contrato_id JOIN usuario_obra_acesso uoa ON uoa.obra_id = c.obra_id WHERE m.id = n.referencia_id AND uoa.usuario_id = p_usuario_id))
    )
  ORDER BY n.criada_em DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
