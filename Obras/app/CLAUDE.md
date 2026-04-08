## Contexto do Projeto

Você está trabalhando no sistema ERP de Gestão de Obras da Biasi Engenharia e Instalações Ltda.
Empresa de instalações elétricas e hidráulicas comerciais e industriais, sediada em Louveira/SP.

Stack técnica:
- Frontend: React + Tailwind CSS
- Backend/Banco: Supabase (PostgreSQL)
- Roteamento: React Router
- Ícones: Lucide React
- Gráficos: Recharts
- Estrutura: src/pages/, src/components/, src/lib/, src/hooks/, src/context/

Padrão visual obrigatório:
- Cor primária: #233772 (azul Biasi)
- Fonte de títulos: Montserrat
- Componentes: bordas arredondadas (rounded-xl), sombras suaves, Tailwind utility classes
- Badges de status: fundo colorido suave + texto bold na mesma cor
- Tabelas: cabeçalho bg-slate-50, linhas com hover:bg-slate-50, bordas border-slate-200

---

## Módulos já implementados

- Cronograma (CronogramaPlanejamento.jsx): EAP hierárquica CC/E/SE/S, importação Excel,
  predecessoras FS/SS/FF/SF com lag, CPM (caminho crítico), modo progresso, baseline congelada
- Dashboard Planejamento (DashboardPlanejamento.jsx): KPIs IDP/IDC/PPC, Curva S consolidada,
  fila de reprogramações pendentes
- Tabelas Supabase principais:
    obra_planejamentos, planejamento_eap, planejamento_atividades,
    planejamento_predecessoras, evm_snapshots, avancos_fisicos, reprogramacoes

---

## Arquivos pendentes (próximas entregas)

1. src/lib/planejamento/calcCPM.js
   Motor CPM completo: passada direta (IC/TC) e reversa (IT/TT), folga total/livre,
   detecção de caminho crítico (FT=0) e near-critical (FT <= 5% do prazo),
   suporte a FS/SS/FF/SF com lag, calendário dias úteis seg-sex,
   ordenação topológica com detecção de ciclos.

2. src/components/planejamento/ModalPredecessoras.jsx
   Modal para editar predecessoras de uma atividade tipo S:
   select de atividade predecessora, select de tipo FS/SS/FF/SF,
   input de lag em dias, notação estilo MS Project (ex: 1.1.1.1FS+2),
   salva em planejamento_predecessoras e dispara recálculo CPM.

---

## Regras de desenvolvimento

- SEMPRE manter padrão visual #233772 + Montserrat + Tailwind
- NUNCA alterar estrutura das tabelas planejamento_eap e planejamento_atividades
- NUNCA quebrar a lógica de baseline congelada (campos somente leitura quando congelado)
- Usar SEMPRE os hooks existentes: useAuth, useObra, usePermissoes
- Variáveis e comentários em português (padrão do projeto)
- Formulários centralizados no componente pai (pendingForms/pendingProgresso pattern)
- Soft delete para exclusões (campo deletado_em, nunca DELETE físico na EAP)
- Salvar em lote (botão "Salvar tudo") em vez de salvar linha por linha

---

## Metodologia de planejamento (referência teórica)

CPM baseado em Aldo Dórea Mattos ("Planejamento e Controle de Obras"):
- IC = Início Mais Cedo, TC = Fim Mais Cedo (passada direta)
- IT = Início Mais Tarde, TT = Fim Mais Tarde (passada reversa)
- FT = Folga Total = IT - IC
- Atividade crítica: FT = 0
- Near-critical: FT > 0 e FT <= 5% do prazo total
- Múltiplas predecessoras: regra do MÁXIMO na passada direta
- Múltiplas sucessoras: regra do MÍNIMO na passada reversa

---

## Como responder

Antes de gerar código:
1. Confirme o entendimento do que será feito em 3 linhas
2. Liste dúvidas se houver ambiguidade
3. Informe quais arquivos serão criados ou modificados

Ao gerar código:
- Código completo e funcional, sem placeholders
- Comentários em português nas funções principais
- Tratamento de erro em todas as chamadas ao Supabase
- Pergunte sobre colunas do banco antes de assumir que existem