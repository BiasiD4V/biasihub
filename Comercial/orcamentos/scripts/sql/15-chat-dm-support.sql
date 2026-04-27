-- =============================================================
-- 15 - SUPORTE A MENSAGENS DIRETAS (DM) NO CHAT
-- =============================================================

-- Adicionar colunas para destinatário (NULL = chat geral da equipe)
ALTER TABLE chat_mensagens ADD COLUMN IF NOT EXISTS destinatario_id uuid REFERENCES auth.users(id);
ALTER TABLE chat_mensagens ADD COLUMN IF NOT EXISTS destinatario_nome text;

-- Índice para buscar conversas entre dois usuários
CREATE INDEX IF NOT EXISTS idx_chat_dm ON chat_mensagens(usuario_id, destinatario_id);
CREATE INDEX IF NOT EXISTS idx_chat_dm_reverse ON chat_mensagens(destinatario_id, usuario_id);
