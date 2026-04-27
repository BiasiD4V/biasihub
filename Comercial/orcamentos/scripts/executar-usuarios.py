import requests
import json

SUPABASE_URL = "https://vzaabtzcilyoknksvhrc.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o"

headers = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
}

def criar_usuario(email, password, nome):
    """Criar usuário via Supabase Auth Admin API"""
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    body = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "nome": nome,
            "papel": "orcamentista"
        }
    }
    
    response = requests.post(url, json=body, headers=headers)
    
    if response.status_code in [200, 201]:
        user_data = response.json()
        return user_data.get("id"), None
    else:
        return None, response.text

def adicionar_perfil_usuario(user_id, nome, email):
    """Adicionar perfil na tabela usuarios"""
    url = f"{SUPABASE_URL}/rest/v1/usuarios"
    body = {
        "id": user_id,
        "nome": nome,
        "email": email,
        "papel": "orcamentista",
        "ativo": True
    }
    
    response = requests.post(url, json=body, headers=headers)
    
    if response.status_code in [200, 201]:
        return True, None
    else:
        return False, response.text

def main():
    print("🔄 Iniciando adição de usuários...\n")
    
    # Criar Giovanni
    print("➕ Criando Giovanni (giovanni.comercialbiasi@gmail.com)...")
    giovanni_id, erro_giovanni = criar_usuario(
        "giovanni.comercialbiasi@gmail.com", 
        "1234", 
        "Giovanni"
    )
    
    if erro_giovanni:
        print(f"❌ Erro ao criar Giovanni: {erro_giovanni}")
    else:
        print(f"✅ Giovanni criado com UUID: {giovanni_id}")
        
        # Adicionar perfil
        print("📝 Adicionando perfil de Giovanni na tabela usuarios...")
        sucesso, erro = adicionar_perfil_usuario(giovanni_id, "Giovanni", "giovanni.comercialbiasi@gmail.com")
        if sucesso:
            print("✅ Perfil de Giovanni adicionado")
        else:
            print(f"❌ Erro ao adicionar perfil: {erro}")
    
    # Criar Jenni
    print("\n➕ Criando Jenni (araujojenni2009@gmail.com)...")
    jenni_id, erro_jenni = criar_usuario(
        "araujojenni2009@gmail.com", 
        "1234", 
        "Jenni"
    )
    
    if erro_jenni:
        print(f"❌ Erro ao criar Jenni: {erro_jenni}")
    else:
        print(f"✅ Jenni criada com UUID: {jenni_id}")
        
        # Adicionar perfil
        print("📝 Adicionando perfil de Jenni na tabela usuarios...")
        sucesso, erro = adicionar_perfil_usuario(jenni_id, "Jenni", "araujojenni2009@gmail.com")
        if sucesso:
            print("✅ Perfil de Jenni adicionado")
        else:
            print(f"❌ Erro ao adicionar perfil: {erro}")
    
    print("\n🎉 Operação concluída!")

if __name__ == "__main__":
    main()
