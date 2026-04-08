# 🔧 Como Criar Usuários de Teste

## ⚠️ IMPORTANTE
A tabela `perfis` referencia `auth.users`. Precisa criar os usuários em **Auth primeiro**, depois criar o perfil.

---

## 📝 PASSO 1: Criar Usuários em Supabase Auth UI

1. Abra Supabase Dashboard → seu projeto
2. **Authentication** → **Users**
3. Clique **"Invite"** (botão verde)

### Criar 6 usuários de teste:

| Email | Temporária | Papel |
|---|---|---|
| `admin@test.com` | `Test123!` | admin |
| `diretor@test.com` | `Test123!` | diretor |
| `gerente@test.com` | `Test123!` | gerente |
| `planejamento@test.com` | `Test123!` | planejamento |
| `supervisor@test.com` | `Test123!` | supervisor |
| `visualizador@test.com` | `Test123!` | visualizador |

**Para cada um:**

1. Digite email
2. Marque "Generate a password"
3. Clique **Send invite**
4. Anota o **User ID** que aparece (UUID)

---

## 📋 PASSO 2: Guardar os IDs

Você vai ver uma tabela com os usuários. Clique em cada um e copie o **User ID** (UUID):

```
admin@test.com           → xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
diretor@test.com         → xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
gerente@test.com         → xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
planejamento@test.com    → xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
supervisor@test.com      → xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
visualizador@test.com    → xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 💾 PASSO 3: Executar SQL para Criar Perfis

Abra **SQL Editor** no Supabase e execute:

```sql
-- ADMIN
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  'UUID_DO_ADMIN_AQUI',
  'Admin User',
  'admin@test.com',
  'admin',
  true
);

-- DIRETOR
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  'UUID_DO_DIRETOR_AQUI',
  'Diretor',
  'diretor@test.com',
  'diretor',
  true
);

-- GERENTE
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  'UUID_DO_GERENTE_AQUI',
  'Gerente',
  'gerente@test.com',
  'gerente',
  true
);

-- PLANEJAMENTO
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  'UUID_DO_PLANEJAMENTO_AQUI',
  'Planejamento',
  'planejamento@test.com',
  'planejamento',
  true
);

-- SUPERVISOR
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  'UUID_DO_SUPERVISOR_AQUI',
  'Supervisor',
  'supervisor@test.com',
  'supervisor',
  true
);

-- VISUALIZADOR
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  'UUID_DO_VISUALIZADOR_AQUI',
  'Visualizador',
  'visualizador@test.com',
  'visualizador',
  true
);
```

**Substitua `UUID_XXX_AQUI` pelos UUIDs copiados do passo anterior.**

---

## ✅ TESTE

Depois que executar, rode:

```sql
SELECT id, nome, email, perfil FROM perfis ORDER BY perfil;
```

Deve aparecer 6 linhas com os usuários.

---

## 🚀 AGORA PODE TESTAR!

A página `/admin/acessos` agora vai puxar os 6 usuários do dropdown.

