# ✅ SETUP FINAL - 2 MINUTOS

## 🎯 OBJETIVO
Sistema que **REJEITA** qualquer email/senha que não seja correto.

Apenas estes 3 usuários podem entrar com senha `1234`:
- `guilherme@biasiengenharia.com`
- `pauloconfar@biasiengenharia.com`
- `ryan.stradioto@biasiengenharia.com`

---

## 🚀 COMO FAZER (2 PASSOS)

### PASSO 1: Executar SQL no Supabase (1 minuto)

1. Abra: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá para: **SQL Editor**
4. Clique em **"New Query"**
5. Copie TODO o conteúdo deste arquivo:
   ```
   scripts/sql/06-criar-usuarios-completo.sql
   ```
6. Cola no Supabase
7. Clique em **RUN** (ou Ctrl+Enter)
8. Pronto! ✅

---

### PASSO 2: Teste o Login (1 minuto)

1. Na pasta do projeto, execute:
   ```bash
   npm run dev
   ```

2. Abra: http://localhost:5173

3. Clique em "Entrar"

4. Teste com:
   - Email: `guilherme@biasiengenharia.com`
   - Senha: `1234`
   - ✅ Deve funcionar!

5. Teste com senha errada:
   - Email: `guilherme@biasiengenharia.com`
   - Senha: `9999`
   - ❌ Deve aparecer erro! (Assim que você quer)

---

## 📝 O que o SQL faz

O arquivo `06-criar-usuarios-completo.sql` faz TUDO automaticamente:

✅ Cria os 3 usuários no `auth.users` (Supabase Auth)
✅ Define quantidade corretos (com hash seguro)
✅ Cria os perfis na tabela `usuarios`
✅ Tudo pronto para fazer login

---

## 🔒 POR QUE AGORA VAI FUNCIONAR?

**Antes:** Sem usuários no Auth → qualquer email entrava
**Depois:** Com usuários no Auth → só entra com credenciais corretas!

---

## ✅ PRONTINHO!

É literalmente isso. 2 passos e pronto! Execute o SQL e teste o login.

Qualquer erro, me avisa! 🚀