import { useEffect, useState } from 'react';
import { Package, Wrench, MessageSquare, ChevronRight, Clock, CheckCircle, Loader2, History, X, Sparkles, Check, Trash2, Ban } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

// -- Definição do fluxo dinâmico ----------------------------------------------

type Categoria = 'materiais' | 'ferramentas' | 'outro';
type Prioridade = 'baixa' | 'normal' | 'alta' | 'urgente';

interface Subcategoria {
  id: string;
  label: string;
  descricao: string;
}

const CATEGORIAS: { id: Categoria; label: string; icone: typeof Package; descricao: string }[] = [
  {
    id: 'materiais',
    label: 'Materiais',
    icone: Package,
    descricao: 'Separação, frete, busca em obra',
  },
  {
    id: 'ferramentas',
    label: 'Ferramentas',
    icone: Wrench,
    descricao: 'Empréstimo, reparo ou devolução',
  },
  {
    id: 'outro',
    label: 'Outro assunto',
    icone: MessageSquare,
    descricao: 'Qualquer outra demanda',
  },
];

const SUBCATEGORIAS: Record<Categoria, Subcategoria[]> = {
  materiais: [
    { id: 'separar_amanha',  label: 'Separar materiais para amanhã',       descricao: 'Lista de materiais a separar antes das 8h' },
    { id: 'buscar_obra',     label: 'Buscar materiais em obra',             descricao: 'Coletar material que está em uma obra' },
    { id: 'frete_obra',      label: 'Solicitar frete de material para obra', descricao: 'Envio de carga com veículo da empresa' },
    { id: 'compra',          label: 'Solicitar compra de material',          descricao: 'Item em falta, precisa ser adquirido' },
  ],
  ferramentas: [
    { id: 'emprestimo',  label: 'Empréstimo de ferramenta',  descricao: 'Retirar ferramenta do almoxarifado' },
    { id: 'devolucao',   label: 'Devolução de ferramenta',   descricao: 'Entregar ferramenta de volta' },
    { id: 'manutencao',  label: 'Ferramenta para manutenção', descricao: 'Enviar para reparo ou calibração' },
  ],
  outro: [
    { id: 'livre', label: 'Descreva sua demanda', descricao: 'Descreva no campo de texto abaixo' },
  ],
};

// -- Tipos Supabase ------------------------------------------------------------

interface SolicitacaoRow {
  id: string;
  texto: string;
  categoria: string;
  subcategoria: string | null;
  urgente: boolean;
  prioridade: Prioridade;
  prazo_sugerido: string | null;
  mensagem_ia: string | null;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  criado_em: string;
  solicitante?: { nome: string };
}

const STATUS_CONFIG: Record<string, { label: string; cor: string; corBg: string }> = {
  pendente:     { label: 'Pendente',     cor: 'text-amber-700',  corBg: 'bg-amber-100'  },
  em_andamento: { label: 'Em andamento', cor: 'text-blue-700',   corBg: 'bg-blue-100'   },
  concluida:    { label: 'Concluída',    cor: 'text-green-700',  corBg: 'bg-green-100'  },
  cancelada:    { label: 'Cancelada',    cor: 'text-slate-500',  corBg: 'bg-slate-100'  },
};

const PRIORIDADE_CONFIG: Record<Prioridade, { label: string; cor: string }> = {
  baixa:   { label: 'Baixa',   cor: 'text-slate-500' },
  normal:  { label: 'Normal',  cor: 'text-blue-600'  },
  alta:    { label: 'Alta',    cor: 'text-orange-600' },
  urgente: { label: 'Urgente', cor: 'text-red-600'   },
};

// -- Componente principal ------------------------------------------------------

export function Solicitacoes() {
  const { usuario } = useAuth();

  // Estado do formulário
  const [etapa, setEtapa] = useState<'form' | 'processando' | 'resultado'>('form');
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [subcategoria, setSubcategoria] = useState<string | null>(null);

  // Resultado do envio
  const [resultado, setResultado] = useState<{
    prioridade: Prioridade;
    disponivel_amanha: boolean;
    prazo_sugerido: string;
    mensagem: string;
  } | null>(null);

  // Histórico
  const [historico, setHistorico] = useState<SolicitacaoRow[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'nova' | 'historico'>('nova');

  const isGestor = usuario?.papel === 'gestor' || usuario?.papel === 'admin' || usuario?.papel === 'dono';

  // -- Carrega histórico ------------------------------------------------------

  async function carregarHistorico() {
    setLoadingHistorico(true);
    try {
      const query = supabase
        .from('solicitacoes_almoxarifado')
        .select('*, solicitante:usuarios!solicitacoes_almoxarifado_solicitante_id_fkey(nome)')
        .order('criado_em', { ascending: false })
        .limit(50);

      // Gestor vê tudo; outros só veem as próprias
      if (!isGestor) {
        query.eq('solicitante_id', usuario!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHistorico((data || []) as unknown as SolicitacaoRow[]);
    } catch (err) {
      console.error('[Solicitações] erro ao carregar histórico:', err);
      setHistorico([]);
    } finally {
      setLoadingHistorico(false);
    }
  }

  useEffect(() => {
    if (usuario) carregarHistorico();
  }, [usuario]);

  // -- Envio da solicitação ---------------------------------------------------

  async function enviar() {
    if (!texto.trim() || !categoria) return;
    setEtapa('processando');

    try {
      await supabase.from('solicitacoes_almoxarifado').insert({
        solicitante_id: usuario!.id,
        texto: texto.trim(),
        categoria,
        subcategoria,
        prioridade: 'normal',
        prazo_sugerido: null,
        mensagem_ia: null,
        status: 'pendente',
      });

      setResultado({
        prioridade: 'normal',
        disponivel_amanha: true,
        prazo_sugerido: 'A definir',
        mensagem: 'Sua solicitação foi registrada com sucesso e será analisada pela equipe do almoxarifado.',
      });
      setEtapa('resultado');
      void carregarHistorico();
    } catch (err) {
      console.error('Erro ao enviar solicitação:', err);
      setEtapa('form');
    }
  }

  function novaSolicitacao() {
    setTexto('');
    setCategoria(null);
    setSubcategoria(null);
    setResultado(null);
    setEtapa('form');
  }

  async function aceitarSolicitacao(id: string) {
    await supabase.from('solicitacoes_almoxarifado').update({ status: 'em_andamento' }).eq('id', id);
    carregarHistorico();
  }

  async function negarSolicitacao(id: string) {
    await supabase.from('solicitacoes_almoxarifado').update({ status: 'cancelada' }).eq('id', id);
    carregarHistorico();
  }

  async function apagarSolicitacao(id: string) {
    if (!window.confirm('Apagar esta solicitação permanentemente?')) return;
    await supabase.from('solicitacoes_almoxarifado').delete().eq('id', id);
    carregarHistorico();
  }

  // -- Render -----------------------------------------------------------------

  const subcatsAtivas = categoria ? SUBCATEGORIAS[categoria] : [];

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles size={22} className="text-blue-600" />
          Solicitações
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Abra demandas para o almoxarifado.
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(['nova', 'historico'] as const).map(aba => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(aba)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              abaAtiva === aba
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {aba === 'nova' ? '+ Nova Solicitação' : 'Histórico'}
          </button>
        ))}
      </div>

      {/* Aba: Nova Solicitação */}
      {abaAtiva === 'nova' && (
        <div className="space-y-5">

          {/* Etapa: Formulário */}
          {etapa === 'form' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">

              {/* Campo de texto */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Escreva sua solicitação
                </label>
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  rows={3}
                  placeholder="Ex: Preciso separar 50 sacos de cimento para a Obra Residencial São Paulo até amanhã de manhã..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Categoria</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {CATEGORIAS.map(cat => {
                    const Icon = cat.icone;
                    const selecionada = categoria === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => { setCategoria(cat.id); setSubcategoria(null); }}
                        className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                          selecionada
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={20} className={selecionada ? 'text-blue-600' : 'text-slate-500'} />
                        <div>
                          <p className={`text-sm font-medium ${selecionada ? 'text-blue-700' : 'text-slate-700'}`}>
                            {cat.label}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{cat.descricao}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subcategoria (fluxo dinâmico) */}
              {categoria && subcatsAtivas.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    O que você precisa?
                  </label>
                  <div className="space-y-2">
                    {subcatsAtivas.map(sub => {
                      const selecionada = subcategoria === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setSubcategoria(sub.id)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                            selecionada
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p className={`text-sm font-medium ${selecionada ? 'text-blue-700' : 'text-slate-700'}`}>
                              {sub.label}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{sub.descricao}</p>
                          </div>
                          <ChevronRight size={16} className={selecionada ? 'text-blue-500' : 'text-slate-300'} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botão enviar */}
              <button
                onClick={enviar}
                disabled={!texto.trim() || !categoria}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm transition-colors"
              >
                <Sparkles size={16} />
                Enviar Solicitação
              </button>
            </div>
          )}

          {/* Etapa: Processando */}
          {etapa === 'processando' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 size={28} className="text-blue-600 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Registrando sua solicitação...</h3>
              <p className="text-sm text-slate-500">
                Aguarde enquanto sua solicitação é registrada
              </p>
            </div>
          )}

          {/* Etapa: Resultado */}
          {etapa === 'resultado' && resultado && (
            <div className="space-y-4">
              {/* Card de resultado */}
              <div className={`bg-white rounded-2xl border shadow-sm p-6 ${
                resultado.disponivel_amanha ? 'border-green-200' : 'border-amber-200'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    resultado.disponivel_amanha ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    {resultado.disponivel_amanha
                      ? <CheckCircle size={20} className="text-green-600" />
                      : <Clock size={20} className="text-amber-600" />
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      Solicitação registrada!
                    </p>
                    <p className="text-xs text-slate-500">
                      Processado com sucesso
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed mb-4">{resultado.mensagem}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Prioridade</p>
                    <p className={`text-sm font-bold ${PRIORIDADE_CONFIG[resultado.prioridade].cor}`}>
                      {PRIORIDADE_CONFIG[resultado.prioridade].label}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Prazo Sugerido</p>
                    <p className="text-sm font-bold text-slate-700">{resultado.prazo_sugerido}</p>
                  </div>
                </div>
              </div>

              <button
                  onClick={novaSolicitacao}
                className="w-full py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Nova Solicitação
              </button>
            </div>
          )}
        </div>
      )}

      {/* Aba: Histórico */}
      {abaAtiva === 'historico' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingHistorico ? (
            <div className="p-12 text-center text-slate-400 text-sm">Carregando...</div>
          ) : historico.length === 0 ? (
            <div className="p-12 text-center">
              <History size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Nenhuma solicitação ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historico.map(sol => {
                const statusCfg = STATUS_CONFIG[sol.status];
                const priCfg = PRIORIDADE_CONFIG[sol.prioridade];
                const solicitante = sol.solicitante as unknown as { nome: string };
                return (
                  <div key={sol.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.corBg} ${statusCfg.cor}`}>
                            {statusCfg.label}
                          </span>
                          <span className={`text-[11px] font-medium ${priCfg.cor}`}>
                            {priCfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium truncate">{sol.texto}</p>
                        {sol.mensagem_ia && (
                          <p className="text-xs text-slate-500 mt-0.5 flex items-start gap-1">
                            <Sparkles size={10} className="text-blue-400 flex-shrink-0 mt-0.5" />
                            {sol.mensagem_ia}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {isGestor && solicitante?.nome && (
                            <p className="text-[11px] text-slate-400">{solicitante.nome}</p>
                          )}
                          <p className="text-[11px] text-slate-400">
                            {new Date(sol.criado_em).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                          {sol.prazo_sugerido && (
                            <p className="text-[11px] text-slate-400">
                              Prazo: {sol.prazo_sugerido}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {sol.status === 'pendente' && isGestor && (
                          <button
                            onClick={() => aceitarSolicitacao(sol.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="Aceitar solicitação"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {sol.status === 'pendente' && isGestor && (
                          <button
                            onClick={() => negarSolicitacao(sol.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Negar solicitação"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                        {sol.status === 'pendente' && !isGestor && (
                          <button
                            onClick={() => negarSolicitacao(sol.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Cancelar solicitação"
                          >
                            <X size={14} />
                          </button>
                        )}
                        {isGestor && (
                          <button
                            onClick={() => apagarSolicitacao(sol.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Apagar solicitação"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

