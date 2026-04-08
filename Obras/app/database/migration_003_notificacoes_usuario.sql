-- ============================================================
-- MIGRAÇÃO 003: Notificações acesso-controlado por usuário
-- ============================================================

-- Tabela: notificacoes
-- Armázena alertas gerados pelo sistema
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL, -- 'alerta', 'info', 'sucesso', 'erro'
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT,
  referencia_tipo VARCHAR(50), -- 'obra', 'contrato', 'medicao', 'sistema'
  referencia_id UUID, -- id da obra/contrato/etc
  criada_em TIMESTAMP DEFAULT NOW(),
  expira_em TIMESTAMP, -- quando notificação simplesmente desaparece (se NULL = permanente até leitura)
  ativa BOOLEAN DEFAULT TRUE
);

-- Tabela: notificacoes_usuario_lida
-- Rastreia quais notificações cada usuário já leu
CREATE TABLE IF NOT EXISTS notificacoes_usuario_lida (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notificacao_id UUID NOT NULL REFERENCES notificacoes(id) ON DELETE CASCADE,
  lida_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, notificacao_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notificacoes_ativa ON notificacoes(ativa);
CREATE INDEX IF NOT EXISTS idx_notificacoes_referencia ON notificacoes(referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida_usuario ON notificacoes_usuario_lida(usuario_id);

-- RLS: notificacoes (todos podem ler, apenas sistema escreve)
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notificacoes_select" ON notificacoes
  FOR SELECT USING (TRUE);

-- RLS: notificacoes_usuario_lida (usuário vê apenas suas)
ALTER TABLE notificacoes_usuario_lida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notificacoes_usuario_lida_select" ON notificacoes_usuario_lida
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "notificacoes_usuario_lida_insert" ON notificacoes_usuario_lida
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- FUNÇÃO: gerar_notificacao_contrato_vencer()
-- Cria alerta quando contrato está vencendo em 30 dias
CREATE OR REPLACE FUNCTION gerar_notificacao_contrato_vencer()
RETURNS VOID AS $$
DECLARE
  contrato RECORD;
BEGIN
  -- Busca contratos vencendo nos próximos 30 dias (ainda não notificados hoje)
  FOR contrato IN
    SELECT c.id, c.numero, COUNT(*) as qtde
    FROM contratos c
    WHERE c.data_termino::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND c.ativo = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM notificacoes n
        WHERE n.referencia_tipo = 'contrato'
          AND n.referencia_id = c.id
          AND DATE(n.criada_em) = CURRENT_DATE
      )
    GROUP BY c.id, c.numero
  LOOP
    INSERT INTO notificacoes (tipo, titulo, mensagem, referencia_tipo, referencia_id)
    VALUES (
      'alerta',
      'Contrato a vencer',
      contrato.qtde || ' contrato(s) vencem nos próximos 30 dias.',
      'contrato',
      contrato.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNÇÃO: gerar_notificacao_medicao_pendente()
-- Cria alerta quando medições aguardam aprovação
CREATE OR REPLACE FUNCTION gerar_notificacao_medicao_pendente()
RETURNS VOID AS $$
BEGIN
  -- Busca medições pendentes (aguardando aprovação)
  IF NOT EXISTS (
    SELECT 1 FROM notificacoes n
    WHERE n.referencia_tipo = 'medicao'
      AND DATE(n.criada_em) = CURRENT_DATE
      AND n.titulo = 'Medição pendente'
  ) THEN
    INSERT INTO notificacoes (tipo, titulo, mensagem, referencia_tipo, referencia_id)
    SELECT DISTINCT
      'info',
      'Medição pendente',
      (SELECT COUNT(*) || ' medições aguardando aprovação.')::TEXT,
      'medicao',
      m.id
    FROM mediacoes m
    WHERE m.status = 'Pendente de Aprovação'
      AND NOT EXISTS (
        SELECT 1 FROM notificacoes_usuario_lida nul
        WHERE nul.notificacao_id = (
          SELECT n.id FROM notificacoes n
          WHERE n.referencia_tipo = 'medicao'
            AND n.titulo = 'Medição pendente'
            AND DATE(n.criada_em) = CURRENT_DATE
        )
      )
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNÇÃO: obter_notificacoes_usuario()
-- Retorna notificações relevantes para o usuário (filtrando por acesso)
CREATE OR REPLACE FUNCTION obter_notificacoes_usuario(p_usuario_id UUID)
RETURNS TABLE (
  id UUID,
  tipo VARCHAR,
  titulo VARCHAR,
  mensagem TEXT,
  tempo TEXT,
  lida BOOLEAN,
  referencia_tipo VARCHAR,
  referencia_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.tipo,
    n.titulo,
    n.mensagem,
    -- Calcula "há X tempo" para exibição
    CASE
      WHEN NOW() - n.criada_em < '1 hour'::INTERVAL THEN ROUND(EXTRACT(MINUTE FROM NOW() - n.criada_em))::TEXT || 'm'
      WHEN NOW() - n.criada_em < '24 hours'::INTERVAL THEN ROUND(EXTRACT(HOUR FROM NOW() - n.criada_em))::TEXT || 'h'
      WHEN NOW() - n.criada_em < '7 days'::INTERVAL THEN ROUND(EXTRACT(DAY FROM NOW() - n.criada_em))::TEXT || 'd'
      ELSE ROUND(EXTRACT(DAY FROM NOW() - n.criada_em) / 7)::TEXT || 'w'
    END AS tempo,
    EXISTS(SELECT 1 FROM notificacoes_usuario_lida WHERE usuario_id = p_usuario_id AND notificacao_id = n.id) AS lida,
    n.referencia_tipo,
    n.referencia_id
  FROM notificacoes n
  WHERE n.ativa = TRUE
    AND (n.expira_em IS NULL OR n.expira_em > NOW())
    -- Filtra por acesso do usuário
    AND (
      -- Sistema (sempre mostra pra admin/diretor)
      (n.referencia_tipo = 'sistema' AND EXISTS (
        SELECT 1 FROM perfis p WHERE p.usuario_id = p_usuario_id AND p.perfil IN ('admin', 'diretor')
      ))
      -- Obra (user tem acesso à obra)
      OR (n.referencia_tipo = 'obra' AND EXISTS (
        SELECT 1 FROM usuario_obra_acesso uoa
        WHERE uoa.usuario_id = p_usuario_id AND uoa.obra_id = n.referencia_id
      ))
      -- Contrato (user tem acesso à obra do contrato)
      OR (n.referencia_tipo = 'contrato' AND EXISTS (
        SELECT 1 FROM contratos c
        JOIN usuario_obra_acesso uoa ON uoa.obra_id = c.obra_id
        WHERE c.id = n.referencia_id AND uoa.usuario_id = p_usuario_id
      ))
      -- Medição (user tem acesso à obra da medição)
      OR (n.referencia_tipo = 'medicao' AND EXISTS (
        SELECT 1 FROM mediacoes m
        JOIN contratos c ON c.id = m.contrato_id
        JOIN usuario_obra_acesso uoa ON uoa.obra_id = c.obra_id
        WHERE m.id = n.referencia_id AND uoa.usuario_id = p_usuario_id
      ))
    )
  ORDER BY n.criada_em DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para referência
COMMENT ON TABLE notificacoes IS 'Alertas do sistema (contratos vencendo, medições pendentes, etc)';
COMMENT ON TABLE notificacoes_usuario_lida IS 'Rastreia quais notificações cada usuário leu (para não repetir)';
COMMENT ON FUNCTION obter_notificacoes_usuario(UUID) IS 'Retorna notificações filtrando por acesso do usuário (obras, contratos, etc)';
