# 🚀 SETUP FINAL - OrcaBiasi

## ⚡ RÁPIDO - 3 PASSOS

### Passo 1: Inicie o servidor
```bash
cd orcamentos
npm install
npm run dev
```

### Passo 2: Acesse a página de setup
Abra no navegador: **http://localhost:5173/setup-uuids**

### Passo 3: Siga as instruções na página
A página vai te guiar para:
1. Copiar os usuários do Supabase
2. Gerar o SQL automaticamente
3. Executar no Supabase

---

## 📋 SE PREFERIR FAZER MANUALMENTE:

### 1. Criar usuários no Supabase Auth

Acesse: https://supabase.com/dashboard

**Authentication → Users → "Add user"**

Crie 3 usuários (marque "Auto Confirm User"):

```
1. guilherme@biasiengenharia.com | Senha: 1234
2. pauloconfar@biasiengenharia.com | Senha: 1234
3. ryan.stradioto@biasiengenharia.com | Senha: 1234
```

### 2. Copie os UUIDs
Cada usuário terá um UUID. Copie os 3.

### 3. Acesse: http://localhost:5173/setup-uuids
Cole lá que eu gero o SQL pronto!

---

## ✅ VALIDAR

Após executar tudo, teste:

```bash
npm run dev
```

Acesse: http://localhost:5173/debug

Deve mostrar seus 3 usuários! ✅

---

## 🎉 PRONTO!

Agora faça login com:
- Email: `guilherme@biasiengenharia.com`
- Senha: `1234`

Se digitar senha errada, será rejeitado! 🔒