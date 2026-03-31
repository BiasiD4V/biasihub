#!/usr/bin/env python3
"""
Script para executar migration SQL no Supabase remotamente
"""
import os
import sys

# Tentar importar supabase
try:
    from supabase import create_client, Client
except ImportError:
    print("Instalando supabase-py...")
    os.system(f"{sys.executable} -m pip install supabase --quiet")
    from supabase import create_client, Client

# Credenciais do Supabase
SUPABASE_URL = "https://vzaabtzcilyoknksvhrc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjQyNDYsImV4cCI6MjA5MDEwMDI0Nn0.L0nCAztRmHFTaJAoT22P_Y5eHUNG9-HStY3it1nSq1U"

# SQL da migration de device_sessions
MIGRATION_SQL = """
-- =============================================
-- TABELA DE SESSÕES DE DISPOSITIVOS
-- Para "Remember Me" com identificação por IP
-- =============================================

CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  device_name TEXT,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  is_active BOOLEAN DEFAULT true,
  user_agent TEXT,
  CONSTRAINT device_sessions_user_email_check CHECK (user_id IS NOT NULL AND email IS NOT NULL)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_device_sessions_session_token ON device_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_email_ip ON device_sessions(user_id, email, ip_address);

-- Habilitar RLS
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para device_sessions
CREATE POLICY IF NOT EXISTS "Users can view their own device sessions" 
  ON device_sessions 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert their own device sessions" 
  ON device_sessions 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their own device sessions" 
  ON device_sessions 
  FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete their own device sessions" 
  ON device_sessions 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Função para limpar sessões expiradas (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM device_sessions 
  WHERE expires_at < now() OR is_active = false;
END;
$$ LANGUAGE plpgsql;
"""

def execute_migration():
    """Executa a migration no Supabase"""
    print("🔄 Conectando ao Supabase...")
    
    try:
        # Criar cliente Supabase
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Conectado ao Supabase!")
        
        print("\n📝 Executando migration...")
        
        # Executar SQL
        response = supabase.postgrest.auth(_get_service_role_key()).from_('').raw(MIGRATION_SQL)
        
        print("✅ Migration executada com sucesso!")
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        print("\n⚠️  Alternativa: Use a CLI do Supabase ou execute manualmente no Dashboard")
        return False

def _get_service_role_key():
    """Tenta obter service role key do .env.local"""
    try:
        env_local_path = "/".join(__file__.split("/")[:-1]) + "/.env.local"
        with open(env_local_path, 'r') as f:
            for line in f:
                if 'SUPABASE_SERVICE_ROLE_KEY' in line:
                    return line.split('=')[1].strip()
    except:
        pass
    return None

if __name__ == "__main__":
    print("🚀 BiasihHub - Device Sessions Migration")
    print("=" * 50)
    
    success = execute_migration()
    
    if success:
        print("\n✨ Pronto! Remember Me está funcionando!")
    else:
        print("\n💡 Instruções alternativas:")
        print("1. Vá para: https://app.supabase.com")
        print("2. SQL Editor → New Query")
        print("3. Cole o SQL do arquivo: scripts/sql/08-device-sessions.sql")
        print("4. Clique em RUN")
