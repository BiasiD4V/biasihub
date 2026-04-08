# ERP Biasi Engenharia — Gestão de Obras

Sistema ERP web para gestão de obras de engenharia elétrica. Controle completo de cronogramas, contratos, medições, financeiro, planejamento (CPM/EVM) e equipe.

**Acesso:** https://biasiobras.vercel.app

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite |
| Estilização | Tailwind CSS |
| Backend / Auth | Supabase (PostgreSQL + RLS) |
| Gráficos | Recharts |
| Gantt | Frappe Gantt |
| Exportação | jsPDF, ExcelJS, XLSX |
| IA Conversacional | Google Gemini 2.0 Flash |
| Deploy | Vercel |

---

## Pré-requisitos

- Node.js ≥ 18
- Conta Supabase com projeto configurado

---

## Configuração local

```bash
# 1. Clonar o repositório
git clone <url-do-repo>
cd ERP-Gest-o-de-Obras

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Preencher VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e VITE_GEMINI_API_KEY no .env

# 4. Iniciar servidor de desenvolvimento
npm run dev
# Acesse http://localhost:3000
```

### Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `VITE_GEMINI_API_KEY` | Chave da API Google Gemini (para o Chatbot IA) |

> **Obtenha sua chave Gemini em:** https://aistudio.google.com/apikey

### Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 3000) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build de produção |

---

## Banco de dados

Execute os arquivos da pasta `database/` no Supabase SQL Editor na seguinte ordem:

1. `schema.sql` — Estrutura principal das tabelas
2. `rls_planejamento.sql` — Políticas de Row-Level Security
3. Arquivos `migration_*.sql` — Migrações progressivas

---

## Módulos

### Obras e Contratos
Cadastro de obras, contratos, medições por contrato e gestão de pedidos de compra.

### Planejamento (SPEC-PLN-002-2026)
Módulo avançado de planejamento com:
- **Cronograma** — EAP (WBS) hierárquica com caminho crítico (CPM)
- **Recursos e Equipe** — Histograma de mão de obra e alocação por frente de obra
- **Progresso Semanal** — Apontamento semanal e cálculo de PPC
- **Curva S** — Curva planejado × realizado
- **Desempenho EVM** — VP, VA, IDC, IDP, ONT por semana
- **Reprogramação** — Solicitação e aprovação de reprogramações de atividades
- **Relatório Semanal** — Exportação PDF/Excel com indicadores EVM e RAG

### Financeiro
Controle financeiro, previsto × realizado e custos de mão de obra.

### Diário de Obra
Registro diário de atividades, ocorrências e relatórios por obra.

### Gestão de Tarefas
Criação e acompanhamento de tarefas por obra e usuário.

### Chatbot IA
Assistente conversacional integrado ao sistema, disponível em todas as telas como botão flutuante no canto inferior direito. Powered by **Google Gemini 2.0 Flash**.

- Responde dúvidas sobre os módulos do ERP
- Explica conceitos técnicos (EVM, CPM, Curva S, etc.)
- Contexto mantido durante a sessão
- Suporte a múltiplas linhas e histórico de mensagens
- Requer variável `VITE_GEMINI_API_KEY` configurada no `.env`

### EVM
Curva ABC de custos e análise de valor agregado.

---

## Perfis de acesso

| Perfil | Descrição |
|--------|-----------|
| `admin` | Acesso total a todas as obras e configurações |
| `diretor` | Visualização global e aprovações |
| `gerente` | Gestão completa das obras vinculadas |
| `planejamento` | Edição de cronograma, EAP e apontamentos |
| `supervisor` | Registro de avanços nas obras vinculadas |
| `visualizador` | Somente leitura nas obras vinculadas |

Para detalhes sobre RBAC e RLS, consulte [`TESTE_RBAC_RLS.md`](./TESTE_RBAC_RLS.md).

