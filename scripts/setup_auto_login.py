#!/usr/bin/env python3
"""
Setup script para habilitar auto-login via Remember Me
Executa as migrations SQL necessárias no Supabase
"""

import os
import sys
from supabase import create_client, Client

# Credenciais do Supabase (use variáveis de ambiente ou adicione aqui)
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://fuwlsgybdftqgimtwqhb.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1d2xzZ3liZGZ0cWdpbXR3cWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQzNjc2NDAsImV4cCI6MjAyMDA0MzY0MH0.rU5bkSDK4gGZPX-0KSmI1j0YmLKqbKFTOwwHKp-2sEw')

def setup_auto_login():
    """Executa as migrations para habilitar auto-login"""
    
    print("🚀 Iniciando setup de auto-login...")
    print(f"📍 Conectando ao Supabase: {SUPABASE_URL}")
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Conectado ao Supabase!\n")
        
        # SQL para adicionar colunas de tokens
        migrations = [
            {
                "name": "Adicionar colunas access_token e refresh_token",
                "sql": """
                    ALTER TABLE public.device_sessions 
                    ADD COLUMN IF NOT EXISTS access_token TEXT,
                    ADD COLUMN IF NOT EXISTS refresh_token TEXT;
                """
            },
            {
                "name": "Criar índice para refresh_token",
                "sql": """
                    CREATE INDEX IF NOT EXISTS idx_device_sessions_refresh_token 
                    ON public.device_sessions(refresh_token) 
                    WHERE refresh_token IS NOT NULL;
                """
            },
            {
                "name": "Adicionar comentários de documentação",
                "sql": """
                    COMMENT ON COLUMN public.device_sessions.access_token IS 
                      'JWT access token do Supabase Auth - usado para restaurar sessão automaticamente';
                    
                    COMMENT ON COLUMN public.device_sessions.refresh_token IS 
                      'JWT refresh token do Supabase Auth - usado para obter novo access_token quando expirar';
                """
            }
        ]
        
        # Executar cada migration
        for i, migration in enumerate(migrations, 1):
            print(f"[{i}/{len(migrations)}] {migration['name']}...")
            try:
                result = supabase.rpc(
                    'exec_sql',
                    {'sql': migration['sql']}
                ).execute()
                print(f"     ✅ Executado com sucesso!\n")
            except Exception as e:
                # Tenta executar direto via query se não tem função RPC
                print(f"     ⚠️  Função RPC não disponível, tentando direto...")
                # Na verdade o Supabase não permite exec SQL direto via SDK
                # Vamos apenas avisar que precisa fazer manual
                print(f"     ⚠️  Erro: {str(e)}")
                print(f"     👉 Execute manualmente no Supabase SQL Editor!\n")
                return False
        
        print("=" * 60)
        print("🎉 AUTO-LOGIN CONFIGURADO COM SUCESSO!")
        print("=" * 60)
        print("\n✅ O Remember Me agora funcionará com auto-login automático!")
        print("   - Tokens de autenticação são salvos e restaurados")
        print("   - IP do dispositivo é validado")
        print("   - Sessão expira em 30 dias\n")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro de conexão: {str(e)}")
        print("\n⚠️  Se a função RPC não estiver disponível:")
        print("   1. Abra: https://supabase.com/dashboard")
        print("   2. Vá em SQL Editor")
        print("   3. Execute o SQL do arquivo: scripts/sql/09-add-tokens-to-device-sessions.sql")
        return False

if __name__ == '__main__':
    success = setup_auto_login()
    sys.exit(0 if success else 1)
