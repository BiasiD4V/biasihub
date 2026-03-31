-- ============================================
-- MIGRAÇÃO: Adicionar fields de token ao device_sessions
-- Necessário para restaurar sessão Supabase Auth automaticamente
-- ============================================

-- 1. Adicionar colunas para armazenar tokens Supabase Auth
ALTER TABLE public.device_sessions 
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- 2. Criar índice para buscar por refresh_token (para validação rápida)
CREATE INDEX IF NOT EXISTS idx_device_sessions_refresh_token 
ON public.device_sessions(refresh_token) 
WHERE refresh_token IS NOT NULL;

-- 3. Comentários para documentação
COMMENT ON COLUMN public.device_sessions.access_token IS 
  'JWT access token do Supabase Auth - usado para restaurar sessão automaticamente';
  
COMMENT ON COLUMN public.device_sessions.refresh_token IS 
  'JWT refresh token do Supabase Auth - usado para obter novo access_token quando expirar';
