-- ============================================
-- MIGRAÇÃO: Criar tabela de sessões por dispositivo (Remember Me)
-- ============================================

-- 1. Criar tabela device_sessions para armazenar logins recordados
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address INET NOT NULL,
  device_name TEXT,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  user_agent TEXT
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_device_sessions_token ON public.device_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON public.device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_ip_email ON public.device_sessions(ip_address, email);

-- 3. Habilitar RLS na tabela device_sessions
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para device_sessions
-- Permitir leitura das próprias sessões
CREATE POLICY "device_sessions_read_own" ON public.device_sessions
  FOR SELECT USING (user_id = auth.uid() OR auth.uid() IN (
    SELECT id FROM public.usuarios WHERE papel = 'admin'
  ));

-- Permitir insert próprio
CREATE POLICY "device_sessions_insert" ON public.device_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid() OR email = auth.jwt() ->> 'email');

-- Permitir update próprio
CREATE POLICY "device_sessions_update_own" ON public.device_sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Permitir delete próprio
CREATE POLICY "device_sessions_delete_own" ON public.device_sessions
  FOR DELETE USING (user_id = auth.uid() OR auth.uid() IN (
    SELECT id FROM public.usuarios WHERE papel = 'admin'
  ));

-- 5. Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.device_sessions
  WHERE expires_at < now() OR is_active = false;
END;
$$ LANGUAGE plpgsql;

-- 6. Confirmar
SELECT 'Migração de device sessions concluída com sucesso!' AS resultado;
