import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import type { OrcamentoCard } from '../../context/NovoOrcamentoContext';
import type { FollowUp } from '../../domain/entities/FollowUp';
import type { MudancaEtapa } from '../../domain/entities/MudancaEtapa';
import type { Pendencia } from '../../domain/entities/Pendencia';
import { fornecedoresRepository, type FornecedorSupabase } from '../../infrastructure/supabase/fornecedoresRepository';
import {
  criarWorkspacePadrao,
  orcamentoWorkspaceRepository,
  type AreaWorkspace,
  type CotacaoWorkspace,
  type DisciplinaWorkspace,
  type DocumentoWorkspace,
  type HistoricoWorkspace,
  type ItemEscopoWorkspace,
  type OrcamentoWorkspaceDados,
} from '../../infrastructure/supabase/orcamentoWorkspaceRepository';
import { propostasRepository } from '../../infrastructure/supabase/propostasRepository';
import { supabase } from '../../infrastructure/supabase/client';
import './CentralOrcamentoDinamica.css';

type ViewKey = 'overview' | 'cadastro' | 'scope' | 'quotes' | 'proposal' | 'history';
type StrategyKey = 'economica' | 'recomendada' | 'premium' | 'marca_exigida';
type CadastroExtra = {
  comercial?: { documento?: string; contato?: string; telefone?: string; email?: string; cliente?: string; obra?: string };
  interno?: { responsavel?: string; origem?: string; validade?: string; chance?: string; prioridade?: string; prazo?: string };
};
type WorkspaceExtendido = OrcamentoWorkspaceDados & { cadastro?: CadastroExtra; etapaAtual?: ViewKey };

type LaunchAction = { target: string; icon: string; title: string; text: string };
type LaunchConfig = { eyebrow: string; title: string; description: string; art: ViewKey; actions: LaunchAction[] };

type DetailConfig = {
  title: string;
  desc: string;
  primary: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  workspaceCta: string;
  workspaceTarget: string;
  tasks: Array<[string, string]>;
  items: Array<[string, string]>;
};

interface CentralOrcamentoDinamicaProps {
  propostaId: string;
  orc: OrcamentoCard;
  usuarioNome?: string | null;
  followUps?: FollowUp[];
  pendencias?: Pendencia[];
  mudancasEtapa?: MudancaEtapa[];
  onRegistrarFollowUp?: () => void;
  onAdicionarPendencia?: () => void;
  onResolverPendencia?: (pendenciaId: string) => void;
}

const accentByView: Record<ViewKey, string> = {
  overview: '#4b8cff',
  cadastro: '#2dc58d',
  scope: '#f4b44f',
  quotes: '#9b7cff',
  proposal: '#28d2c0',
  history: '#ff8b5f',
};

const progressMap: Record<ViewKey, number> = {
  overview: 48,
  cadastro: 58,
  scope: 72,
  quotes: 84,
  proposal: 92,
  history: 100,
};

const stepper: Array<{ id: ViewKey; number: string; title: string; text: string }> = [
  { id: 'overview', number: '01', title: 'Entender', text: 'Resumo e leitura inicial.' },
  { id: 'cadastro', number: '02', title: 'Base da obra', text: 'Áreas, dados e documentos.' },
  { id: 'scope', number: '03', title: 'Escopo', text: 'Disciplinas e itens.' },
  { id: 'quotes', number: '04', title: 'Cotações', text: 'Fornecedores e comparação.' },
  { id: 'proposal', number: '05', title: 'Proposta', text: 'Estratégia e histórico.' },
];

const disciplineOptions: Array<{ id: DisciplinaWorkspace; label: string; prefix: string }> = [
  { id: 'eletrica', label: 'Elétrica', prefix: '1.1' },
  { id: 'hidraulica', label: 'Hidráulica', prefix: '1.2' },
  { id: 'incendio', label: 'Incêndio', prefix: '1.3' },
  { id: 'gas', label: 'Gás', prefix: '1.4' },
  { id: 'spda', label: 'SPDA', prefix: '1.5' },
  { id: 'dados', label: 'Dados', prefix: '1.6' },
  { id: 'outros', label: 'Outros', prefix: '1.9' },
];

const launchConfig: Record<ViewKey, LaunchConfig> = {
  overview: {
    eyebrow: 'Passo 01 · Entender',
    title: 'Comece pela leitura do orçamento',
    description: 'Nesta etapa aparecem apenas as ações de entendimento inicial.',
    art: 'overview',
    actions: [
      { target: 'summary', icon: '01', title: 'Ver resumo', text: 'Status, prazo, responsável e próximos movimentos.' },
      { target: 'context', icon: '02', title: 'Painel de contexto', text: 'Prioridade, chance, risco e leitura comercial.' },
      { target: 'summaryDocuments', icon: '03', title: 'Documentos base', text: 'Projetos, memoriais e arquivos de apoio.' },
      { target: 'summaryHistory', icon: '04', title: 'Histórico inicial', text: 'Decisões e conversas antes de preencher.' },
    ],
  },
  cadastro: {
    eyebrow: 'Passo 02 · Base da obra',
    title: 'Monte a base antes do escopo',
    description: 'Áreas, dados comerciais, dados internos e documentos ficam juntos aqui.',
    art: 'cadastro',
    actions: [
      { target: 'area', icon: '01', title: 'Lançar área', text: 'Cadastre locais, m² e disciplinas por área.' },
      { target: 'commercial', icon: '02', title: 'Dados comerciais', text: 'Contato, documento e referência do cliente.' },
      { target: 'internal', icon: '03', title: 'Dados internos', text: 'Responsável, origem, validade e chance.' },
      { target: 'document', icon: '04', title: 'Documento base', text: 'Registre arquivos usados na análise.' },
    ],
  },
  scope: {
    eyebrow: 'Passo 03 · Escopo',
    title: 'Organize o escopo técnico',
    description: 'Itens por disciplina, código automático, locais e premissas técnicas.',
    art: 'scope',
    actions: [
      { target: 'scope', icon: '01', title: 'Novo item', text: 'Crie item técnico com código automático.' },
      { target: 'disciplines', icon: '02', title: 'Disciplinas', text: 'Troque entre elétrica, hidráulica e demais frentes.' },
      { target: 'service', icon: '03', title: 'Detalhar item', text: 'Inclui, exclui, premissas e observações.' },
      { target: 'area', icon: '04', title: 'Cadastrar local', text: 'Adicione área sem sair do fluxo de escopo.' },
    ],
  },
  quotes: {
    eyebrow: 'Passo 04 · Cotações',
    title: 'Compare fornecedores sem perder contexto',
    description: 'Valores, prazos, pagamento, validade e opção considerada.',
    art: 'quotes',
    actions: [
      { target: 'quote', icon: '01', title: 'Lançar cotação', text: 'Fornecedor, valor e condição comercial.' },
      { target: 'supplier', icon: '02', title: 'Novo fornecedor', text: 'Cadastre e selecione o fornecedor na hora.' },
      { target: 'quoteList', icon: '03', title: 'Comparar opções', text: 'Marque qual cotação entra na proposta.' },
      { target: 'proposal', icon: '04', title: 'Avançar proposta', text: 'Use a cotação para defender a estratégia.' },
    ],
  },
  proposal: {
    eyebrow: 'Passo 05 · Proposta',
    title: 'Transforme técnica em estratégia comercial',
    description: 'Escolha o caminho comercial e registre a defesa da proposta.',
    art: 'proposal',
    actions: [
      { target: 'proposal', icon: '01', title: 'Definir estratégia', text: 'Econômica, recomendada, premium ou marca exigida.' },
      { target: 'quoteList', icon: '02', title: 'Revisar cotações', text: 'Confira o fornecedor considerado.' },
      { target: 'history', icon: '03', title: 'Registrar decisão', text: 'Salve a decisão na linha do tempo.' },
      { target: 'document', icon: '04', title: 'Anexar documento', text: 'Guarde apoio da proposta final.' },
    ],
  },
  history: {
    eyebrow: 'Histórico · Rastreabilidade',
    title: 'Registre a história do orçamento',
    description: 'Decisões, e-mails, ligações, pendências e próximos passos.',
    art: 'history',
    actions: [
      { target: 'history', icon: '01', title: 'Salvar histórico', text: 'Registre decisão, ligação, e-mail ou pendência.' },
      { target: 'summaryHistory', icon: '02', title: 'Histórico inicial', text: 'Veja os primeiros movimentos do orçamento.' },
      { target: 'document', icon: '03', title: 'Documento', text: 'Anexe evidências da decisão.' },
      { target: 'context', icon: '04', title: 'Contexto', text: 'Atualize prioridade, prazo e chance.' },
    ],
  },
};

const defaultTargets: Record<ViewKey, string> = {
  overview: 'summary',
  cadastro: 'area',
  scope: 'scope',
  quotes: 'quote',
  proposal: 'proposal',
  history: 'history',
};
const targetView: Record<string, ViewKey> = {
  summary: 'overview',
  context: 'overview',
  summaryDocuments: 'overview',
  summaryHistory: 'overview',
  area: 'cadastro',
  commercial: 'cadastro',
  internal: 'cadastro',
  document: 'cadastro',
  scope: 'scope',
  disciplines: 'scope',
  service: 'scope',
  quote: 'quotes',
  supplier: 'quotes',
  quoteList: 'quotes',
  proposal: 'proposal',
  history: 'history',
};

const strategyOptions: Record<StrategyKey, { title: string; desc: string; changes: string[]; stays: string[] }> = {
  economica: {
    title: 'Econômica',
    desc: 'Boa para cliente sensível a preço e para defender uma entrada mais competitiva.',
    changes: ['Reduz custo de fornecimento', 'Aceita alternativas técnicas equivalentes', 'Pode alongar prazo do item principal'],
    stays: ['Escopo executivo da Biasi', 'Responsabilidades contratuais', 'Exclusões civis fora da proposta'],
  },
  recomendada: {
    title: 'Melhor custo-benefício',
    desc: 'Equilibra prazo, valor, percepção de qualidade e defesa comercial simples.',
    changes: ['Mantém padrão técnico robusto', 'Posiciona a proposta como solução segura', 'Usa cotação considerada como referência'],
    stays: ['Escopo de instalação da Biasi', 'Premissas e exclusões estruturais', 'Modelo de atendimento ao cliente'],
  },
  premium: {
    title: 'Premium',
    desc: 'Faz sentido quando o cliente valoriza padrão superior e marca forte.',
    changes: ['Eleva percepção técnica', 'Mantém prazo competitivo quando possível', 'Aumenta valor final da proposta'],
    stays: ['Escopo da Biasi', 'Responsabilidades do cliente e terceiros', 'Base geral da proposta'],
  },
  marca_exigida: {
    title: 'Marca exigida',
    desc: 'Use quando memorial ou cliente amarram a especificação.',
    changes: ['Reduz flexibilidade comercial', 'Protege aderência documental', 'Prende decisão ao documento-base'],
    stays: ['Escopo de instalação', 'Estrutura geral do serviço', 'Rastreabilidade da decisão'],
  },
};

function detailFor(target: string): DetailConfig {
  const base: Record<string, DetailConfig> = {
    summary: {
      title: 'Resumo do orçamento', desc: 'Leitura rápida de status, prazo, pendências e próximo movimento.', primary: 'Conferir resumo',
      workspaceTitle: 'Tarefas do resumo', workspaceSubtitle: 'Só aparece o que ajuda a entender o orçamento agora.', workspaceCta: 'Conferir resumo', workspaceTarget: 'summary',
      tasks: [['Ler status geral', 'Confirmar etapa atual, prazo e responsável.'], ['Mapear pendências', 'Separar documento, escopo, cotação e estratégia.'], ['Validar próximo passo', 'Definir qual frente será trabalhada primeiro.'], ['Preparar reunião', 'Usar este resumo como primeira leitura.']],
      items: [['Etapa atual', 'Análise inicial com base e escopo em andamento.'], ['Próximo passo', 'Completar base antes de cotar.'], ['Pontos de atenção', 'Documentos, premissas e responsabilidades.'], ['Decisão esperada', 'Escolher a frente prioritária.']],
    },
    context: {
      title: 'Contexto do orçamento', desc: 'Responsabilidade, prioridade, prazo, risco e chance de fechamento.', primary: 'Revisar contexto',
      workspaceTitle: 'Tarefas do painel de contexto', workspaceSubtitle: 'Somente responsabilidade, prioridade, prazo, risco e chance.', workspaceCta: 'Revisar contexto', workspaceTarget: 'context',
      tasks: [['Confirmar responsável', 'Validar quem conduz por dentro da Biasi.'], ['Definir prioridade', 'Marcar alta, média ou baixa.'], ['Checar prazo', 'Confirmar a data interna.'], ['Registrar risco', 'Escrever o que pode travar a proposta.']],
      items: [['Responsável', 'Quem acompanha o avanço interno.'], ['Prioridade', 'Classificação comercial.'], ['Chance', 'Probabilidade estimada de fechamento.'], ['Risco', 'O que reduz a força da proposta.']],
    },
    summaryDocuments: {
      title: 'Documentos base', desc: 'Materiais que sustentam a leitura inicial e evitam perda de referência.', primary: 'Abrir documentos',
      workspaceTitle: 'Tarefas dos documentos base', workspaceSubtitle: 'Projetos, memoriais, planilhas e arquivos de apoio.', workspaceCta: 'Abrir base documental', workspaceTarget: 'summaryDocuments',
      tasks: [['Conferir projetos', 'Verificar link e revisão.'], ['Validar memorial', 'Confirmar versão usada.'], ['Anexar planilha', 'Vincular apoio do cliente.'], ['Marcar visita', 'Sinalizar pendência de campo.']],
      items: [['Projetos', 'Base para consulta.'], ['Memorial', 'Referência técnica.'], ['Planilha do cliente', 'Arquivo de equalização.'], ['Visita técnica', 'Status do levantamento.']],
    },
    summaryHistory: {
      title: 'Histórico inicial', desc: 'Principais acontecimentos antes de avançar para cadastro, escopo e cotações.', primary: 'Ver linha do tempo',
      workspaceTitle: 'Tarefas do histórico inicial', workspaceSubtitle: 'Registros e decisões iniciais, sem misturar cotação.', workspaceCta: 'Abrir histórico', workspaceTarget: 'summaryHistory',
      tasks: [['Revisar conversa', 'Checar o que já foi alinhado.'], ['Registrar decisão', 'Salvar impacto no escopo.'], ['Separar pendências', 'Transformar observações em próximos passos.'], ['Atualizar timeline', 'Adicionar data e responsável.']],
      items: [['Primeiro contato', 'Entrada da oportunidade.'], ['Decisão interna', 'Critérios já definidos.'], ['Pendências', 'Pontos a resolver.'], ['Próximo', 'Registrar fornecedores no passo 04.']],
    },
    area: {
      title: 'Lançamento de área da obra', desc: 'Cadastro de locais com metragem e disciplinas para alimentar escopo e cotações.', primary: 'Cadastrar área',
      workspaceTitle: 'Tarefas de áreas da obra', workspaceSubtitle: 'Monte a base de locais para os próximos passos.', workspaceCta: 'Cadastrar área', workspaceTarget: 'area',
      tasks: [['Criar local', 'Cadastrar pavimento, setor ou ambiente.'], ['Relacionar disciplinas', 'Definir frentes executadas na área.'], ['Evitar duplicidade', 'Checar se o local já existe.'], ['Liberar escopo', 'Usar a área nos itens técnicos.']],
      items: [['Nome', 'Área, pavimento ou setor.'], ['Metragem', 'm² usados como referência.'], ['Disciplinas', 'Frentes vinculadas ao local.'], ['Resultado', 'Área aparece no escopo.']],
    },
    commercial: {
      title: 'Dados comerciais do cliente', desc: 'Contato e identificação para a proposta não depender de planilha externa.', primary: 'Salvar dados comerciais',
      workspaceTitle: 'Tarefas dos dados comerciais', workspaceSubtitle: 'Cliente, contato e referência comercial.', workspaceCta: 'Editar dados comerciais', workspaceTarget: 'commercial',
      tasks: [['Validar cliente', 'Confirmar nome usado na proposta.'], ['Confirmar contato', 'Responsável, telefone e e-mail.'], ['Padronizar envio', 'Garantir destinatário correto.'], ['Salvar alterações', 'Registrar antes de avançar.']],
      items: [['Cliente', 'Nome do cliente.'], ['Responsável', 'Contato principal.'], ['Contato', 'Telefone e e-mail.'], ['Uso', 'Cabeçalho e envio.']],
    },
    internal: {
      title: 'Dados internos do orçamento', desc: 'Controle de origem, validade, prioridade e chance de fechamento.', primary: 'Salvar dados internos',
      workspaceTitle: 'Tarefas dos dados internos', workspaceSubtitle: 'Controle da equipe para priorização.', workspaceCta: 'Editar dados internos', workspaceTarget: 'internal',
      tasks: [['Definir dono', 'Confirmar responsável interno.'], ['Classificar origem', 'Convite, relacionamento ou prospecção.'], ['Ajustar validade', 'Prazo comercial da proposta.'], ['Atualizar chance', 'Percentual ou nível estimado.']],
      items: [['Responsável', 'Dono interno.'], ['Origem', 'Fonte da oportunidade.'], ['Validade', 'Prazo comercial.'], ['Chance', 'Fechamento esperado.']],
    },
    document: {
      title: 'Cadastro de documento', desc: 'Registro de documentos usados como base para manter rastreabilidade.', primary: 'Adicionar documento',
      workspaceTitle: 'Tarefas de documento', workspaceSubtitle: 'Tudo que precisa ser anexado ou conferido.', workspaceCta: 'Adicionar documento', workspaceTarget: 'document',
      tasks: [['Nomear arquivo', 'Projeto, memorial ou planilha.'], ['Definir status', 'Disponível, pendente ou revisão.'], ['Relacionar uso', 'Base, escopo, cotação ou proposta.'], ['Salvar no painel', 'Documento aparece no apoio lateral.']],
      items: [['Nome', 'Identificação do documento.'], ['Status', 'Disponível ou pendente.'], ['Uso', 'Base para decisão.'], ['Rastreio', 'Justifica decisões futuras.']],
    },
    scope: {
      title: 'Novo item de escopo', desc: 'Cadastro técnico com código automático por disciplina, local e etapa.', primary: 'Salvar item de escopo',
      workspaceTitle: 'Tarefas do item de escopo', workspaceSubtitle: 'Criar ou completar um item técnico.', workspaceCta: 'Cadastrar item', workspaceTarget: 'scope',
      tasks: [['Conferir código', 'Gerado automaticamente.'], ['Nomear item', 'Serviço ou fornecimento.'], ['Escolher local', 'Área cadastrada na base.'], ['Definir etapa', 'Infraestrutura, instalação ou acabamento.']],
      items: [['Código', 'Gerado pela disciplina.'], ['Nome', 'Digitado pela equipe.'], ['Local', 'Vem das áreas.'], ['Etapa', 'Organiza o item.']],
    },
    disciplines: {
      title: 'Disciplinas do escopo', desc: 'Separação por frentes executadas para deixar o orçamento organizado.', primary: 'Selecionar disciplina',
      workspaceTitle: 'Tarefas das disciplinas', workspaceSubtitle: 'Organização por frentes técnicas da Biasi.', workspaceCta: 'Abrir disciplinas', workspaceTarget: 'disciplines',
      tasks: [['Selecionar disciplina', 'Escolher a frente ativa.'], ['Revisar itens', 'Conferir itens cadastrados.'], ['Identificar lacunas', 'Ver o que falta.'], ['Preparar cadastro', 'Criar novos itens.']],
      items: [['Elétrica', 'Transformador, QGBT e luminárias.'], ['Hidráulica', 'Barrilete e redes.'], ['Incêndio', 'Bombas e alarme.'], ['Outras', 'Gás, SPDA, dados e afins.']],
    },
    service: {
      title: 'Detalhamento técnico do item', desc: 'Inclui, exclui, premissas e observações do item selecionado.', primary: 'Salvar detalhe técnico',
      workspaceTitle: 'Tarefas do detalhamento técnico', workspaceSubtitle: 'Ajuste o texto técnico do item selecionado.', workspaceCta: 'Abrir detalhe técnico', workspaceTarget: 'service',
      tasks: [['Completar inclusões', 'O que a Biasi executa.'], ['Completar exclusões', 'O que depende de terceiros.'], ['Fechar premissas', 'Condições para preço e prazo.'], ['Escrever observação', 'Texto claro para proposta.']],
      items: [['Inclui', 'Executado pela Biasi.'], ['Exclui', 'Cliente ou terceiros.'], ['Premissas', 'Condições comerciais.'], ['Observação', 'Texto da proposta.']],
    },
    quote: {
      title: 'Lançamento de cotação', desc: 'Fornecedor, valor, prazo, pagamento e validade para item crítico.', primary: 'Salvar cotação',
      workspaceTitle: 'Tarefas de cotação', workspaceSubtitle: 'Fornecedores, valores, prazos e escolha comercial.', workspaceCta: 'Lançar cotação', workspaceTarget: 'quote',
      tasks: [['Escolher item', 'Item crítico ou serviço.'], ['Selecionar fornecedor', 'Base cadastrada ou novo.'], ['Preencher condição', 'Valor, prazo, pagamento e validade.'], ['Salvar comparativo', 'Cotação aparece no card.']],
      items: [['Item', 'Serviço cotado.'], ['Fornecedor', 'Base real de fornecedores.'], ['Condição', 'Valor e prazo.'], ['Resultado', 'Comparativo visual.']],
    },
    supplier: {
      title: 'Novo fornecedor', desc: 'Cadastro rápido para alimentar a validação de fornecedores.', primary: 'Salvar fornecedor',
      workspaceTitle: 'Tarefas de fornecedor', workspaceSubtitle: 'Cadastro e seleção do fornecedor para cotação.', workspaceCta: 'Cadastrar fornecedor', workspaceTarget: 'supplier',
      tasks: [['Cadastrar nome', 'Fornecedor ainda não listado.'], ['Adicionar contato', 'Telefone ou referência.'], ['Selecionar automaticamente', 'Pronto para cotação.'], ['Voltar para cotar', 'Preencher valor e prazo.']],
      items: [['Nome', 'Fornecedor parceiro.'], ['Contato', 'Referência comercial.'], ['Validação', 'Entra na lista.'], ['Próximo', 'Usar na cotação.']],
    },
    quoteList: {
      title: 'Comparativo de cotações', desc: 'Escolha do fornecedor considerado e motivo da recomendação.', primary: 'Marcar considerado',
      workspaceTitle: 'Tarefas do comparativo', workspaceSubtitle: 'Comparação e decisão de fornecedor considerado.', workspaceCta: 'Comparar fornecedores', workspaceTarget: 'quoteList',
      tasks: [['Comparar preço', 'Diferença entre fornecedores.'], ['Comparar prazo', 'Entrega ou execução.'], ['Conferir pagamento', 'Condição comercial.'], ['Marcar considerado', 'Opção que entra na proposta.']],
      items: [['Considerada', 'Usada na proposta.'], ['Alternativas', 'Mantidas para rastreio.'], ['Critérios', 'Preço, prazo e pagamento.'], ['Decisão', 'Clique no card para alterar.']],
    },
    proposal: {
      title: 'Estratégia da proposta', desc: 'Transforma escopo e cotação em decisão comercial clara.', primary: 'Definir estratégia',
      workspaceTitle: 'Tarefas da estratégia', workspaceSubtitle: 'Decisões comerciais e formato de proposta.', workspaceCta: 'Definir estratégia', workspaceTarget: 'proposal',
      tasks: [['Escolher caminho', 'Econômica, recomendada, premium ou marca exigida.'], ['Justificar decisão', 'Explicar o porquê.'], ['Conferir impacto', 'O que muda e não muda.'], ['Preparar envio', 'Pronta para cliente.']],
      items: [['Econômica', 'Menor custo.'], ['Recomendada', 'Equilíbrio entre prazo e valor.'], ['Premium', 'Maior percepção técnica.'], ['Marca exigida', 'Quando memorial amarra.']],
    },
    history: {
      title: 'Registro de histórico', desc: 'Linha do tempo para decisões, ligações, e-mails e pendências.', primary: 'Salvar histórico',
      workspaceTitle: 'Tarefas do histórico', workspaceSubtitle: 'Registros, decisões e rastreabilidade.', workspaceCta: 'Registrar histórico', workspaceTarget: 'history',
      tasks: [['Definir tipo', 'Ligação, e-mail ou decisão.'], ['Informar responsável', 'Quem registrou.'], ['Marcar impacto', 'Base, escopo, cotação ou proposta.'], ['Salvar descrição', 'O que aconteceu.']],
      items: [['Tipo', 'Natureza do registro.'], ['Responsável', 'Quem assumiu.'], ['Impacto', 'Onde afeta.'], ['Descrição', 'Contexto e próximo passo.']],
    },
  };
  return base[target] || base.summary;
}

function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(value?: number | null) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function dateBr(value?: string | null) {
  if (!value) return 'Sem prazo';
  const clean = value.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
}

function disciplineLabel(id: DisciplinaWorkspace) {
  return disciplineOptions.find((item) => item.id === id)?.label || id;
}

function parseCurrency(value: FormDataEntryValue | null) {
  const raw = String(value || '').replace(/[^0-9,.-]/g, '').replace('.', '').replace(',', '.');
  return Number(raw) || 0;
}

function getFormString(form: FormData, key: string) {
  return String(form.get(key) || '').trim();
}

function hasText(value?: string | null) {
  return Boolean(String(value || '').trim());
}

function documentoUrl(link?: string | null) {
  const raw = String(link || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(www\.|[a-z0-9-]+\.)[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(raw)) return `https://${raw}`;
  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function calcularScoreOrcamento(input: {
  areas: number;
  documentos: number;
  escopo: number;
  cotacoes: number;
  historicos: number;
  pendenciasAbertas: number;
  comercialCompleto: boolean;
  internoCompleto: boolean;
  valorDefinido: boolean;
  estrategiaDefinida: boolean;
  responsavelDefinido: boolean;
}) {
  const scoreBase =
    Math.min(18, input.areas * 6) +
    Math.min(14, input.documentos * 4) +
    Math.min(20, input.escopo * 4) +
    Math.min(14, input.cotacoes * 4) +
    Math.min(10, input.historicos * 2) +
    (input.responsavelDefinido ? 6 : 0) +
    (input.comercialCompleto ? 8 : 0) +
    (input.internoCompleto ? 10 : 0) +
    (input.estrategiaDefinida ? 5 : 0) +
    (input.valorDefinido ? 5 : 0);

  const descontoPendencias = Math.min(16, input.pendenciasAbertas * 3);
  return clamp(Math.round(scoreBase - descontoPendencias), 0, 100);
}

function getLaunchArt(view: ViewKey) {
  const commonStroke = 'currentColor';
  const art: Record<ViewKey, ReactNode> = {
    overview: <svg viewBox="0 0 180 130" fill="none"><rect x="24" y="24" width="132" height="82" rx="22" fill="rgba(255,255,255,.10)"/><path d="M44 76H136" stroke="white" strokeWidth="6" strokeLinecap="round"/><path d="M44 55H104" stroke={commonStroke} strokeWidth="7" strokeLinecap="round"/><circle cx="126" cy="50" r="16" fill="rgba(255,255,255,.18)"/><path d="M118 50l6 6 12-15" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    cadastro: <svg viewBox="0 0 180 130" fill="none"><rect x="34" y="24" width="58" height="82" rx="16" stroke="white" strokeWidth="4"/><rect x="108" y="32" width="42" height="16" rx="8" fill="currentColor"/><rect x="108" y="58" width="52" height="16" rx="8" fill="rgba(255,255,255,.28)"/><rect x="108" y="84" width="34" height="16" rx="8" fill="rgba(255,255,255,.18)"/><path d="M52 58h22M52 76h16" stroke="white" strokeWidth="5" strokeLinecap="round"/></svg>,
    scope: <svg viewBox="0 0 180 130" fill="none"><rect x="18" y="55" width="42" height="24" rx="12" fill="currentColor"/><rect x="70" y="37" width="42" height="24" rx="12" fill="rgba(255,255,255,.26)"/><rect x="120" y="68" width="42" height="24" rx="12" fill="rgba(255,255,255,.18)"/><path d="M60 67C72 67 70 49 70 49M112 49C124 49 120 80 120 80" stroke="white" strokeWidth="3" strokeDasharray="5 6" strokeLinecap="round"/></svg>,
    quotes: <svg viewBox="0 0 180 130" fill="none"><rect x="26" y="32" width="46" height="72" rx="14" stroke="white" strokeWidth="4"/><rect x="82" y="22" width="52" height="82" rx="16" fill="rgba(255,255,255,.12)" stroke="currentColor" strokeWidth="4"/><path d="M96 64l10 10 20-26" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><rect x="142" y="42" width="24" height="44" rx="12" fill="rgba(255,255,255,.20)"/></svg>,
    proposal: <svg viewBox="0 0 180 130" fill="none"><path d="M30 94C62 74 85 70 116 44C126 36 136 28 152 22" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/><path d="M138 22h14v14" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><rect x="28" y="78" width="24" height="26" rx="8" fill="rgba(255,255,255,.22)"/><rect x="70" y="62" width="24" height="42" rx="8" fill="rgba(255,255,255,.16)"/><rect x="112" y="42" width="24" height="62" rx="8" fill="rgba(255,255,255,.24)"/></svg>,
    history: <svg viewBox="0 0 180 130" fill="none"><path d="M44 22v86" stroke="white" strokeWidth="4" strokeDasharray="6 7" strokeLinecap="round"/><circle cx="44" cy="36" r="10" fill="currentColor"/><circle cx="44" cy="66" r="10" fill="rgba(255,255,255,.28)"/><circle cx="44" cy="96" r="10" fill="rgba(255,255,255,.18)"/><rect x="70" y="25" width="76" height="22" rx="11" fill="rgba(255,255,255,.22)"/><rect x="70" y="55" width="62" height="22" rx="11" fill="rgba(255,255,255,.16)"/><rect x="70" y="85" width="86" height="22" rx="11" fill="rgba(255,255,255,.12)"/></svg>,
  };
  return art[view];
}
export function CentralOrcamentoDinamica({
  propostaId,
  orc,
  usuarioNome,
  followUps = [],
  pendencias = [],
  mudancasEtapa = [],
  onRegistrarFollowUp,
  onAdicionarPendencia,
  onResolverPendencia,
}: CentralOrcamentoDinamicaProps) {
  const [dados, setDados] = useState<WorkspaceExtendido>(() => criarWorkspacePadrao() as WorkspaceExtendido);
  const [fornecedores, setFornecedores] = useState<FornecedorSupabase[]>([]);
  const [currentView, setCurrentView] = useState<ViewKey>('overview');
  const [activeTargets, setActiveTargets] = useState<Record<ViewKey, string>>(defaultTargets);
  const [activeDiscipline, setActiveDiscipline] = useState<DisciplinaWorkspace>('eletrica');
  const [selectedEscopoId, setSelectedEscopoId] = useState<string | null>(null);
  const [selectedQuoteItem, setSelectedQuoteItem] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const activeTarget = activeTargets[currentView] || defaultTargets[currentView];
  const launch = launchConfig[currentView];
  const detail = detailFor(activeTarget);
  const cadastro = dados.cadastro || {};

  const areas = dados.areas || [];
  const documentos = dados.documentos || [];
  const escopo = dados.escopo || [];
  const cotacoes = dados.cotacoes || [];
  const historico = dados.historico || [];

  const itensDaDisciplina = useMemo(
    () => escopo.filter((item) => item.disciplina === activeDiscipline),
    [escopo, activeDiscipline]
  );

  const selectedEscopo = useMemo(() => {
    if (!itensDaDisciplina.length) return null;
    return itensDaDisciplina.find((item) => item.id === selectedEscopoId) || itensDaDisciplina[0];
  }, [itensDaDisciplina, selectedEscopoId]);

  const quoteItems = useMemo(() => {
    const names = Array.from(new Set([
      ...escopo.map((item) => item.titulo).filter(Boolean),
      ...cotacoes.map((item) => item.itemTitulo).filter(Boolean),
    ]));
    return names.length ? names : ['Item crítico'];
  }, [escopo, cotacoes]);

  const cotacoesDoItem = useMemo(() => {
    const target = selectedQuoteItem || quoteItems[0] || 'Item crítico';
    return cotacoes.filter((cotacao) => cotacao.itemTitulo === target);
  }, [cotacoes, selectedQuoteItem, quoteItems]);

  const cotacaoConsiderada = useMemo(
    () => cotacoes.find((item) => item.considerada) || cotacoes[0] || null,
    [cotacoes]
  );

  const totalM2 = areas.reduce((sum, area) => sum + (Number(area.metragem) || 0), 0);
  const totalDisciplinas = new Set(areas.flatMap((area) => area.disciplinas || [])).size;
  const pendenciasAbertas = pendencias.filter((item) => item.status !== 'resolvida' && item.status !== 'cancelada');
  const currentStrategy = (dados.estrategia?.tipo || 'recomendada') as StrategyKey;
  const strategy = strategyOptions[currentStrategy] || strategyOptions.recomendada;
  const owner = cadastro.interno?.responsavel || usuarioNome || orc.responsavel || orc.responsavelComercial || 'Equipe Biasi';
  const prioridade = cadastro.interno?.prioridade || orc.urgencia || 'Alta';
  const prazo = cadastro.interno?.prazo || orc.dataProximaAcao || orc.prazoResposta || '';
  const chance = cadastro.interno?.chance || orc.chanceFechamento || 'A definir';
  const historicosTotais = historico.length + followUps.length;
  const valorAtual = useMemo(() => {
    const valorWorkspace = Number(dados.estrategia?.valorSugerido ?? 0);
    if (valorWorkspace > 0) return valorWorkspace;
    const valorProposta = Number(orc.valorProposta ?? 0);
    if (valorProposta > 0) return valorProposta;
    return Number(cotacaoConsiderada?.valor ?? 0);
  }, [dados.estrategia?.valorSugerido, orc.valorProposta, cotacaoConsiderada]);
  const justificativaAtual = dados.estrategia?.justificativa || strategy.desc;
  const comercialCompleto = Boolean(
    hasText(cadastro.comercial?.cliente || orc.clienteNome) &&
    hasText(cadastro.comercial?.obra || orc.titulo) &&
    (hasText(cadastro.comercial?.contato) || hasText(cadastro.comercial?.email))
  );
  const internoCompleto = Boolean(
    hasText(owner) &&
    hasText(prioridade) &&
    hasText(chance) &&
    hasText(prazo)
  );
  const score = useMemo(
    () =>
      calcularScoreOrcamento({
        areas: areas.length,
        documentos: documentos.length,
        escopo: escopo.length,
        cotacoes: cotacoes.length,
        historicos: historicosTotais,
        pendenciasAbertas: pendenciasAbertas.length,
        comercialCompleto,
        internoCompleto,
        valorDefinido: valorAtual > 0,
        estrategiaDefinida: hasText(dados.estrategia?.tipo),
        responsavelDefinido: hasText(owner),
      }),
    [
      areas.length,
      documentos.length,
      escopo.length,
      cotacoes.length,
      historicosTotais,
      pendenciasAbertas.length,
      comercialCompleto,
      internoCompleto,
      valorAtual,
      dados.estrategia?.tipo,
      owner,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!propostaId) return;
      setLoading(true);
      setError(null);
      try {
        const [workspaceData, fornecedoresData] = await Promise.all([
          orcamentoWorkspaceRepository.buscar(propostaId),
          fornecedoresRepository.listarTodos().catch(() => [] as FornecedorSupabase[]),
        ]);
        if (cancelled) return;
        const extended = workspaceData as WorkspaceExtendido;
        if (!extended.documentos.length && orc.linkArquivo) {
          extended.documentos = [{
            id: uid('doc'),
            nome: 'Arquivo do orçamento',
            status: 'Link disponível',
            link: orc.linkArquivo,
            criadoEm: new Date().toISOString(),
          }];
        }
        setDados(extended);
        setFornecedores(fornecedoresData);
        if (extended.etapaAtual && accentByView[extended.etapaAtual]) setCurrentView(extended.etapaAtual);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Não foi possível carregar os dados do orçamento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [propostaId, orc.linkArquivo]);

  useEffect(() => {
    if (!propostaId) return;
    const channel = supabase
      .channel(`orcamento-workspace-live-${propostaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orcamento_workspace', filter: `proposta_id=eq.${propostaId}` },
        (payload) => {
          const row = payload.new as { dados?: unknown } | null;
          if (row?.dados) setDados(row.dados as WorkspaceExtendido);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propostaId]);

  useEffect(() => {
    if (!selectedQuoteItem && quoteItems.length) setSelectedQuoteItem(quoteItems[0]);
    if (selectedQuoteItem && !quoteItems.includes(selectedQuoteItem)) setSelectedQuoteItem(quoteItems[0] || 'Item crítico');
  }, [quoteItems, selectedQuoteItem]);

  useEffect(() => {
    if (selectedEscopo && selectedEscopo.id !== selectedEscopoId) setSelectedEscopoId(selectedEscopo.id);
  }, [selectedEscopo, selectedEscopoId]);

  function flash(message: string) {
    setFeedback(message);
    window.clearTimeout((flash as unknown as { timer?: number }).timer);
    (flash as unknown as { timer?: number }).timer = window.setTimeout(() => setFeedback(''), 2200);
  }

  async function persist(next: WorkspaceExtendido, success = 'Salvo com sucesso') {
    const previous = dados;
    setDados(next);
    setSaving(true);
    try {
      const saved = await orcamentoWorkspaceRepository.salvar(propostaId, next, usuarioNome || owner);
      setDados(saved as WorkspaceExtendido);
      flash(success);
    } catch (err) {
      console.error(err);
      setDados(previous);
      flash('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function persistProposta(payload: Record<string, unknown>) {
    try {
      await propostasRepository.atualizar(propostaId, payload as never);
      return true;
    } catch (err) {
      console.warn('Não foi possível atualizar a proposta principal; dados extras ficaram no workspace.', err);
      flash('Salvo no workspace, mas não consegui refletir isso na proposta principal.');
      return false;
    }
  }

  function updateView(view: ViewKey) {
    setCurrentView(view);
    setActiveTargets((current) => ({ ...current, [view]: current[view] || defaultTargets[view] }));
    void persist({ ...dados, etapaAtual: view }, 'Etapa atualizada');
  }

  function setAction(target: string, jumpToCanonicalView = false) {
    const nextView = jumpToCanonicalView ? (targetView[target] || currentView) : currentView;
    if (nextView !== currentView) setCurrentView(nextView);
    setActiveTargets((current) => ({ ...current, [nextView]: target }));
  }

  function nextScopeCode(discipline: DisciplinaWorkspace) {
    const prefix = disciplineOptions.find((item) => item.id === discipline)?.prefix || '1.9';
    const count = escopo.filter((item) => item.disciplina === discipline).length + 1;
    return `${prefix}.${count}.1`;
  }

  function relatedAreas(discipline = activeDiscipline) {
    const names = areas.filter((area) => area.disciplinas?.includes(discipline)).map((area) => area.nome);
    return names.length ? names : areas.map((area) => area.nome);
  }

  async function handleAreaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nome = getFormString(form, 'nome');
    if (!nome) return flash('Digite o nome da área primeiro');
    const disciplinas = form.getAll('disciplinas').map(String) as DisciplinaWorkspace[];
    const nextArea: AreaWorkspace = {
      id: uid('area'),
      nome,
      metragem: Number(String(form.get('metragem') || '').replace(',', '.')) || 0,
      disciplinas: disciplinas.length ? disciplinas : ['eletrica'],
      criadoEm: new Date().toISOString(),
    };
    const filtered = areas.filter((area) => area.nome.toLowerCase() !== nome.toLowerCase());
    await persist({ ...dados, areas: [...filtered, nextArea] }, 'Área cadastrada com metragem e disciplinas');
    event.currentTarget.reset();
  }

  async function handleDocumentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nome = getFormString(form, 'nome');
    if (!nome) return flash('Digite o nome do documento');
    const nextDoc: DocumentoWorkspace = {
      id: uid('doc'),
      nome,
      status: getFormString(form, 'status') || 'Link disponível',
      link: getFormString(form, 'link'),
      criadoEm: new Date().toISOString(),
    };
    await persist({ ...dados, documentos: [nextDoc, ...documentos] }, 'Documento adicionado');
    event.currentTarget.reset();
  }

  async function handleExcluirDocumento(documentoId: string) {
    const documento = documentos.find((item) => item.id === documentoId);
    const nome = documento?.nome || 'este documento';
    const confirmar = window.confirm(`Excluir "${nome}" dos documentos base?`);
    if (!confirmar) return;

    await persist(
      { ...dados, documentos: documentos.filter((item) => item.id !== documentoId) },
      'Documento excluído'
    );
  }

  async function handleCommercialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const comercial = {
      cliente: getFormString(form, 'cliente'),
      obra: getFormString(form, 'obra'),
      documento: getFormString(form, 'documento'),
      contato: getFormString(form, 'contato'),
      telefone: getFormString(form, 'telefone'),
      email: getFormString(form, 'email'),
    };
    await persist({ ...dados, cadastro: { ...cadastro, comercial } }, 'Dados comerciais salvos');
    await persistProposta({ cliente: comercial.cliente || orc.clienteNome, obra: comercial.obra || orc.titulo });
  }

  async function handleInternalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const interno = {
      responsavel: getFormString(form, 'responsavel'),
      origem: getFormString(form, 'origem'),
      validade: getFormString(form, 'validade'),
      chance: getFormString(form, 'chance'),
      prioridade: getFormString(form, 'prioridade'),
      prazo: getFormString(form, 'prazo'),
    };
    await persist({ ...dados, cadastro: { ...cadastro, interno } }, 'Dados internos salvos');
    await persistProposta({ responsavel: interno.responsavel || orc.responsavel, chance_fechamento: interno.chance, urgencia: interno.prioridade, data_limite: interno.prazo || null });
  }

  async function handleScopeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const titulo = getFormString(form, 'titulo');
    const etapa = getFormString(form, 'etapa');
    if (!titulo || !etapa) return flash('Preencha nome e etapa do item');
    const local = getFormString(form, 'local') || areas[0]?.nome || 'Local a definir';
    const item: ItemEscopoWorkspace = {
      id: uid('escopo'),
      codigo: nextScopeCode(activeDiscipline),
      disciplina: activeDiscipline,
      local,
      titulo,
      quantidade: Number(getFormString(form, 'quantidade')) || 1,
      unidade: getFormString(form, 'unidade') || 'un',
      inclui: getFormString(form, 'inclui') || 'Definir no detalhamento técnico.',
      exclui: getFormString(form, 'exclui') || 'Definir no detalhamento técnico.',
      premissas: getFormString(form, 'premissas') || 'Premissas em revisão.',
      observacao: getFormString(form, 'observacao') || 'Completar observações técnicas após leitura do escopo.',
      criadoEm: new Date().toISOString(),
    };
    await persist({ ...dados, escopo: [...escopo, item] }, 'Item de escopo salvo');
    setSelectedEscopoId(item.id);
    event.currentTarget.reset();
  }

  async function handleServiceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEscopo) return flash('Selecione um item de escopo');
    const form = new FormData(event.currentTarget);
    const updated = escopo.map((item) => item.id === selectedEscopo.id ? {
      ...item,
      inclui: getFormString(form, 'inclui') || item.inclui,
      exclui: getFormString(form, 'exclui') || item.exclui,
      premissas: getFormString(form, 'premissas') || item.premissas,
      observacao: getFormString(form, 'observacao') || item.observacao,
    } : item);
    await persist({ ...dados, escopo: updated }, 'Detalhe técnico salvo');
  }
  async function handleQuoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const itemTitulo = getFormString(form, 'itemTitulo') || selectedQuoteItem || quoteItems[0] || 'Item crítico';
    const fornecedor = getFormString(form, 'fornecedor');
    const valor = parseCurrency(form.get('valor'));
    if (!fornecedor || !valor) return flash('Informe fornecedor e valor da cotação');
    const firstForItem = !cotacoes.some((item) => item.itemTitulo === itemTitulo);
    const cotacao: CotacaoWorkspace = {
      id: uid('cotacao'),
      itemEscopoId: escopo.find((item) => item.titulo === itemTitulo)?.id || null,
      itemTitulo,
      fornecedor,
      valor,
      prazo: getFormString(form, 'prazo') || 'Não informado',
      pagamento: getFormString(form, 'pagamento') || 'Não informado',
      validade: getFormString(form, 'validade') || 'Não informado',
      considerada: firstForItem,
      criadoEm: new Date().toISOString(),
    };
    const semValorDefinido = valorAtual <= 0;
    const next = {
      ...dados,
      cotacoes: [...cotacoes, cotacao],
      estrategia: firstForItem && semValorDefinido
        ? { ...dados.estrategia, valorSugerido: valor }
        : dados.estrategia,
    };
    await persist(
      next,
      firstForItem && semValorDefinido
        ? 'Cotação lançada e valor sugerido atualizado'
        : 'Cotação lançada'
    );
    if (firstForItem && semValorDefinido) {
      await persistProposta({ valor_orcado: valor });
    }
    setSelectedQuoteItem(itemTitulo);
    event.currentTarget.reset();
  }

  async function handleSupplierSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nome = getFormString(form, 'nome');
    if (!nome) return flash('Digite o fornecedor');
    try {
      const created = await fornecedoresRepository.criar({
        nome,
        cnpj: getFormString(form, 'cnpj') || null,
        telefone: getFormString(form, 'contato') || null,
        ativo: true,
      });
      setFornecedores((current) => [...current, created].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      flash('Fornecedor salvo');
      event.currentTarget.reset();
    } catch (err) {
      console.error(err);
      flash('Não foi possível salvar. Tente novamente.');
    }
  }

  async function handleHistorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const descricao = getFormString(form, 'descricao');
    if (!descricao) return flash('Digite a descrição do histórico');
    const item: HistoricoWorkspace = {
      id: uid('hist'),
      tipo: getFormString(form, 'tipo') || 'Registro',
      responsavel: getFormString(form, 'responsavel') || owner,
      impacto: getFormString(form, 'impacto') || 'Registro do fluxo',
      descricao,
      criadoEm: new Date().toISOString(),
    };
    await persist({ ...dados, historico: [item, ...historico] }, 'Histórico salvo');
    event.currentTarget.reset();
  }

  async function setConsideredQuote(cotacaoId: string) {
    const chosen = cotacoes.find((item) => item.id === cotacaoId);
    if (!chosen) return;
    const updated = cotacoes.map((item) => item.itemTitulo === chosen.itemTitulo ? { ...item, considerada: item.id === cotacaoId } : item);
    const semValorDefinido = valorAtual <= 0;
    const next = {
      ...dados,
      cotacoes: updated,
      estrategia: semValorDefinido
        ? { ...dados.estrategia, valorSugerido: chosen.valor }
        : dados.estrategia,
    };
    await persist(
      next,
      semValorDefinido
        ? 'Fornecedor considerado e valor sugerido atualizados'
        : 'Fornecedor considerado atualizado'
    );
    if (semValorDefinido) {
      await persistProposta({ valor_orcado: chosen.valor });
    }
  }

  async function setStrategy(key: StrategyKey) {
    const selected = strategyOptions[key];
    await persist({
      ...dados,
      estrategia: {
        tipo: key,
        justificativa: dados.estrategia?.justificativa || selected.desc,
        valorSugerido: valorAtual,
      },
    }, 'Estratégia comercial atualizada');
    await persistProposta({
      observacao_comercial: dados.estrategia?.justificativa || selected.desc,
      valor_orcado: valorAtual > 0 ? valorAtual : null,
    });
  }

  async function handleProposalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const justificativa = getFormString(form, 'justificativa') || strategy.desc;
    const valorSugerido = parseCurrency(form.get('valorSugerido'));
    const next = {
      ...dados,
      estrategia: {
        tipo: currentStrategy,
        justificativa,
        valorSugerido,
      },
    };

    await persist(next, 'Estratégia e valor da proposta salvos');
    await persistProposta({
      observacao_comercial: justificativa,
      valor_orcado: valorSugerido > 0 ? valorSugerido : null,
    });
  }

  function renderStageActionForm() {
    if (activeTarget === 'area') {
      return <form className="stage-action-card stage-area-form" onSubmit={handleAreaSubmit}>
        <span className="eyebrow">Lançar área</span><h5>Cadastrar área da obra</h5>
        <p>Informe local, metragem e disciplinas. Depois essa área alimenta o escopo.</p>
        <div className="stage-form-grid">
          <label>Nova área / local<input name="nome" placeholder="Ex.: Casa de máquinas" /></label>
          <label>Metragem da área<input name="metragem" type="number" min="0" step="0.01" placeholder="185" /></label>
          <label className="wide">Disciplinas que serão feitas nesta área
            <div className="discipline-check-grid stage-checks">
              {disciplineOptions.slice(0, 6).map((item, index) => <label className="check-card" key={item.id}><input type="checkbox" name="disciplinas" value={item.id} defaultChecked={index === 0} /><span>{item.label}</span></label>)}
            </div>
          </label>
        </div>
        <button className="primary-btn" type="submit" disabled={saving}>Cadastrar área</button>
      </form>;
    }

    if (activeTarget === 'commercial') {
      const comercial = cadastro.comercial || {};
      return <form className="stage-action-card" onSubmit={handleCommercialSubmit}>
        <span className="eyebrow">Dados comerciais</span><h5>Lançar dados do cliente</h5>
        <p>Dados usados no cabeçalho e envio da proposta.</p>
        <div className="stage-form-grid">
          <label>Cliente<input name="cliente" defaultValue={comercial.cliente || orc.clienteNome} /></label>
          <label>Obra<input name="obra" defaultValue={comercial.obra || orc.titulo} /></label>
          <label>CNPJ/CPF<input name="documento" defaultValue={comercial.documento || ''} placeholder="00.000.000/0001-00" /></label>
          <label>Responsável<input name="contato" defaultValue={comercial.contato || ''} placeholder="Contato do cliente" /></label>
          <label>Telefone<input name="telefone" defaultValue={comercial.telefone || ''} placeholder="(11) 99999-9999" /></label>
          <label>E-mail<input name="email" defaultValue={comercial.email || ''} placeholder="cliente@empresa.com.br" /></label>
        </div>
        <button className="primary-btn" type="submit" disabled={saving}>Salvar dados comerciais</button>
      </form>;
    }

    if (activeTarget === 'internal' || activeTarget === 'context') {
      const interno = cadastro.interno || {};
      return <form className="stage-action-card" onSubmit={handleInternalSubmit}>
        <span className="eyebrow">Dados internos</span><h5>Atualizar controle interno</h5>
        <p>Responsabilidade, prioridade, validade, prazo e chance.</p>
        <div className="stage-form-grid">
          <label>Responsável interno<input name="responsavel" defaultValue={interno.responsavel || owner} /></label>
          <label>Origem<input name="origem" defaultValue={interno.origem || 'Convite direto'} /></label>
          <label>Validade<input name="validade" defaultValue={interno.validade || '5 dias'} /></label>
          <label>Chance<input name="chance" defaultValue={interno.chance || chance} /></label>
          <label>Prioridade<select name="prioridade" defaultValue={interno.prioridade || prioridade}><option>Alta</option><option>Média</option><option>Baixa</option></select></label>
          <label>Prazo interno<input name="prazo" type="date" defaultValue={(interno.prazo || prazo || '').slice(0, 10)} /></label>
        </div>
        <button className="primary-btn" type="submit" disabled={saving}>Salvar dados internos</button>
      </form>;
    }

    if (activeTarget === 'document' || activeTarget === 'summaryDocuments') {
      return <form className="stage-action-card" onSubmit={handleDocumentSubmit}>
        <span className="eyebrow">Documento</span><h5>Anexar documento de apoio</h5>
        <p>O documento aparece no painel lateral e fica rastreável.</p>
        <div className="stage-form-grid">
          <label>Nome do documento<input name="nome" placeholder="Memorial elétrico recebido" /></label>
          <label>Status<select name="status"><option>Link disponível</option><option>Pendente</option><option>Em revisão</option></select></label>
          <label className="wide">Link ou observação<input name="link" placeholder="https://... ou observação interna" /></label>
        </div>
        <button className="primary-btn" type="submit" disabled={saving}>Adicionar documento</button>
      </form>;
    }

    if (activeTarget === 'scope') {
      const locais = relatedAreas();
      return <form className="stage-action-card" onSubmit={handleScopeSubmit}>
        <span className="eyebrow">Novo item de escopo</span><h5>Cadastrar item técnico</h5>
        <p>Código automático por disciplina, com local vindo da base da obra.</p>
        <div className="stage-form-grid">
          <label>Código gerado<input value={nextScopeCode(activeDiscipline)} readOnly /></label>
          <label>Nome do item<input name="titulo" placeholder="Cabeamento alimentador" /></label>
          <label>Local<select name="local">{locais.map((area) => <option key={area}>{area}</option>)}</select></label>
          <label>Etapa<input name="etapa" placeholder="Infraestrutura elétrica" /></label>
          <label>Quantidade<input name="quantidade" type="number" min="0" step="0.01" defaultValue="1" /></label>
          <label>Unidade<input name="unidade" defaultValue="un" /></label>
          <label className="wide">Inclui<textarea name="inclui" rows={2} placeholder="O que a Biasi executa" /></label>
          <label className="wide">Exclui<textarea name="exclui" rows={2} placeholder="O que fica fora" /></label>
          <label className="wide">Premissas<textarea name="premissas" rows={2} placeholder="Condições para manter preço e prazo" /></label>
          <label className="wide">Observação<textarea name="observacao" rows={3} placeholder="Texto de apoio para proposta" /></label>
        </div>
        <button className="primary-btn" type="submit" disabled={saving}>Salvar item de escopo</button>
      </form>;
    }

    if (activeTarget === 'disciplines') {
      return <div className="stage-action-card"><span className="eyebrow">Disciplinas</span><h5>Selecionar disciplina de trabalho</h5><p>Troque a disciplina e veja os itens técnicos correspondentes.</p><div className="stage-choice-grid">{disciplineOptions.map((item) => <button type="button" key={item.id} className={`stage-choice ${activeDiscipline === item.id ? 'active' : ''}`} onClick={() => setActiveDiscipline(item.id)}>{item.label}</button>)}</div></div>;
    }

    if (activeTarget === 'service') {
      return <form className="stage-action-card" onSubmit={handleServiceSubmit}>
        <span className="eyebrow">Detalhe técnico</span><h5>Completar premissas do item</h5><p>{selectedEscopo ? `${selectedEscopo.codigo} · ${selectedEscopo.titulo}` : 'Selecione ou cadastre um item de escopo.'}</p>
        <div className="stage-form-grid">
          <label className="wide">Inclui<textarea name="inclui" rows={2} defaultValue={selectedEscopo?.inclui || ''} /></label>
          <label className="wide">Exclui<textarea name="exclui" rows={2} defaultValue={selectedEscopo?.exclui || ''} /></label>
          <label className="wide">Premissas<textarea name="premissas" rows={2} defaultValue={selectedEscopo?.premissas || ''} /></label>
          <label className="wide">Observação técnica<textarea name="observacao" rows={3} defaultValue={selectedEscopo?.observacao || ''} /></label>
        </div>
        <button className="primary-btn" type="submit" disabled={saving || !selectedEscopo}>Salvar detalhe técnico</button>
      </form>;
    }

    if (activeTarget === 'quote') {
      return <form className="stage-action-card" onSubmit={handleQuoteSubmit}>
        <span className="eyebrow">Cotação</span><h5>Lançar cotação crítica</h5><p>Fornecedor, valor, prazo, pagamento e validade.</p>
        <div className="stage-form-grid">
          <label>Item crítico<input name="itemTitulo" list="quote-item-list" defaultValue={selectedQuoteItem || quoteItems[0]} /></label>
          <datalist id="quote-item-list">{quoteItems.map((item) => <option key={item} value={item} />)}</datalist>
          <label>Fornecedor<input name="fornecedor" list="supplier-list" placeholder="Fornecedor" /></label>
          <datalist id="supplier-list">{fornecedores.map((item) => <option key={item.id} value={item.nome} />)}</datalist>
          <label>Valor<input name="valor" placeholder="R$ 87.900" /></label>
          <label>Prazo<input name="prazo" placeholder="15 dias" /></label>
          <label>Pagamento<input name="pagamento" placeholder="30/60 dias" /></label>
          <label>Validade<input name="validade" placeholder="10 dias" /></label>
        </div>
        <button className="primary-btn" type="submit" disabled={saving}>Salvar cotação</button>
      </form>;
    }

    if (activeTarget === 'supplier') {
      return <form className="stage-action-card" onSubmit={handleSupplierSubmit}>
        <span className="eyebrow">Fornecedor</span><h5>Cadastrar fornecedor</h5><p>Depois de salvar, ele fica disponível para a próxima cotação.</p>
        <div className="stage-form-grid"><label>Nome do fornecedor<input name="nome" placeholder="Eletro Comercial Alpha" /></label><label>CNPJ<input name="cnpj" placeholder="00.000.000/0001-00" /></label><label className="wide">Contato<input name="contato" placeholder="telefone ou referência comercial" /></label></div>
        <button className="primary-btn" type="submit">Salvar fornecedor</button>
      </form>;
    }

    if (activeTarget === 'quoteList') {
      return <div className="stage-action-card"><span className="eyebrow">Comparativo</span><h5>Escolher fornecedor considerado</h5><p>Clique em uma opção para marcar como considerada na proposta.</p><div className="stage-choice-grid">{cotacoesDoItem.length ? cotacoesDoItem.map((quote) => <button type="button" key={quote.id} className={`stage-choice ${quote.considerada ? 'active' : ''}`} onClick={() => void setConsideredQuote(quote.id)}>{quote.fornecedor} · {money(quote.valor)}</button>) : <div className="empty-state">Nenhuma cotação cadastrada para este item.</div>}</div></div>;
    }

    if (activeTarget === 'proposal') {
      return <form key={`proposal-${currentStrategy}-${valorAtual}-${justificativaAtual}`} className="stage-action-card" onSubmit={handleProposalSubmit}>
        <span className="eyebrow">Estratégia</span><h5>Definir caminho comercial e valor</h5><p>Escolha a estratégia, ajuste o valor e salve isso na proposta principal.</p>
        <div className="stage-choice-grid">{Object.entries(strategyOptions).map(([key, item]) => <button type="button" key={key} className={`stage-choice ${currentStrategy === key ? 'active' : ''}`} onClick={() => void setStrategy(key as StrategyKey)}>{item.title}</button>)}</div>
        <div className="stage-form-grid">
          <label>Valor da proposta<input name="valorSugerido" defaultValue={valorAtual ? money(valorAtual) : ''} placeholder="R$ 0,00" /></label>
          <label className="wide">Justificativa comercial<textarea name="justificativa" rows={3} defaultValue={justificativaAtual} placeholder="Explique a defesa comercial desta estratégia" /></label>
        </div>
        <div className="doc-actions">
          {cotacaoConsiderada && (
            <span className="badge">
              Cotação considerada: {cotacaoConsiderada.fornecedor} · {money(cotacaoConsiderada.valor)}
            </span>
          )}
        </div>
        <button className="primary-btn" type="submit" disabled={saving}>Salvar estratégia e valor</button>
      </form>;
    }

    return <form className="stage-action-card" onSubmit={handleHistorySubmit}>
      <span className="eyebrow">Histórico</span><h5>Registrar decisão ou próxima ação</h5><p>O registro entra na timeline do orçamento.</p>
      <div className="stage-form-grid"><label>Tipo<select name="tipo"><option>Decisão interna</option><option>Ligação</option><option>E-mail</option><option>Pendência</option><option>Próxima ação</option></select></label><label>Responsável<input name="responsavel" defaultValue={owner} /></label><label>Impacto<input name="impacto" placeholder="Escopo, cotação ou proposta" /></label><label className="wide">Descrição<textarea name="descricao" rows={3} placeholder="O que aconteceu e próximo movimento" /></label></div>
      <button className="primary-btn" type="submit" disabled={saving}>Salvar histórico</button>
    </form>;
  }
  function renderStageWorkspace() {
    const tasks = detail.tasks.length ? detail.tasks : detail.items;
    return <section className="stage-workspace" aria-live="polite">
      <div className="stage-main-card">
        <div><span className="eyebrow">Área de trabalho da ação</span><h4>{detail.workspaceTitle}</h4><p>{detail.workspaceSubtitle}</p></div>
        <div className="stage-actions"><button className="primary-btn" type="button" onClick={() => setAction(detail.workspaceTarget, true)}>Abrir seção completa</button><button className="ghost-btn" type="button" onClick={() => flash('Leitura mantida na ação atual')}>Manter leitura</button></div>
      </div>
      {renderStageActionForm()}
      <div className="stage-task-grid compact">{tasks.map(([label, text], index) => <div className="stage-task-card" key={`${label}-${index}`}><small>{String(index + 1).padStart(2, '0')}</small><strong>{label}</strong><span>{text}</span></div>)}</div>
    </section>;
  }

  function renderOverview() {
    return <div className="view active" id="overview">
      <div className="overview-clean-grid">
        <div className="next-action-card"><span className="eyebrow">Resumo do passo</span><h4>Entenda o orçamento antes de preencher</h4><p>Use a central acima para abrir resumo, contexto, documentos ou histórico inicial. O bloco principal aparece logo abaixo do progresso.</p><div className="next-actions"><button className="primary-btn" onClick={() => setAction('summary')}>Ver resumo</button><button className="ghost-btn" onClick={() => setAction('context')}>Ver contexto</button></div></div>
        <div className="quiet-card"><span className="mini-title">Resumo rápido</span><div className="quiet-list"><div><strong>Base da obra</strong><span>{areas.length ? `${areas.length} áreas cadastradas` : 'Aguardando áreas'}</span></div><div><strong>Escopo</strong><span>{escopo.length ? `${escopo.length} itens técnicos` : 'Nenhum item cadastrado'}</span></div><div><strong>Cotações</strong><span>{cotacoes.length ? `${cotacoes.length} cotações salvas` : 'Entram somente no passo 04'}</span></div><div><strong>Histórico</strong><span>{historicosTotais} registros internos</span></div></div></div>
      </div>
    </div>;
  }

  function renderCadastro() {
    return <div className="view active" id="cadastro">
      <div className="section-head"><div><h4>Base da obra</h4><p>Primeiro a estrutura da obra. Áreas, pavimentos e contexto alimentam todo o restante.</p></div><span className="chip ok">Passo 02</span></div>
      {activeTarget === 'area' && <div className="feature-split action-scope"><div className="panel"><div className="section-head"><div><h4>Cadastro inicial e estrutura da obra</h4><p>Áreas da obra, metragem e disciplinas por local.</p></div><span className="chip ok">Base</span></div><div className="area-management"><div className="area-summary-strip"><div><label>Áreas cadastradas</label><strong>{areas.length}</strong></div><div><label>Área total</label><strong>{totalM2.toLocaleString('pt-BR')} m²</strong></div><div><label>Disciplinas em uso</label><strong>{totalDisciplinas}</strong></div></div><div className="area-cards">{areas.length ? areas.map((area) => <article className="area-card" key={area.id}><div className="area-card-top"><strong>{area.nome}</strong><span>{Number(area.metragem || 0).toLocaleString('pt-BR')} m²</span></div><div className="area-discipline-pills">{area.disciplinas.map((disciplina) => <small key={disciplina}>{disciplineLabel(disciplina)}</small>)}</div></article>) : <div className="empty-state">Nenhuma área cadastrada ainda. Use o formulário acima para começar.</div>}</div></div></div></div>}
      {activeTarget === 'commercial' && <div className="panel action-scope"><h4>Dados comerciais</h4><div className="fields"><div className="field"><strong>Cliente</strong><span>{cadastro.comercial?.cliente || orc.clienteNome}</span></div><div className="field"><strong>Obra</strong><span>{cadastro.comercial?.obra || orc.titulo}</span></div><div className="field"><strong>Responsável</strong><span>{cadastro.comercial?.contato || 'A definir'}</span></div><div className="field"><strong>E-mail</strong><span>{cadastro.comercial?.email || 'A definir'}</span></div></div></div>}
      {activeTarget === 'internal' && <div className="panel action-scope"><h4>Dados internos</h4><div className="fields"><div className="field"><strong>Responsável</strong><span>{owner}</span></div><div className="field"><strong>Prioridade</strong><span>{prioridade}</span></div><div className="field"><strong>Prazo</strong><span>{dateBr(prazo)}</span></div><div className="field"><strong>Chance</strong><span>{chance}</span></div></div></div>}
      {(activeTarget === 'document' || activeTarget === 'summaryDocuments') && renderDocumentosPanel()}
    </div>;
  }

  function renderScope() {
    return <div className="view active" id="scope"><div className="section-head"><div><h4>Escopo técnico</h4><p>Organização por disciplina, itens e estrutura técnica do orçamento.</p></div><span className="chip warn">Passo 03</span></div>
      <div className="discipline-tabs">{disciplineOptions.map((item) => <button key={item.id} className={`discipline-btn ${activeDiscipline === item.id ? 'active' : ''}`} type="button" onClick={() => setActiveDiscipline(item.id)}>{item.label}</button>)}</div>
      <div className="scope-layout"><div className="panel"><h4>Itens da disciplina</h4><p>Escolha um item ou crie um novo sem sair da mesma tela.</p><div className="scope-list">{itensDaDisciplina.length ? itensDaDisciplina.map((item) => <button key={item.id} className={`scope-item ${selectedEscopo?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedEscopoId(item.id)}><strong>{item.codigo} · {item.titulo}</strong><span>{item.local} · {item.unidade} · {item.quantidade}</span></button>) : <div className="empty-state"><strong>Nenhum item cadastrado</strong><br />Use “Novo item” para começar essa disciplina.</div>}</div></div><div className="panel" id="service-detail">{selectedEscopo ? <><div className="section-head"><div><h4>{selectedEscopo.codigo} · {selectedEscopo.titulo}</h4><p>{selectedEscopo.local}</p></div><span className="badge">{disciplineLabel(selectedEscopo.disciplina)}</span></div><div className="split"><div className="mini-card"><span className="mini-title">Inclui</span><p>{selectedEscopo.inclui}</p></div><div className="mini-card"><span className="mini-title">Exclui</span><p>{selectedEscopo.exclui}</p></div><div className="mini-card"><span className="mini-title">Premissas</span><p>{selectedEscopo.premissas}</p></div></div><div className="panel inner-note"><span className="mini-title">Observação para proposta</span><p>{selectedEscopo.observacao}</p></div></> : <div className="empty-state">Cadastre ou selecione um item para ver o detalhe técnico.</div>}</div></div>
    </div>;
  }

  function renderQuotes() {
    return <div className="view active" id="quotes"><div className="section-head"><div><h4>Cotações</h4><p>Fornecedor, valor, prazo, pagamento, validade e escolha considerada.</p></div><span className="chip brand">Passo 04</span></div><div className="quote-item-tabs">{quoteItems.map((item) => <button key={item} type="button" className={`quote-item-btn ${selectedQuoteItem === item ? 'active' : ''}`} onClick={() => setSelectedQuoteItem(item)}>{item}</button>)}</div>{renderCotacoesPanel()}</div>;
  }

  function renderProposal() {
    return <div className="view active" id="proposal"><div className="section-head"><div><h4>Estratégia da proposta</h4><p>Escolha o caminho comercial e explique o que muda e o que permanece.</p></div><span className="chip ok">Passo 05</span></div><div className="compare-grid">{Object.entries(strategyOptions).map(([key, item]) => <button type="button" key={key} className={`option-btn ${currentStrategy === key ? 'active' : ''}`} onClick={() => void setStrategy(key as StrategyKey)}><small>{key.replace('_', ' ')}</small><strong>{item.title}</strong><p>{item.desc}</p></button>)}</div><div className="proposal-detail panel"><h4>{strategy.title}</h4><p>{strategy.desc}</p><div className="proposal-two"><div className="mini-card"><span className="mini-title">O que muda</span><ul>{strategy.changes.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="mini-card"><span className="mini-title">O que não muda</span><ul>{strategy.stays.map((item) => <li key={item}>{item}</li>)}</ul></div></div></div></div>;
  }

  function renderHistory() {
    return <div className="view active" id="history"><div className="section-head"><div><h4>Histórico</h4><p>Linha do tempo de decisões, contatos, pendências e próximos passos.</p></div><span className="chip warn">Rastreabilidade</span></div><div className="history-visual timeline">{historico.length ? historico.map((item) => <div className="timeline-item" key={item.id}><div className="section-head compact"><span className="badge">{item.tipo} · {item.responsavel}</span><span className="badge">{dateBr(item.criadoEm)}</span></div><p>{item.descricao}</p><div className="doc-actions"><span className="badge">{item.impacto}</span></div></div>) : <div className="empty-state">Nenhum histórico salvo pelo workspace ainda.</div>}{followUps.slice(0, 4).map((item) => <div className="timeline-item" key={item.id}><div className="section-head compact"><span className="badge">Follow-up · {item.responsavel}</span><span className="badge">{dateBr(item.data)}</span></div><p>{item.resumo}</p></div>)}</div></div>;
  }

  function renderDocumentoCard(doc: DocumentoWorkspace, compact = false) {
    const url = documentoUrl(doc.link);
    const observacao = doc.link && !url ? doc.link : '';

    return <article className={`doc document-card ${compact ? 'compact-doc' : ''}`} key={doc.id}>
      <div className="doc-card-head">
        <strong>{doc.nome}</strong>
        <button className="icon-danger-btn" type="button" disabled={saving} onClick={() => void handleExcluirDocumento(doc.id)}>Excluir</button>
      </div>
      <span>{doc.status}</span>
      {url && <a className="document-link" href={url} target="_blank" rel="noreferrer">Abrir link</a>}
      {observacao && <small className="document-note">{observacao}</small>}
    </article>;
  }

  function renderDocumentosPanel() {
    return <div className="panel"><div className="section-head"><div><h4>Documentos base</h4><p>Arquivos que sustentam a análise e a proposta.</p></div></div><div className="docs">{documentos.length ? documentos.map((doc) => renderDocumentoCard(doc)) : <div className="empty-state">Nenhum documento cadastrado.</div>}</div></div>;
  }

  function renderCotacoesPanel() {
    return <div className="quote-layout"><div className="panel"><h4>Comparativo do item</h4><p>{selectedQuoteItem || quoteItems[0]}</p><div className="quote-list">{cotacoesDoItem.length ? cotacoesDoItem.map((quote) => <button type="button" className={`quote-card ${quote.considerada ? 'considered' : ''}`} key={quote.id} onClick={() => void setConsideredQuote(quote.id)}><div className="section-head"><div><span className="badge">{quote.considerada ? 'Considerada na proposta' : 'Alternativa'}</span><h4>{quote.fornecedor}</h4><p>{quote.considerada ? 'Cotação usada na defesa comercial.' : 'Mantida para rastreabilidade.'}</p></div></div><div className="quote-meta"><div><label>Valor</label><strong>{money(quote.valor)}</strong></div><div><label>Pagamento</label><strong>{quote.pagamento}</strong></div><div><label>Prazo</label><strong>{quote.prazo}</strong></div><div><label>Validade</label><strong>{quote.validade}</strong></div></div></button>) : <div className="empty-state">Nenhuma cotação cadastrada para este item.</div>}</div></div><div className="panel"><h4>Fornecedores disponíveis</h4><p>Lista real carregada da tabela fornecedores.</p><div className="quiet-list">{fornecedores.slice(0, 8).map((item) => <div key={item.id}><strong>{item.nome}</strong><span>{item.cnpj || item.telefone || 'Sem contato informado'}</span></div>)}{!fornecedores.length && <div><strong>Nenhum fornecedor carregado</strong><span>Use Novo fornecedor ou verifique o Supabase.</span></div>}</div></div></div>;
  }

  function renderActiveView() {
    if (currentView === 'cadastro') return renderCadastro();
    if (currentView === 'scope') return renderScope();
    if (currentView === 'quotes') return renderQuotes();
    if (currentView === 'proposal') return renderProposal();
    if (currentView === 'history') return renderHistory();
    return renderOverview();
  }
  if (loading) {
    return <div className="orcamento-page" data-current-view="overview" style={{ '--step-accent': accentByView.overview } as CSSProperties}><div className="app"><main className="main"><div className="content"><section className="workspace"><div className="workspace-head"><div className="workspace-title"><h3>Carregando orçamento</h3><p>Buscando dados reais no Supabase.</p></div></div><div className="loading-state"><div className="loader" /><strong>Preparando a central do orçamento...</strong></div></section></div></main></div></div>;
  }

  if (error) {
    return <div className="orcamento-page" data-current-view="overview" style={{ '--step-accent': accentByView.overview } as CSSProperties}><div className="app"><main className="main"><div className="content"><section className="workspace"><div className="workspace-head"><div className="workspace-title"><h3>Não foi possível abrir a central</h3><p>{error}</p></div></div><div className="error-state"><strong>Erro ao carregar</strong><span>Atualize a página ou confira a conexão com o Supabase.</span></div></section></div></main></div></div>;
  }

  return <div
    className="orcamento-page"
    data-current-view={currentView}
    data-active-target={activeTarget}
    style={{ '--step-accent': accentByView[currentView] } as CSSProperties}
  >
    <div className="app">
      <main className="main">
        <div className="content">
          <section className="workspace">
            <div className="workspace-head">
              <div className="workspace-title">
                <h3>Orçamento central · {orc.clienteNome || 'Cliente'} · {orc.titulo || 'Obra'}</h3>
                <p>Miolo operacional do orçamento, conectado ao Supabase e sem duplicar o menu lateral principal do app.</p>
              </div>
              <div className="header-actions"><span className="chip brand">#{orc.numero || propostaId}</span><span className="chip ok">{orc.statusLabel || orc.status}</span></div>
            </div>

            <div className="workspace-body">
              <div className={`feedback-chip ${feedback ? 'show' : ''}`}>{feedback}</div>

              <div className="core">
                <div className="ux-steps stepper-v4">
                  {stepper.map((step) => (
                    <button
                      type="button"
                      key={step.id}
                      className={`ux-step ${currentView === step.id ? 'active' : ''}`}
                      style={{ '--step-color': accentByView[step.id] } as CSSProperties}
                      onClick={() => updateView(step.id)}
                    >
                      <small>{step.number}</small>
                      <strong>{step.title}</strong>
                      <span>{step.text}</span>
                    </button>
                  ))}
                </div>

                <div className="launch-panel launch-panel-v4" id="centralLancamentos">
                  <div className="launch-main">
                    <div className="launch-copy"><span className="eyebrow">{launch.eyebrow}</span><h4>{launch.title}</h4><p>{launch.description}</p></div>
                    <div className="launch-art" aria-hidden="true">{getLaunchArt(launch.art)}</div>
                  </div>
                  <div className="launch-grid">
                    {launch.actions.map((action) => <button key={action.target} type="button" className={`launch-btn ${activeTarget === action.target ? 'active' : ''}`} onClick={() => setAction(action.target)}><i>{action.icon}</i><strong>{action.title}</strong><span>{action.text}</span></button>)}
                  </div>
                  <div className="launch-detail-panel">
                    <div className="launch-detail-copy"><span className="eyebrow">Selecionado agora</span><h5>{detail.title}</h5><p>{detail.desc}</p><button className="detail-primary" type="button" onClick={() => setAction(detail.workspaceTarget, true)}>{detail.primary}</button></div>
                    <div className="launch-detail-items">{detail.items.map(([label, text]) => <div className="detail-item" key={label}><strong>{label}</strong><span>{text}</span></div>)}</div>
                  </div>
                </div>

                <div className="progress-card">
                  <div className="progress-top"><div><strong>Progresso do orçamento</strong><span>A tela acompanha a etapa aberta e mostra apenas o próximo trabalho daquele contexto.</span></div><span className="chip brand">{progressMap[currentView]}% concluído</span></div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${progressMap[currentView]}%` }} /></div>
                </div>

                {renderStageWorkspace()}
                {renderActiveView()}
              </div>

              <aside className="side">
                <div className="score-card"><span className="mini-title">Score do orçamento</span><div className="score-number"><strong>{score}</strong><span>/100</span></div><p>Composição dinâmica por base, documentos, escopo, cotações, estratégia, valor e histórico salvos no workspace.</p><div className="score-grid"><div><label>Valor</label><strong>{money(valorAtual)}</strong></div><div><label>Pendências</label><strong>{pendenciasAbertas.length}</strong></div></div></div>

                <div className="panel"><span className="mini-title">Painel de contexto</span><p>Contexto interno do orçamento para decisão rápida.</p><div className="side-kpi"><div><label>Responsável</label><strong>{owner}</strong></div><div><label>Prioridade</label><strong>{prioridade}</strong></div><div><label>Prazo</label><strong>{dateBr(prazo)}</strong></div><div><label>Chance</label><strong>{chance}</strong></div></div></div>

                <div className="panel"><div className="section-head compact"><span className="mini-title">Documentos base</span><button type="button" className="mini-cta" onClick={() => setAction('document', true)}>Novo</button></div><div className="docs compact-list">{documentos.slice(0, 4).map((doc) => renderDocumentoCard(doc, true))}{!documentos.length && <div className="empty-state">Nenhum documento cadastrado.</div>}</div></div>

                <div className="panel"><div className="section-head compact"><span className="mini-title">Pendências críticas</span>{onAdicionarPendencia && <button type="button" className="mini-cta" onClick={onAdicionarPendencia}>Nova</button>}</div><div className="docs compact-list">{pendenciasAbertas.slice(0, 4).map((pendencia) => <div className="doc" key={pendencia.id}><strong>{pendencia.descricao}</strong><span>{pendencia.responsavel || 'Sem responsável'} · {dateBr(pendencia.prazo)}</span>{onResolverPendencia && <div className="doc-actions"><button className="ghost-btn" type="button" onClick={() => onResolverPendencia(pendencia.id)}>Resolver</button></div>}</div>)}{!pendenciasAbertas.length && <div className="empty-state">Sem pendências abertas.</div>}</div></div>

                <div className="panel"><div className="section-head compact"><span className="mini-title">Movimentos recentes</span>{onRegistrarFollowUp && <button type="button" className="mini-cta" onClick={onRegistrarFollowUp}>Follow-up</button>}</div><ul className="tiny-list">{mudancasEtapa.slice(0, 3).map((item) => <li key={item.id}>{item.etapaNova} · {dateBr(item.data)}</li>)}{!mudancasEtapa.length && <li>Nenhuma mudança recente.</li>}</ul></div>
              </aside>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>;
}




