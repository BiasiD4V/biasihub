# 📦 Guia de Instalação — BiasíHub Desktop

## Para Usuários Finais

### ⚡ Instalação Rápida

1. **Baixe o instalador**
   - Acesse: https://github.com/BiasiHub/biasihub/releases
   - Download: `BiasíHub Setup 1.0.0.exe`

2. **Execute o instalador**
   - Duplo clique em `BiasíHub Setup 1.0.0.exe`
   - Escolha pasta de instalação (padrão: `C:\Users\seu-usuario\AppData\Local\Programs\BiasíHub`)
   - Clique "Instalar"

3. **Pronto!**
   - Atalho criado na Área de Trabalho
   - Atalho criado no Menu Iniciar
   - Abra e faça login com suas credenciais

### 🔑 Primeiro Acesso

```
Email: seu-email@empresa.com
Senha: sua-senha-supabase
```

Se não tem acesso, contate o administrador.

### ❓ Troubleshooting

**App não abre?**
- Verifique firewall/antivírus (é uma app legítima)
- Tente desinstalar e reinstalar

**Erro de conectividade?**
- Verifique internet (precisa conectar ao Supabase)
- Tente reiniciar a máquina

**Dados não salvam?**
- Verifique permissões de arquivo em `%APPDATA%\biasihub-config`

---

## Para Desenvolvedores

### 🔧 Setup Desenvolvimento

#### Pré-requisitos
- Node.js 18+ ([download](https://nodejs.org/))
- Git
- Editor (VS Code recomendado)

#### Clone e Setup

```bash
# Clone o repo
git clone https://github.com/BiasiHub/biasihub.git
cd biasihub

# Instale dependências de cada módulo
cd Hub/app && npm install
cd ../../Almoxarifado/app && npm install
cd ../../Comercial/orcamentos && npm install
cd ../../Desktop && npm install
```

#### Variáveis de Ambiente

Crie `.env.local` em cada pasta:

**Hub/app/.env.local:**
```
VITE_SUPABASE_URL=https://vzaabtzcilyoknksvhrc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Almoxarifado/app/.env.local:**
```
VITE_SUPABASE_URL=https://vzaabtzcilyoknksvhrc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
ANTHROPIC_API_KEY=sk-ant-... (opcional)
```

**Comercial/orcamentos/.env.local:**
```
VITE_SUPABASE_URL=https://vzaabtzcilyoknksvhrc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 🚀 Rodando em Desenvolvimento

#### Opção 1: Módulos separados (recomendado para editar)

Terminal 1:
```bash
cd Hub/app && npm run dev
# http://localhost:5173
```

Terminal 2:
```bash
cd Almoxarifado/app && npm run dev
# http://localhost:5174
```

Terminal 3:
```bash
cd Comercial/orcamentos && npm run dev
# http://localhost:5175
```

#### Opção 2: App Desktop (melhor para testar integração)

```bash
cd Desktop
npm install
npm start  # Abre o Electron em dev mode
```

### 📦 Building para Desktop

**Build único:**
```bash
cd Desktop
npm run package
# Novo .exe em: Desktop\dist-installer\BiasíHub Setup *.exe
```

**Build completo (rebuild tudo + empacota):**
```bash
Desktop\build.bat
# Windows: duplo clique em build.bat OU
# Git Bash: bash Desktop/build.bat
```

### 🔄 Fluxo de Desenvolvimento

```bash
# 1. Crie branch
git checkout -b feat/minha-feature

# 2. Desenvolva (use npm run dev em cada módulo)

# 3. Teste no Desktop
cd Desktop && npm start

# 4. Commit
git add .
git commit -m "Add nova feature"

# 5. Push
git push origin feat/minha-feature

# 6. Abra Pull Request no GitHub
```

### 🏗️ Estrutura de Pastas

```
biasihub/
├── Hub/app/                    # Portal
│   ├── src/
│   │   ├── pages/HubPortal.tsx
│   │   ├── context/AuthContext.tsx
│   │   └── ...
│   ├── vite.config.ts
│   └── package.json
│
├── Almoxarifado/app/           # Estoque + IA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Solicitacoes.tsx  # ⭐ Solicitações com IA
│   │   │   ├── Estoque.tsx
│   │   │   └── ...
│   │   ├── api/solicitar.js      # API local (Vercel)
│   │   └── ...
│   └── package.json
│
├── Comercial/orcamentos/       # Orçamentos
│   ├── src/
│   │   ├── pages/DashboardBI.tsx
│   │   └── ...
│   └── package.json
│
├── Desktop/                    # Electron
│   ├── electron/
│   │   ├── main.js             # Processo principal
│   │   ├── preload.js
│   │   └── ...
│   ├── resources/
│   │   └── icon.png
│   ├── apps/                   # (gerado pelo build)
│   │   ├── hub/
│   │   ├── almoxarifado/
│   │   └── comercial/
│   ├── package.json
│   ├── build.bat
│   └── electron-builder.yml
│
├── README.md
├── INSTALL.md
└── .gitignore
```

### 🧪 Testando Localmente

```bash
# Teste individual (módulo isolado)
cd Hub/app && npm run build && npm run preview

# Teste completo (Desktop)
cd Desktop
npm start  # hot reload automático durante dev
npm run package  # gera instalador de teste
```

### 📋 Checklist Antes de Commit

- [ ] Código testado localmente
- [ ] Sem console.logs desnecessários
- [ ] Tipos TypeScript completos
- [ ] Sem breaking changes
- [ ] Mensagem de commit clara

### 🐛 Debug

**Desktop em modo debug:**
```bash
cd Desktop
npm start  # Abre DevTools automaticamente
```

**Inspecionar recursos locais:**
- Ctrl+Shift+I → Application → Storage
- Ver arquivos em `app://hub.local/`, `app://almoxarifado.local/`, etc.

---

## Dúvidas?

- 📖 [README.md](./README.md) — Visão geral do projeto
- 💬 Issues → GitHub Issues
- 👥 Discussion → GitHub Discussions

**Happy coding! 🚀**
