#!/usr/bin/env python3
"""
Script para configurar auto-login no Supabase automaticamente.
Executa a função RPC que cria as colunas necessárias.
"""

import os
import sys
import json

def setup_auto_login():
    """Configurar auto-login executando RPC no Supabase"""
    
    try:
        from supabase import create_client
    except ImportError:
        print("❌ Biblioteca 'supabase' não encontrada.")
        print("   Execute: pip install supabase")
        return False
    
    # Credenciais
    url = "https://fuwlsgybdftqgimtwqhb.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1d2xzZ3liZGZ0cWdpbXR3cWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQzNjc2NDAsImV4cCI6MjAyMDA0MzY0MH0.rU5bkSDK4gGZPX-0KSmI1j0YmLKqbKFTOwwHKp-2sEw"
    
    print("🔗 Conectando ao Supabase...")
    print(f"   URL: {url}\n")
    
    try:
        client = create_client(url, key)
        print("✅ Conectado!\n")
        
        # Passo 1: Primeiro precisamos executar o SQL para criar a função
        # Como não temos acesso direto via RPC ainda, vamos usar uma abordagem diferente
        
        print("📝 Criando função RPC 'setup_auto_login'...\n")
        
        # SQL completo
        setup_sql = """
CREATE OR REPLACE FUNCTION public.setup_auto_login()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='device_sessions' AND column_name='access_token'
  ) THEN
    ALTER TABLE public.device_sessions ADD COLUMN access_token TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='device_sessions' AND column_name='refresh_token'
  ) THEN
    ALTER TABLE public.device_sessions ADD COLUMN refresh_token TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname='idx_device_sessions_refresh_token'
  ) THEN
    CREATE INDEX idx_device_sessions_refresh_token 
    ON public.device_sessions(refresh_token) 
    WHERE refresh_token IS NOT NULL;
  END IF;

  result := jsonb_build_object(
    'success', true,
    'message', 'Auto-login configurado com sucesso!',
    'timestamp', now()
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := jsonb_build_object(
    'success', false,
    'message', SQLERRM,
    'error_code', SQLSTATE
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.setup_auto_login() TO anon, authenticated;
"""
        
        # Tentar executar via RPC (se a função já existe)
        try:
            result = client.rpc('setup_auto_login').execute()
            print("✅ Função executada com sucesso!")
            print(f"   Resultado: {result.data}\n")
            return True
        except Exception as rpc_error:
            print(f"⚠️  Função não existe ainda, precisa criar primeiro...")
            print(f"   Erro: {str(rpc_error)}\n")
            
            # Se não conseguir, retorna instrução para criar manual
            print("=" * 70)
            print("📋 COPIE E COLE ESTE SQL NO SUPABASE SQL EDITOR:")
            print("=" * 70)
            print("\n" + setup_sql + "\n")
            print("=" * 70)
            print("\n🌐 Link para abrir Supabase SQL Editor:")
            print("   https://supabase.com/dashboard/project/fuwlsgybdftqgimtwqhb/sql/new\n")
            return False
            
    except Exception as e:
        print(f"❌ Erro de conexão: {str(e)}")
        print("\nTente novamente ou execute manualmente no Supabase SQL Editor.")
        return False

if __name__ == '__main__':
    print("\n" + "=" * 70)
    print("🚀 AUTO-LOGIN SETUP FOR BIASI HUB")
    print("=" * 70 + "\n")
    
    success = setup_auto_login()
    
    if success:
        print("🎉 AUTO-LOGIN CONFIGURADO COMPLETAMENTE!")
        print("\n✅ Remember Me agora funciona com auto-login automático")
        sys.exit(0)
    else:
        print("⚠️  Configure manualmente no Supabase (veja instruções acima)")
        sys.exit(1)
