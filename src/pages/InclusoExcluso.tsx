import { useState, useEffect } from 'react';
import { PlusCircle, Search, Eye, Pencil, Trash2, TableProperties } from 'lucide-react';
import {
  inclusoExclusoRepository,
  type InclusoExclusoSupabase,
  type SituacaoEscopo,
  DISCIPLINAS_ESCOPO,
  SITUACOES_ESCOPO,
} from '../infrastructure/supabase/inclusoExclusoRepository';
import { ModalInclusoExcluso } from '../components/incluso-excluso/ModalInclusoExcluso';
import { useCadastrosMestres } from '../context/CadastrosMestresContext';

const SITUACAO_CLS: Record<SituacaoEscopo, string> = {
  'Fechado':               'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Fechado com premissa':  'bg-sky-50 text-sky-700 border-sky-200',
  'Pendente':              'bg-amber-50 text-amber-700 border-amber-200',
  'Precisa validar':       'bg-red-50 text-red-700 border-red-200',
};
const RISCO_CLS: Record<string, string> = {
  'Baixo':  'bg-slate-100 text-slate-500',
  'Médio':  'bg-orange-50 text-orange-600',
  'Alto':   'bg-red-50 text-red-600 font-semibold',
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {label}
    </span>
  );
}

function Cell({ text }: { text: string | null | undefined }) {
  if (!text) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span className="text-slate-700 text-xs leading-snug line-clamp-2" title={text}>
      {text}
    </span>
  );
}

export function InclusoExcluso() {
  const { disciplinas } = useCadastrosMestres();
  const [itens, setItens] = useState<InclusoExclusoSupabase[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroObra, setFiltroObra] = useState('todos');
  const [filtroDisc, setFiltroDisc] = useState<string | 'todos'>('todos');
  const [filtroSituacao, setFiltroSituacao] = useState<SituacaoEscopo | 'todos'>('todos');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const porPagina = 50;

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<InclusoExclusoSupabase | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState(false);

  const recarregar = async () => {
    setCarregando(true);
    try {
      const dados = await inclusoExclusoRepository.listarTodos();
      setItens(dados);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { recarregar(); }, []);

  const obras = [...new Set(itens.map(i => i.obra).filter(Boolean))].sort();
  const disciplinasDisponiveis = disciplinas
    .filter((d) => d.ativa)
    .map((d) => d.nome)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const opcoesDisciplina = disciplinasDisponiveis.length > 0 ? disciplinasDisponiveis : DISCIPLINAS_ESCOPO;

  const filtrados = itens.filter((i) => {
    const q = busca.toLowerCase();
    const matchBusca = !q
      || i.obra.toLowerCase().includes(q)
      || i.item_servico.toLowerCase().includes(q)
      || (i.disciplina ?? '').toLowerCase().includes(q)
      || (i.area_ambiente ?? '').toLowerCase().includes(q)
      || (i.o_que_biasi_faz ?? '').toLowerCase().includes(q);
    const matchObra = filtroObra === 'todos' || i.obra === filtroObra;
    const matchDisc = filtroDisc === 'todos' || i.disciplina === filtroDisc;
    const matchSit = filtroSituacao === 'todos' || i.situacao === filtroSituacao;
    return matchBusca && matchObra && matchDisc && matchSit;
  });

  const totalPaginas = Math.ceil(filtrados.length / porPagina);
  const paginados = filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);
  useEffect(() => { setPaginaAtual(1); }, [busca, filtroObra, filtroDisc, filtroSituacao]);

  const abrirNovo = () => { setEditando(null); setModoVisualizacao(false); setModalAberto(true); };
  const abrirEditar = (item: InclusoExclusoSupabase) => { setEditando(item); setModoVisualizacao(false); setModalAberto(true); };
  const abrirVisualizar = (item: InclusoExclusoSupabase) => { setEditando(item); setModoVisualizacao(true); setModalAberto(true); };

  const onSalvar = async (item: Omit<InclusoExclusoSupabase, 'id' | 'criado_em' | 'atualizado_em'>) => {
    if (editando) {
      await inclusoExclusoRepository.atualizar(editando.id, item);
    } else {
      await inclusoExclusoRepository.criar(item);
    }
    await recarregar();
    setModalAberto(false);
  };

  const onExcluir = async (item: InclusoExclusoSupabase) => {
    if (!confirm(`Excluir "${item.item_servico}" da obra "${item.obra}"?`)) return;
    await inclusoExclusoRepository.excluir(item.id);
    await recarregar();
  };

  // Stats painel
  const total = itens.length;
  const fechados = itens.filter(i => i.situacao === 'Fechado').length;
  const fechadosPremissa = itens.filter(i => i.situacao === 'Fechado com premissa').length;
  const pendentes = itens.filter(i => i.situacao === 'Pendente').length;
  const precisaValidar = itens.filter(i => i.situacao === 'Precisa validar').length;
  const riscoAlto = itens.filter(i => i.risco === 'Alto').length;

  const selectCls = 'border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700';

  return (
    <div className="flex flex-col h-full">
      <ModalInclusoExcluso
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={onSalvar}
        editando={editando}
        modoVisualizacao={modoVisualizacao}
        obrasExistentes={obras}
        disciplinasDisponiveis={opcoesDisciplina}
      />

      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fechamento de Escopo</h1>
          <p className="text-sm text-slate-500 mt-1">Tabela interna de limite de responsabilidade por obra.</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <PlusCircle size={16} />
          Novo Item
        </button>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        {/* Painel rápido */}
        {total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total',              value: total,             cls: 'border-slate-200 bg-white text-slate-600' },
              { label: 'Fechados',           value: fechados,          cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
              { label: 'Com premissa',       value: fechadosPremissa,  cls: 'border-sky-200 bg-sky-50 text-sky-700' },
              { label: 'Pendentes',          value: pendentes,         cls: 'border-amber-200 bg-amber-50 text-amber-700' },
              { label: 'Precisa validar',    value: precisaValidar,    cls: 'border-red-200 bg-red-50 text-red-600' },
              { label: 'Risco alto',         value: riscoAlto,         cls: 'border-orange-200 bg-orange-50 text-orange-600' },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-xl border px-4 py-3 ${cls}`}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs mt-0.5 opacity-80">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por obra, item, disciplina..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} className={selectCls}>
            <option value="todos">Todas as obras</option>
            {obras.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filtroDisc} onChange={(e) => setFiltroDisc(e.target.value as string | 'todos')} className={selectCls}>
            <option value="todos">Todas as disciplinas</option>
            {opcoesDisciplina.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value as SituacaoEscopo | 'todos')} className={selectCls}>
            <option value="todos">Todas as situações</option>
            {SITUACOES_ESCOPO.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-xs text-slate-400 ml-auto">{filtrados.length} iten{filtrados.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Tabela */}
        {carregando ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20">
            <div className="bg-slate-100 rounded-2xl p-5 mb-4"><TableProperties size={32} className="text-slate-400" /></div>
            <p className="text-slate-600 font-medium mb-1">Nenhum item encontrado</p>
            <p className="text-sm text-slate-400">Cadastre o fechamento de escopo da sua obra.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ minWidth: 1400 }}>
                  <thead>
                    {/* Grupo header */}
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-500 uppercase tracking-wide">
                      <th colSpan={4} className="px-3 py-2 text-left text-xs font-semibold border-r border-slate-200">
                        Entendimento da obra
                      </th>
                      <th colSpan={7} className="px-3 py-2 text-left text-xs font-semibold border-r border-slate-200">
                        Limite da responsabilidade da Biasi
                      </th>
                      <th colSpan={5} className="px-3 py-2 text-left text-xs font-semibold border-r border-slate-200">
                        Controle comercial
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" />
                    </tr>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Obra</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Disciplina</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Área / Ambiente</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap border-r border-slate-200">Item / Serviço</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Antes da Biasi</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">O que a Biasi faz</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Onde faz</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Até onde vai</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Como entrega</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Quem entra depois</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap border-r border-slate-200">O que não entra</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Base usada</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Situação</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Risco</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Responsável</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap border-r border-slate-200">Premissa / Pendência</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginados.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/70 transition-colors ${idx !== paginados.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <td className="px-3 py-2.5 max-w-[140px]">
                          <span className="font-medium text-slate-800 text-xs line-clamp-2" title={item.obra}>{item.obra}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {item.disciplina ? (
                            <span className="text-xs text-slate-600">{item.disciplina}</span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2.5 max-w-[120px]"><Cell text={item.area_ambiente} /></td>
                        <td className="px-3 py-2.5 max-w-[160px] border-r border-slate-100">
                          <span className="font-medium text-slate-800 text-xs line-clamp-2" title={item.item_servico}>{item.item_servico}</span>
                        </td>
                        <td className="px-3 py-2.5 max-w-[130px]"><Cell text={item.antes_da_biasi} /></td>
                        <td className="px-3 py-2.5 max-w-[160px]"><Cell text={item.o_que_biasi_faz} /></td>
                        <td className="px-3 py-2.5 max-w-[120px]"><Cell text={item.onde_faz} /></td>
                        <td className="px-3 py-2.5 max-w-[120px]"><Cell text={item.ate_onde_vai} /></td>
                        <td className="px-3 py-2.5 max-w-[120px]"><Cell text={item.como_entrega} /></td>
                        <td className="px-3 py-2.5 max-w-[120px]"><Cell text={item.quem_entra_depois} /></td>
                        <td className="px-3 py-2.5 max-w-[130px] border-r border-slate-100"><Cell text={item.o_que_nao_entra} /></td>
                        <td className="px-3 py-2.5 max-w-[110px]"><Cell text={item.base_usada} /></td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Badge label={item.situacao} cls={SITUACAO_CLS[item.situacao]} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${RISCO_CLS[item.risco]}`}>{item.risco}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Cell text={item.responsavel} />
                        </td>
                        <td className="px-3 py-2.5 max-w-[140px] border-r border-slate-100">
                          {item.premissa && (
                            <p className="text-xs text-sky-600 line-clamp-1" title={item.premissa}>P: {item.premissa}</p>
                          )}
                          {item.pendencia && (
                            <p className="text-xs text-amber-600 line-clamp-1" title={item.pendencia}>⚠ {item.pendencia}</p>
                          )}
                          {!item.premissa && !item.pendencia && <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button title="Visualizar" onClick={() => abrirVisualizar(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Eye size={14} />
                            </button>
                            <button title="Editar" onClick={() => abrirEditar(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button title="Excluir" onClick={() => onExcluir(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-500">Página {paginaAtual} de {totalPaginas}</span>
                <button
                  onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
