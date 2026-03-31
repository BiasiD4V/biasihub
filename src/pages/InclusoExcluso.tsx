import { useState, useEffect } from 'react';
import { PlusCircle, Search, Eye, Pencil, Trash2, CheckCircle, XCircle, ListChecks } from 'lucide-react';
import { inclusoExclusoRepository, type InclusoExclusoSupabase } from '../infrastructure/supabase/inclusoExclusoRepository';
import { ModalInclusoExcluso } from '../components/incluso-excluso/ModalInclusoExcluso';

export function InclusoExcluso() {
  const [itens, setItens] = useState<InclusoExclusoSupabase[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'incluso' | 'excluso'>('todos');
  const [filtroObra, setFiltroObra] = useState('todos');
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

  const obras = [...new Set(itens.map(i => i.obra))].sort();

  const filtrados = itens.filter((i) => {
    const q = busca.toLowerCase();
    const matchBusca = !q || i.obra.toLowerCase().includes(q) || i.servico.toLowerCase().includes(q) || (i.motivo ?? '').toLowerCase().includes(q);
    const matchTipo = filtroTipo === 'todos' || i.tipo === filtroTipo;
    const matchObra = filtroObra === 'todos' || i.obra === filtroObra;
    return matchBusca && matchTipo && matchObra;
  });

  const totalPaginas = Math.ceil(filtrados.length / porPagina);
  const paginados = filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  useEffect(() => { setPaginaAtual(1); }, [busca, filtroTipo, filtroObra]);

  const abrirModalNovo = () => { setEditando(null); setModoVisualizacao(false); setModalAberto(true); };
  const abrirModalEditar = (item: InclusoExclusoSupabase) => { setEditando(item); setModoVisualizacao(false); setModalAberto(true); };
  const abrirModalVisualizar = (item: InclusoExclusoSupabase) => { setEditando(item); setModoVisualizacao(true); setModalAberto(true); };

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
    if (!confirm(`Excluir "${item.servico}" da obra "${item.obra}"?`)) return;
    await inclusoExclusoRepository.excluir(item.id);
    await recarregar();
  };

  // Resumo por obra
  const resumoPorObra = obras.map(obra => {
    const itensObra = itens.filter(i => i.obra === obra);
    return {
      obra,
      inclusos: itensObra.filter(i => i.tipo === 'incluso').length,
      exclusos: itensObra.filter(i => i.tipo === 'excluso').length,
    };
  });

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
      />

      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Incluso & Excluso</h1>
          <p className="text-sm text-slate-500 mt-1">Base de serviços inclusos e exclusos por obra — com justificativa para cada exclusão.</p>
        </div>
        <button
          onClick={abrirModalNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <PlusCircle size={16} />
          Novo Item
        </button>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        {/* Cards resumo por obra */}
        {resumoPorObra.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
            {resumoPorObra.map((r) => (
              <button
                key={r.obra}
                onClick={() => setFiltroObra(filtroObra === r.obra ? 'todos' : r.obra)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  filtroObra === r.obra
                    ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-semibold text-slate-700 truncate" title={r.obra}>{r.obra}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle size={12} /> {r.inclusos}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <XCircle size={12} /> {r.exclusos}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por obra, serviço ou motivo..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as 'todos' | 'incluso' | 'excluso')} className={selectCls}>
            <option value="todos">Todos os tipos</option>
            <option value="incluso">Inclusos</option>
            <option value="excluso">Exclusos</option>
          </select>

          <select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} className={selectCls}>
            <option value="todos">Todas as obras</option>
            {obras.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>

          <span className="text-xs text-slate-400 ml-auto">
            {filtrados.length} ite{filtrados.length !== 1 ? 'ns' : 'm'}
          </span>
        </div>

        {/* Tabela */}
        {carregando ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20">
            <div className="bg-slate-100 rounded-2xl p-5 mb-4">
              <ListChecks size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">Nenhum item encontrado</p>
            <p className="text-sm text-slate-400">Cadastre serviços inclusos e exclusos para suas obras.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Obra</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Serviço</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Padrão</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Motivo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginados.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition-colors ${idx !== paginados.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="font-medium text-slate-800 truncate" title={item.obra}>{item.obra}</p>
                        </td>
                        <td className="px-4 py-3 max-w-[250px]">
                          <p className="text-slate-700 truncate" title={item.servico}>{item.servico}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.tipo === 'incluso' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle size={12} /> Incluso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <XCircle size={12} /> Excluso
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs ${item.padrao ? 'text-blue-600' : 'text-slate-400'}`}>
                            {item.padrao ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[250px]">
                          <p className="text-xs text-slate-500 truncate" title={item.motivo ?? ''}>
                            {item.motivo || <span className="text-slate-300">—</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button title="Visualizar" onClick={() => abrirModalVisualizar(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Eye size={15} />
                            </button>
                            <button title="Editar" onClick={() => abrirModalEditar(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                              <Pencil size={15} />
                            </button>
                            <button title="Excluir" onClick={() => onExcluir(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={15} />
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
