-- =============================================================
-- 13 - CHAT DE EQUIPE (mensagens, presença, notificações)
-- =============================================================

-- Tabela de mensagens do chat
CREATE TABLE IF NOT EXISTS chat_mensagens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  usuario_nome text NOT NULL,
  conteudo text,
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'arquivo', 'audio', 'imagem', 'sistema')),
  arquivo_url text,
  arquivo_nome text,
  arquivo_tipo text,
  lido_por uuid[] DEFAULT '{}',
  criado_em timestamptz DEFAULT now()
);

-- Índice para busca rápida por data
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_criado ON chat_mensagens(criado_em DESC);

-- Tabela de presença (online/offline)
CREATE TABLE IF NOT EXISTS presenca_usuarios (
  usuario_id uuid PRIMARY KEY REFERENCES auth.users(id),
  usuario_nome text NOT NULL,
  online boolean DEFAULT false,
  ultimo_visto timestamptz DEFAULT now(),
  conectado_desde timestamptz
);

-- RLS
ALTER TABLE chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE presenca_usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas: qualquer autenticado lê e escreve
CREATE POLICY "chat_select" ON chat_mensagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "chat_insert" ON chat_mensagens FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "chat_update" ON chat_mensagens FOR UPDATE TO authenticated USING (true);

CREATE POLICY "presenca_select" ON presenca_usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "presenca_insert" ON presenca_usuarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "presenca_update" ON presenca_usuarios FOR UPDATE TO authenticated USING (auth.uid() = usuario_id);

-- Permitir upsert de presença
CREATE POLICY "presenca_upsert" ON presenca_usuarios FOR ALL TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE presenca_usuarios;

-- Notify
NOTIFY pgrst, 'reload schema';
