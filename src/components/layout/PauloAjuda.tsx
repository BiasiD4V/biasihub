import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Sparkles, ChevronRight } from 'lucide-react';

/* ====== Dicas contextuais por página ====== */
interface DicaPagina {
  titulo: string;
  descricao: string;
  dicas: { pergunta: string; resposta: string }[];
}

const DICAS: Record<string, DicaPagina> = {
  '/dashboard': {
    titulo: 'Dashboard',
    descricao: 'Visão geral dos seus orçamentos e indicadores.',
    dicas: [
      { pergunta: 'O que são os cards no topo?', resposta: 'Mostram os KPIs principais: total de propostas, valor total orçado, taxa de conversão e ticket médio. Clique em qualquer card para filtrar.' },
      { pergunta: 'Como filtro por período?', resposta: 'Use os filtros de ano no topo da tabela. Você pode combinar com filtro de status e responsável.' },
      { pergunta: 'Posso exportar os dados?', resposta: 'Ainda não temos exportação automática. Mas você pode copiar os dados da tabela.' },
    ],
  },
  '/orcamentos': {
    titulo: 'Orçamentos',
    descricao: 'Lista de todas as propostas e orçamentos.',
    dicas: [
      { pergunta: 'Como abro um orçamento?', resposta: 'Clique na linha do orçamento para abrir a página de detalhes com histórico, follow-ups e dados comerciais.' },
      { pergunta: 'Como edito rápido?', resposta: 'Clique no ícone de lápis (✏️) na linha do orçamento para abrir o modal de edição rápida.' },
      { pergunta: 'O que é o Kanban?', resposta: 'É a visão em colunas do funil de vendas. Acesse pelo botão "Kanban" no topo. Você pode arrastar cards entre etapas.' },
      { pergunta: 'Como mudo a etapa?', resposta: 'Na página de detalhes do orçamento, use os botões de etapa no topo. É obrigatório anexar um arquivo para confirmar a mudança.' },
      { pergunta: 'Onde vejo o histórico?', resposta: 'Na página de detalhes, role até "Histórico de Etapas" e "Timeline de Follow-ups". Cada ação fica registrada com data e responsável.' },
    ],
  },
  '/clientes': {
    titulo: 'Clientes',
    descricao: 'Cadastro de clientes e empresas.',
    dicas: [
      { pergunta: 'Como cadastro um novo cliente?', resposta: 'Clique no botão "Novo Cliente" (azul) no canto superior direito. Preencha nome, CNPJ/CPF, contato e endereço.' },
      { pergunta: 'Posso importar clientes?', resposta: 'Por enquanto o cadastro é manual. Preencha os dados via modal. Campos com * são obrigatórios.' },
      { pergunta: 'Onde acho o CNPJ?', resposta: 'O CNPJ aparece na coluna da tabela. Você pode buscar por CNPJ no campo de busca.' },
    ],
  },
  '/fornecedores': {
    titulo: 'Fornecedores',
    descricao: 'Cadastro de fornecedores e parceiros.',
    dicas: [
      { pergunta: 'Como cadastro um fornecedor?', resposta: 'Clique "Novo Fornecedor" no canto superior. Preencha: nome, CNPJ, endereço, tipo e avaliação.' },
      { pergunta: 'O que é o Código ERP?', resposta: 'É o código do fornecedor no sistema ERP da Biasi. Se tiver, preencha para facilitar a integração.' },
      { pergunta: 'Como filtro por estado?', resposta: 'Use o dropdown "Todos os estados" para filtrar por UF. Combine com a busca por nome/CNPJ.' },
    ],
  },
  '/mao-de-obra': {
    titulo: 'Mão de Obra',
    descricao: 'Tabela de composições de mão de obra por obra.',
    dicas: [
      { pergunta: 'De onde vêm os dados?', resposta: 'Os dados são importados da planilha Excel de composições. Cada linha representa um item de mão de obra com custo e quantidade.' },
      { pergunta: 'Como filtro por obra?', resposta: 'Use o dropdown de obras no topo. Você pode combinar com busca por código ou descrição.' },
      { pergunta: 'O que é o valor unitário?', resposta: 'É o custo por unidade (hora, m², etc.) da mão de obra para aquele serviço.' },
    ],
  },
  '/incluso-excluso': {
    titulo: 'Incluso / Excluso',
    descricao: 'Base de serviços inclusos e exclusos em cada obra.',
    dicas: [
      { pergunta: 'Para que serve esta página?', resposta: 'Aqui você registra quais serviços estão INCLUSOS ou EXCLUSOS em cada obra. Se um serviço que normalmente é feito foi EXCLUSO, você registra o motivo.' },
      { pergunta: 'Como cadastro um item?', resposta: 'Clique "Novo Item". Escolha a obra, descreva o serviço, selecione se é Incluso ou Excluso. Se Excluso, é obrigatório informar o motivo.' },
      { pergunta: 'O que é "Serviço Padrão"?', resposta: 'Indica se aquele serviço é normalmente executado pela Biasi. Se sim e foi excluso, o motivo explica por que nesta obra específica não foi feito.' },
      { pergunta: 'Os cards no topo mostram o quê?', resposta: 'Cada card é uma obra. Mostra quantos serviços estão inclusos (✅) e exclusos (❌). Clique no card para filtrar só aquela obra.' },
    ],
  },
  '/insumos': {
    titulo: 'Insumos',
    descricao: 'Cadastro de insumos e materiais.',
    dicas: [
      { pergunta: 'O que são insumos?', resposta: 'São os materiais, equipamentos e recursos usados nas composições de custo dos orçamentos.' },
      { pergunta: 'Como cadastro?', resposta: 'Esta página será implementada em breve. Os insumos serão vinculados às composições e orçamentos.' },
    ],
  },
  '/composicoes': {
    titulo: 'Composições',
    descricao: 'Composições de custo unitário.',
    dicas: [
      { pergunta: 'O que é uma composição?', resposta: 'É a combinação de insumos (materiais + mão de obra) que formam o custo unitário de um serviço.' },
      { pergunta: 'Como funciona?', resposta: 'Cada composição tem um código, descrição, unidade e lista de insumos com quantidades. O custo total é calculado automaticamente.' },
    ],
  },
  '/aprovacoes': {
    titulo: 'Aprovações',
    descricao: 'Fluxo de aprovação de orçamentos.',
    dicas: [
      { pergunta: 'Quem pode aprovar?', resposta: 'Usuários com perfil de gestor ou admin podem aprovar orçamentos. O fluxo depende do valor e tipo do orçamento.' },
      { pergunta: 'Como acompanho?', resposta: 'Os orçamentos pendentes de aprovação aparecem nesta lista com o status atual e quem está responsável.' },
    ],
  },
  '/relatorios': {
    titulo: 'Relatórios',
    descricao: 'Análises e relatórios gerenciais.',
    dicas: [
      { pergunta: 'Que relatórios temos?', resposta: 'Relatórios de desempenho, conversão do funil, análise por cliente/responsável. Mais relatórios serão adicionados em breve.' },
    ],
  },
  '/configuracoes': {
    titulo: 'Configurações',
    descricao: 'Configurações do sistema e perfil.',
    dicas: [
      { pergunta: 'O que posso configurar?', resposta: 'Dados do perfil, preferências de notificação e configurações gerais do sistema.' },
    ],
  },
};

function getDicasPorRota(pathname: string): DicaPagina {
  // Match exato ou por prefixo (ex: /orcamentos/xxx → /orcamentos)
  if (DICAS[pathname]) return DICAS[pathname];
  const prefix = '/' + pathname.split('/').filter(Boolean)[0];
  if (DICAS[prefix]) return DICAS[prefix];
  return {
    titulo: 'Ajuda',
    descricao: 'Selecione uma página para ver as dicas.',
    dicas: [{ pergunta: 'Preciso de ajuda!', resposta: 'Navegue para qualquer página do sistema e clique aqui novamente. As dicas mudam conforme a página que você está!' }],
  };
}

export function PauloAjuda() {
  const [aberto, setAberto] = useState(false);
  const [expandida, setExpandida] = useState<number | null>(null);
  const [animando, setAnimando] = useState(false);
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  const dicas = getDicasPorRota(location.pathname);

  // Fechar ao mudar de página
  useEffect(() => { setAberto(false); setExpandida(null); }, [location.pathname]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [aberto]);

  // Animação do botão
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimando(true);
      setTimeout(() => setAnimando(false), 1000);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Painel de ajuda */}
      {aberto && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-[380px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[9999] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4"
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-sm">Paulo AJUDA</h3>
              <p className="text-blue-100 text-xs">{dicas.titulo} — {dicas.descricao}</p>
            </div>
            <button
              onClick={() => setAberto(false)}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mensagem de boas-vindas */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-start gap-2">
              <div className="bg-blue-100 rounded-full p-1 mt-0.5 shrink-0">
                <Sparkles size={12} className="text-blue-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Olá! Sou o <strong>Paulo</strong>, seu assistente. Clique nas perguntas abaixo para saber como usar esta página. 👇
              </p>
            </div>
          </div>

          {/* Lista de perguntas */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {dicas.dicas.map((d, idx) => (
              <div key={idx}>
                {/* Pergunta */}
                <button
                  onClick={() => setExpandida(expandida === idx ? null : idx)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 ${
                    expandida === idx
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ChevronRight
                    size={14}
                    className={`shrink-0 transition-transform ${expandida === idx ? 'rotate-90 text-blue-500' : 'text-slate-400'}`}
                  />
                  <span>{d.pergunta}</span>
                </button>

                {/* Resposta */}
                {expandida === idx && (
                  <div
                    className="ml-6 mt-1.5 mb-1 px-4 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                    style={{ animation: 'fadeIn 0.2s ease-out' }}
                  >
                    <p className="text-sm text-slate-700 leading-relaxed">{d.resposta}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] text-slate-400 text-center">
              As dicas mudam conforme a página que você está. 💡
            </p>
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(!aberto)}
        className={`fixed bottom-6 right-6 z-[9999] group flex items-center gap-2 rounded-full shadow-lg transition-all duration-300 ${
          aberto
            ? 'bg-slate-700 hover:bg-slate-800 px-4 py-3'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-5 py-3.5'
        } ${animando && !aberto ? 'scale-110' : 'scale-100'}`}
        title="Paulo AJUDA — Clique para dicas!"
      >
        {aberto ? (
          <X size={20} className="text-white" />
        ) : (
          <>
            <MessageCircle size={20} className="text-white" />
            <span className="text-white text-sm font-bold tracking-wide">Paulo AJUDA</span>
            <Sparkles size={14} className="text-yellow-300" />
          </>
        )}
      </button>

      {/* CSS animações */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
