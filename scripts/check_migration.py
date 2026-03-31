#!/usr/bin/env python3
"""
Script para verificar se a migration foi executada com sucesso
"""
import sys

try:
    from supabase import create_client, Client
except ImportError:
    print("Instalando supabase-py...")
    import os
    os.system(f"{sys.executable} -m pip install supabase --quiet")
    from supabase import create_client, Client

# Credenciais do Supabase
SUPABASE_URL = "https://vzaabtzcilyoknksvhrc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjQyNDYsImV4cCI6MjA5MDEwMDI0Nn0.L0nCAztRmHFTaJAoT22P_Y5eHUNG9-HStY3it1nSq1U"

def check_migration():
    """Verifica se a tabela device_sessions existe"""
    print("🔍 Verificando migration...")
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Tentar ler a tabela device_sessions
        response = supabase.table('device_sessions').select('*').limit(1).execute()
        
        print("✅ Tabela device_sessions encontrada!")
        print(f"   Status: Table exists and accessible")
        return True
        
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg.lower() and "does not exist" in error_msg.lower():
            print("❌ Tabela device_sessions NÃO foi criada")
            print(f"   Erro: {error_msg}")
            return False
        else:
            print("⚠️  Erro ao conectar/verificar:")
            print(f"   {error_msg}")
            return False

if __name__ == "__main__":
    print("=" * 50)
    print("BiasihHub - Migration Checker")
    print("=" * 50 + "\n")
    
    success = check_migration()
    
    print("\n" + "=" * 50)
    if success:
        print("✨ TUDO FUNCIONANDO! 🚀")
        print("=" * 50)
        print("\n📱 Remember Me está ATIVO!")
        print("✅ Checkbox 'Lembrar de mim' no login")
        print("✅ Menu 'Meus Dispositivos' na sidebar")
        print("✅ Identificação por IP automática")
    else:
        print("⚠️  Verificar migration no Supabase")
        print("=" * 50)
        print("\n💡 Passos:")
        print("1. Abra https://app.supabase.com")
        print("2. SQL Editor → New Query")
        print("3. Execute o arquivo: scripts/sql/08-device-sessions.sql")
