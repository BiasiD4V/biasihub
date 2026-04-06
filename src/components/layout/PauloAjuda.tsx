import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Sparkles, Send, Bot } from 'lucide-react';
import { supabase } from '../../infrastructure/supabase/client';

interface DicaPagina {
  titulo: string;
  descricao: string;
  dicas: { pergunta: string; resposta: string }[];
}

interface MensagemPaulo {
  id: string;
  role: 'assistant' | 'user';
  texto: string;
}

const DICAS: Record<string, DicaPagina> = {
  '/dashboard': {
    titulo: 'Dashboard BI',
    descricao: 'Visao geral dos indicadores e performance comercial.',
    dicas: [
      { pergunta: 'O que mostram os cards?', resposta: 'Mostram KPIs principais como total de propostas, valor total e taxa de fechamento.' },
      { pergunta: 'Como filtro os dados?', resposta: 'Use os filtros de ano, status, disciplina e responsavel para refinar os indicadores.' },
    ],
  },
  '/orcamentos': {
    titulo: 'Orcamentos',
    descricao: 'Lista principal de propostas e funil comercial.',
    dicas: [
      { pergunta: 'Como criar um novo orcamento?', resposta: 'Clique em Novo Orcamento no topo da tela e preencha os dados obrigatorios.' },
      { pergunta: 'Como editar rapido?', resposta: 'Use o icone de lapis na linha da proposta para abrir o modal de edicao.' },
      { pergunta: 'Como abrir o detalhe?', resposta: 'Clique na linha da proposta para abrir historico, follow-ups e dados comerciais.' },
    ],
  },
  '/orcamentos/kanban': {
    titulo: 'Kanban de Orcamentos',
    descricao: 'Visao por etapas do funil comercial.',
    dicas: [
      { pergunta: 'Como interpretar as colunas?', resposta: 'Cada coluna representa uma etapa do funil e os cards sao as propostas.' },
      { pergunta: 'Por que um card mudou de coluna?', resposta: 'Mudancas de etapa feitas no detalhe da proposta refletem aqui automaticamente.' },
    ],
  },
  '/operacao/orcamentos': {
    titulo: 'Operacao - Orcamentos',
    descricao: 'Tela operacional de propostas (visao alternativa).',
    dicas: [
      { pergunta: 'Esta tela e diferente da aba Orcamentos?', resposta: 'Sim. Ela atende fluxo operacional especifico, mas usa os mesmos dados base.' },
    ],
  },
  '/clientes': {
    titulo: 'Clientes',
    descricao: 'Cadastro completo de clientes.',
    dicas: [
      { pergunta: 'Onde cadastro cliente novo?', resposta: 'No botao Novo Cliente no topo da pagina.' },
      { pergunta: 'Cliente criado aqui aparece em Configuracoes?', resposta: 'Sim. As duas telas compartilham a mesma base de dados de clientes.' },
    ],
  },
  '/fornecedores': {
    titulo: 'Fornecedores',
    descricao: 'Cadastro e manutencao de fornecedores.',
    dicas: [
      { pergunta: 'O que e importante preencher?', resposta: 'Nome, CNPJ, contato e classificacao para facilitar cotacoes.' },
    ],
  },
  '/insumos': {
    titulo: 'Insumos',
    descricao: 'Catalogo de materiais e itens de custo.',
    dicas: [
      { pergunta: 'Como os insumos sao usados?', resposta: 'Eles compoem custos nas composicoes e no orcamento final.' },
    ],
  },
  '/composicoes': {
    titulo: 'Composicoes',
    descricao: 'Composicoes unitarias de servicos.',
    dicas: [
      { pergunta: 'O que e uma composicao?', resposta: 'Conjunto de insumos e mao de obra que define o custo de um servico.' },
    ],
  },
  '/templates': {
    titulo: 'Templates',
    descricao: 'Modelos reutilizaveis de estrutura e dados.',
    dicas: [
      { pergunta: 'Quando usar templates?', resposta: 'Quando quiser acelerar cadastros repetitivos com padroes predefinidos.' },
    ],
  },
  '/mao-de-obra': {
    titulo: 'Mao de Obra',
    descricao: 'Gestao de tipos e custos de mao de obra.',
    dicas: [
      { pergunta: 'Como filtro os registros?', resposta: 'Use busca e filtros da tela para encontrar rapidamente o item desejado.' },
    ],
  },
  '/incluso-excluso': {
    titulo: 'Incluso / Excluso',
    descricao: 'Fechamento de escopo e limites de responsabilidade.',
    dicas: [
      { pergunta: 'O que registrar aqui?', resposta: 'O que entra, o que nao entra, premissas, pendencias e responsabilidade por item.' },
      { pergunta: 'As listas do formulario vem de onde?', resposta: 'Disciplina e responsavel podem vir dos cadastros de Configuracoes.' },
    ],
  },
  '/aprovacoes': {
    titulo: 'Aprovacoes',
    descricao: 'Fluxo de aprovacao de propostas.',
    dicas: [
      { pergunta: 'Como saber o status atual?', resposta: 'A lista mostra o estado de aprovacao e quem esta responsavel no momento.' },
    ],
  },
  '/relatorios': {
    titulo: 'Relatorios',
    descricao: 'Analises gerenciais e acompanhamento de resultados.',
    dicas: [
      { pergunta: 'Posso combinar filtros?', resposta: 'Sim. Combine periodo, status, disciplina e responsavel para analises mais precisas.' },
    ],
  },
  '/configuracoes': {
    titulo: 'Configuracoes e Dicionarios',
    descricao: 'Cadastros mestres usados no sistema.',
    dicas: [
      { pergunta: 'Alterar aqui impacta outras telas?', resposta: 'Sim. Os cadastros ativos alimentam filtros e formularios do sistema.' },
      { pergunta: 'Clientes daqui e da tela Clientes sao os mesmos?', resposta: 'Sim, e a mesma base de dados.' },
    ],
  },
  '/meus-dispositivos': {
    titulo: 'Meus Dispositivos',
    descricao: 'Controle de sessoes e dispositivos autenticados.',
    dicas: [
      { pergunta: 'Quando remover dispositivo?', resposta: 'Quando perder acesso ao aparelho ou encerrar sessoes antigas.' },
    ],
  },
  '/membros': {
    titulo: 'Membros',
    descricao: 'Gestao de usuarios e permissoes.',
    dicas: [
      { pergunta: 'Quem pode alterar membros?', resposta: 'Normalmente perfis administrativos com permissao de gestao de usuarios.' },
    ],
  },
};

function getDicasPorRota(pathname: string): DicaPagina {
  if (DICAS[pathname]) return DICAS[pathname];

  const rotasOrdenadas = Object.keys(DICAS).sort((a, b) => b.length - a.length);
  const rotaPrefixo = rotasOrdenadas.find((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
  if (rotaPrefixo) return DICAS[rotaPrefixo];

  return {
    titulo: 'Ajuda',
    descricao: 'Dicas de uso desta tela.',
    dicas: [
      {
        pergunta: 'Como usar esta pagina?',
        resposta: 'Use os filtros e acoes da propria tela. Se precisar, abra uma pagina principal pelo menu para ver dicas mais detalhadas.',
      },
    ],
  };
}


function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function respostaLocal(pergunta: string, dicas: DicaPagina): string {
  const q = normalizarTexto(pergunta);

  const perguntaBotao =
    q.includes('botao') ||
    q.includes('o que faz') ||
    q.includes('oque faz') ||
    q.includes('pra que serve') ||
    q.includes('serve pra que');

  const precisaPassoAPasso =
    q.includes('passo a passo') ||
    q.includes('passo-a-passo') ||
    q.includes('nao sei') ||
    q.includes('nao consigo') ||
    q.includes('me ajuda') ||
    q.includes('como faz');

  const passosBase = [
    'Defina em uma frase o que voce quer fazer nesta tela.',
    'Use a acao principal da pagina (novo, editar, filtrar ou aprovar).',
    'Preencha os campos essenciais e salve.',
    'Valide o resultado na lista/tabela e reabra o item para confirmar.',
  ];

  const passosFromDicas =
    dicas.dicas.length > 0
      ? [
          'Comece pela acao principal desta pagina.',
          dicas.dicas[0].resposta,
          dicas.dicas[1]?.resposta || 'Finalize validando o registro salvo na lista.',
        ]
      : passosBase;

  if (dicas.titulo === 'Dashboard BI') {
    if (q.includes('total de proposta') || q.includes('total propostas') || q.includes('total de propostas')) {
      return 'Total de propostas e a quantidade de propostas no recorte atual dos filtros do dashboard.';
    }

    if (q.includes('fechada') || q.includes('fechadas') || q.includes('fehcada')) {
      return 'Fechada significa proposta ganha (status FECHADO). Quando aparece no card, e a contagem de propostas ganhas no recorte atual.';
    }

    if (
      q.includes('o que eu estou vendo') ||
      q.includes('oque eu estou vendo') ||
      q.includes('o que estou vendo') ||
      q.includes('oque estou vendo')
    ) {
      return 'Voce esta vendo um painel comercial com KPIs no topo, graficos de distribuicao/evolucao no meio e filtros para recortar os dados por ano, status, responsavel, disciplina e cliente.';
    }

    if (
      q.includes('o que significa cada numero') ||
      q.includes('oque significa cada numero') ||
      q.includes('cada numero')
    ) {
      return 'Resumo rapido: Total = quantidade de propostas; Fechadas = status FECHADO; Valor Total = soma dos orcamentos; Valor Fechado = soma do que fechou; Taxa de Conversao = fechadas/total; Ticket Medio = valor total dividido pela quantidade de propostas.';
    }
  }

  if (
    q.includes('o que eu estou vendo') ||
    q.includes('oque eu estou vendo') ||
    q.includes('o que estou vendo') ||
    q.includes('oque estou vendo')
  ) {
    return `Voce esta em ${dicas.titulo}. ${dicas.descricao} Se quiser, eu te passo agora um passo a passo para o que voce precisa fazer aqui.`;
  }

  if (
    q.includes('o que e essa pagina') ||
    q.includes('oque e essa pagina') ||
    q.includes('o que e essa tela') ||
    q.includes('oque e essa tela')
  ) {
    return `Essa pagina e ${dicas.titulo}. ${dicas.descricao} Quer que eu te guie no passo a passo da tarefa que voce quer fazer agora?`;
  }

  if (q.includes('backend') || q.includes('api') || q.includes('endpoint')) {
    return 'No backend deste projeto, parte dos fluxos usa endpoints da pasta /api (membros, membros-update, upload e paulo-chat) e parte usa Supabase direto pelos repositorios do frontend.';
  }

  if (perguntaBotao) {
    return `Consigo sim. Na tela ${dicas.titulo}, me fala o nome exato do botao (ex.: salvar, novo, editar) que eu te explico o que ele faz e o passo a passo.`;
  }

  if (dicas.titulo === 'Mao de Obra') {
    if (q.includes('atividade') && (q.includes('o que e') || q.includes('oque e') || q.includes('aquela'))) {
      return 'Atividade e o servico que voce esta compondo. Ela agrupa os profissionais e os coeficientes (Hh/UN) para formar o calculo de mao de obra.';
    }

    if ((q.includes('profissional') || q.includes('profissionais')) && (q.includes('o que e') || q.includes('oque e'))) {
      return 'Profissionais sao as funcoes de mao de obra usadas na atividade (ex.: oficial, ajudante). Cada uma contribui no total de HH da composicao.';
    }
  }

  if (precisaPassoAPasso) {
    return [
      `Fechou, vamos em passo a passo em ${dicas.titulo}:`,
      ...passosFromDicas.map((p, idx) => `${idx + 1}. ${p}`),
      'Se travar em algum passo, me fala o numero que eu detalho com voce.',
    ].join('\n');
  }

  if (q.includes('oi') || q.includes('ola') || q.includes('bom dia') || q.includes('boa tarde')) {
    return `Oi! Tamo junto em ${dicas.titulo}. Me fala o que voce quer fazer agora que eu te guio sem formalidade.`;
  }

  if (q.includes('importante preencher') || q.includes('campos importantes') || q.includes('obrigatorio')) {
    return `Boa pergunta. Nesta tela eu priorizaria: ${dicas.dicas[0]?.resposta || 'identificacao do registro, contato e classificacao'}. Se quiser, eu te passo a ordem ideal de preenchimento.`;
  }

  if (q.includes('erro') || q.includes('bug') || q.includes('nao funciona')) {
    return `Bora resolver isso juntos em ${dicas.titulo}. Me conta em uma frase: o que voce clicou, o que esperava e o que aconteceu.`;
  }

  if (q.includes('filtro') || q.includes('buscar') || q.includes('pesquisa')) {
    return `Boa. Faz um teste rapido: limpa os filtros, aplica um por vez e ve quando o resultado muda. Assim a gente acha o ponto que esta limitando em ${dicas.titulo}.`;
  }

  if (q.includes('como') || q.includes('onde') || q.includes('passo')) {
    return dicas.dicas[0]?.resposta || `Vamos por partes em ${dicas.titulo}: define a acao principal, preenche o essencial, salva e valida na lista.`;
  }

  if (q.includes('salvar') || q.includes('gravar') || q.includes('supabase')) {
    return 'Perfeito. Para validar salvamento: confirma mensagem de sucesso, atualiza a lista e abre o registro novamente para conferir os campos principais.';
  }

  return `Entendi. Me fala seu objetivo nessa tela (${dicas.titulo}) em uma frase e eu te passo o melhor caminho, sem enrolacao.`;
}

function mensagemBoasVindas(dicas: DicaPagina): MensagemPaulo {
  return {
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    texto: `Oi! Eu sou o Paulo e te ajudo aqui em ${dicas.titulo}. Pode falar comigo do seu jeito que eu te acompanho no passo a passo.`,
  };
}

interface PauloAjudaProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function PauloAjuda({ forceOpen, onClose }: PauloAjudaProps = {}) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemPaulo[]>([]);
  const [entrada, setEntrada] = useState('');
  const [carregandoResposta, setCarregandoResposta] = useState(false);
  const [sugestoes, setSugestoes] = useState<string[]>([]);

  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const mensagensFimRef = useRef<HTMLDivElement>(null);

  const dicas = useMemo(() => getDicasPorRota(location.pathname), [location.pathname]);

  // Open from sidebar button
  useEffect(() => {
    if (forceOpen) {
      setAberto(true);
    }
  }, [forceOpen]);

  // Notify parent when closed
  const fechar = () => {
    setAberto(false);
    onClose?.();
  };

  useEffect(() => {
    const nextDicas = getDicasPorRota(location.pathname);
    setMensagens([mensagemBoasVindas(nextDicas)]);
    setSugestoes(nextDicas.dicas.slice(0, 4).map((d) => d.pergunta));
  }, [location.pathname]);

  useEffect(() => {
    if (!aberto) return;
    mensagensFimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregandoResposta, aberto]);

  async function enviarPergunta(textoPergunta: string) {
    const pergunta = textoPergunta.trim();
    if (!pergunta || carregandoResposta) return;

    const mensagemUsuario: MensagemPaulo = {
      id: `user-${Date.now()}`,
      role: 'user',
      texto: pergunta,
    };

    const historicoApi = [...mensagens.slice(-6), mensagemUsuario].map((m) => ({
      role: m.role,
      content: m.texto,
    }));

    setMensagens((prev) => [...prev, mensagemUsuario]);
    setEntrada('');
    setCarregandoResposta(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch('/api/paulo-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pergunta,
          pathname: location.pathname,
          historico: historicoApi,
        }),
      });

      if (!response.ok) {
        const erro = await response.text();
        throw new Error(erro || 'Falha ao consultar o Paulo IA.');
      }

      const payload = await response.json() as { resposta?: string; sugestoes?: string[] };
      const textoResposta = payload.resposta?.trim() || respostaLocal(pergunta, dicas);

      setMensagens((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          texto: textoResposta,
        },
      ]);

      if (Array.isArray(payload.sugestoes) && payload.sugestoes.length > 0) {
        setSugestoes(payload.sugestoes.slice(0, 4));
      }
    } catch {
      const fallback = respostaLocal(pergunta, dicas);
      setMensagens((prev) => [
        ...prev,
        {
          id: `assistant-fallback-${Date.now()}`,
          role: 'assistant',
          texto: `${fallback}`,
        },
      ]);
    } finally {
      setCarregandoResposta(false);
    }
  }

  if (!aberto) return null;

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] h-[100dvh] sm:h-[620px] bg-white sm:rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.18)] border border-slate-200/60 flex flex-col overflow-hidden">
      {/* ═══════ Header ═══════ */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-4 flex items-center gap-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="bg-white/15 rounded-xl p-2.5 backdrop-blur-sm relative">
          <Bot size={18} className="text-white" />
        </div>
        <div className="flex-1 relative">
          <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
            Paulo
            <span className="text-[9px] font-medium bg-white/20 px-1.5 py-0.5 rounded-full">IA</span>
          </h3>
          <p className="text-blue-100/80 text-[11px] truncate">{dicas.titulo}</p>
        </div>
        <button
          onClick={fechar}
          className="text-white/60 hover:text-white hover:bg-white/10 transition-all p-1.5 rounded-lg relative"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      {/* ═══════ Suggestions ═══════ */}
      <div className="px-4 py-3 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-start gap-2 mb-2.5">
          <div className="bg-blue-100 rounded-full p-1 mt-0.5 shrink-0">
            <Sparkles size={10} className="text-blue-600" />
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Pergunte sobre <span className="font-medium text-slate-700">{dicas.titulo}</span> ou escolha uma sugestão:
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sugestoes.map((s) => (
            <button
              key={s}
              onClick={() => enviarPergunta(s)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all shadow-sm"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ Messages ═══════ */}
      <div ref={panelRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {mensagens.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow-sm">
                <Bot size={12} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-100 shadow-sm'
              }`}
            >
              <span className="whitespace-pre-wrap">{msg.texto}</span>
            </div>
          </div>
        ))}
        {carregandoResposta && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow-sm">
              <Bot size={12} className="text-white" />
            </div>
            <div className="rounded-2xl px-3.5 py-3 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={mensagensFimRef} />
      </div>

      {/* ═══════ Input ═══════ */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          <input
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void enviarPergunta(entrada);
              }
            }}
            placeholder="Pergunte ao Paulo..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-400"
            disabled={carregandoResposta}
          />
          <button
            onClick={() => void enviarPergunta(entrada)}
            disabled={carregandoResposta || !entrada.trim()}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-md hover:shadow-blue-500/25 transition-all active:scale-95 flex items-center justify-center"
            title="Enviar"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
