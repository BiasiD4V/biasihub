# BiasíHub — ERP Corporativo Biasi Engenharia

Plataforma integrada com 3 módulos: **Hub (Portal)**, **Almoxarifado** e **Comercial**

## 🚀 Início Rápido

### Instalação Desktop (Windows)

1. Baixe o instalador: [BiasíHub Setup 1.0.0.exe](https://github.com/BiasiHub/biasihub/releases)
2. Duplo clique para instalar
3. Atalho criado automaticamente na Área de Trabalho
4. Pronto! Abra e faça login com Supabase

### Desenvolvimento

#### Pré-requisitos
- Node.js 18+
- npm ou yarn

#### Setup local

```bash
# Hub
cd Hub/app && npm install && npm run dev

# Almoxarifado
cd Almoxarifado/app && npm install && npm run dev

# Comercial
cd Comercial/orcamentos && npm install && npm run dev
```

#### Build para Desktop

```bash
cd Desktop
npm install
npm start  # testa em dev
npm run package  # gera .exe
```

## 📦 Estrutura

```
├── Hub/app/                    # Portal principal
│   └── src/pages/HubPortal.tsx # Seletor de módulos
├── Almoxarifado/app/           # Gestão de estoque + IA
│   ├── api/solicitar.js        # API da IA (Anthropic)
│   └── src/pages/Solicitacoes.tsx
├── Comercial/orcamentos/       # Orçamentos + Dashboard
└── Desktop/                    # App Electron
    ├── electron/main.js        # Processo principal
    └── build.bat               # Script de build completo
```

## 🔐 Configuração

### Variáveis de Ambiente

Cada módulo precisa de:

```env
VITE_SUPABASE_URL=https://vzaabtzcilyoknksvhrc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
ANTHROPIC_API_KEY=sk-ant-...  # para Almoxarifado
```

### Chave Anthropic (IA)

Para usar a IA nas Solicitações:

1. Gere uma chave em https://console.anthropic.com/settings/keys
2. **Web (Vercel):** adicione em Project Settings → Environment Variables
3. **Desktop:** a chave é salva localmente em `%APPDATA%\biasihub-config`

## 🏗️ Arquitetura

- **Frontend:** React 18 + TypeScript + Vite + Tailwind
- **Backend:** Supabase (auth + DB) + Vercel Functions + Electron
- **Desktop:** Electron 34 + Protocol personalizado `app://`
- **API de IA:** Claude Haiku (classificação de solicitações)

### Autenticação

- Supabase Auth (Email/Senha)
- SSO entre módulos via URL hash (token)
- RLS (Row Level Security) no Supabase

## 📱 Funcionalidades

### Hub
- Seletor de módulos
- Controle de acesso por departamento
- Dashboard unificado

### Almoxarifado
- Gestão de estoque
- Requisições e movimentações
- **Solicitações com IA:** classifica automaticamente por categoria/prioridade/disponibilidade
- Frota e manutenção
- Relatórios

### Comercial
- Orçamentos e propostas
- Kanban comercial
- Dashboard BI (charts)
- Leads e clientes

## 🛠️ Desenvolvimento

### Fluxo de Trabalho

```bash
# 1. Crie branch
git checkout -b feat/sua-feature

# 2. Desenvolva e teste
npm run dev  # rodando localmente

# 3. Commit
git add .
git commit -m "Add sua feature"

# 4. Push
git push origin feat/sua-feature

# 5. Pull Request no GitHub
```

### Para atualizar o app instalado

```bash
# Terminal (na pasta do projeto)
cd Desktop
npm install
npm run package

# Novo .exe fica em:
# Desktop\dist-installer\BiasíHub Setup 1.0.0.exe
```

## 📊 Banco de Dados (Supabase)

### Tabelas principais

- `usuarios` — perfis, departamentos, papéis
- `solicitacoes_almoxarifado` — requisições com análise da IA
- `itens_estoque` — catálogo do almoxarifado
- `movimentacoes` — histórico de entradas/saídas
- `orcamentos` — propostas comerciais
- `presenca_usuarios` — online/offline tracking

## 🚀 Deploy

### Web (Vercel)
```bash
npx vercel --prod
```

### Desktop
```bash
Desktop\build.bat
```

## 📄 Licença

Biasi Engenharia © 2025

---

**Desenvolvido com ❤️ usando React + Supabase + Electron**
