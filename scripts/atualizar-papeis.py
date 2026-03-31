import requests

SUPABASE_URL = "https://vzaabtzcilyoknksvhrc.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o"

headers = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
}

def adicionar_perfis_existentes():
    """Adicionar perfis para usuários já criados no Auth"""
    
    usuarios = [
        {
            "id": "f00ceaf5-7d6d-49f9-8e6e-5b2dbba163b5",
            "nome": "Giovanni",
            "email": "giovanni.comercialbiasi@gmail.com"
        },
        {
            "id": "398f7c7a-e908-4049-87b0-454c665176aa",
            "nome": "Jenni",
            "email": "araujojenni2009@gmail.com"
        }
    ]
    
    url = f"{SUPABASE_URL}/rest/v1/usuarios"
    
    for usuario in usuarios:
        body = {
            "id": usuario["id"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "papel": "orcamentista",
            "ativo": True
        }
        
        print(f"📝 Adicionando perfil de {usuario['nome']}...")
        response = requests.post(url, json=body, headers=headers)
        
        if response.status_code in [200, 201]:
            print(f"✅ Perfil de {usuario['nome']} adicionado com sucesso")
        else:
            print(f"❌ Erro ao adicionar {usuario['nome']}: {response.text}")
    
    print("\n🎉 Operação concluída!")

if __name__ == "__main__":
    adicionar_perfis_existentes()
