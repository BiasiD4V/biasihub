# ⚠️ INSTRUÇÕES CRÍTICAS: CRIAR USUÁRIOS NO SUPABASE AUTH

## PROBLEMA IDENTIFICADO
O sistema está aceitando qualquer email porque **NÃO HÁ USUÁRIOS CRIADOS NO SUPABASE AUTH**.

Você precisa criar os usuários MANUALMENTE no Supabase Auth ANTES de tentar fazer login.

## PASSO A PASSO

### 1️⃣ Acesse o Supabase Dashboard
- https://supabase.com/dashboard
- Selecione o projeto `vzaabtzcilyoknksvhrc`

### 2️⃣ Vá para Authentication → Users

### 3️⃣ Clique em "Add user" e MARQUE "Auto Confirm User"

### 4️⃣ Crie os 3 usuários com EXATAMENTE esses dados:

```
Email: guilherme@biasiengenharia.com
Senha: 1234

Email: pauloconfar@biasiengenharia.com
Senha: 1234

Email: ryan.stradioto@biasiengenharia.com
Senha: 1234
```

### 5️⃣ COPIE OS UUIDs gerados

Cada usuário criado receberá um UUID único. Você verá no dashboard:
- Usuário 1: UUID → copie este valor
- Usuário 2: UUID → copie este valor  
- Usuário 3: UUID → copie este valor

### 6️⃣ Atualize o arquivo `scripts/sql/05-seed-usuarios.sql`

Abra o arquivo e substitua:
- `<uuid-guilherme>` → Cole o UUID do Guilherme
- `<uuid-paulo>` → Cole o UUID do Paulo
- `<uuid-ryan>` → Cole o UUID do Ryan

**Exemplo:**
```sql
INSERT INTO public.usuarios (id, nome, email, papel, ativo) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Guilherme', 'guilherme@biasiengenharia.com', 'admin', true),
  ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Paulo Confar', 'pauloconfar@biasiengenharia.com', 'admin', true),
  ('6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'Ryan Stradioto', 'ryan.stradioto@biasiengenharia.com', 'admin', true)
```

### 7️⃣ Execute o SQL no Supabase SQL Editor

- Vá para **SQL Editor**
- Copie o conteúdo do arquivo `scripts/sql/05-seed-usuarios.sql` (já com UUIDs)
- Cole e execute

### 8️⃣ Execute a migração de autenticação (se ainda não fez)

- Vá para **SQL Editor**
- Copie o conteúdo do arquivo `scripts/sql/04-auth-usuarios.sql`
- Cole e execute (vai criar a tabela `usuarios` e as políticas RLS)

## ✅ AGORA SIM VOCÊ PODE TESTAR!

```bash
npm run dev
```

E fazer login com:
- Email: `guilherme@biasiengenharia.com`
- Senha: `1234`

Se digitar uma senha errada ou um email que não existe, será rejeitado! 🔒
