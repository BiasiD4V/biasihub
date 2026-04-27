import { useState, useEffect } from 'react';
import { PlusCircle, Search, Truck, MapPin, Phone, Eye, Pencil } from 'lucide-react';
import { fornecedoresRepository, type FornecedorSupabase } from '../infrastructure/supabase/fornecedoresRepository';
import { ModalFornecedor } from '../components/fornecedores/ModalFornecedor';

export function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<FornecedorSupabase[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroUf, setFiltroUf] = useState('todos');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const porPagina = 50;

  const [modalAberto, setModalAberto] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<FornecedorSupabase | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState(false);

  const recarregarFornecedores = async () => {
    setCarregando(true);
    try {
      const dados = await fornecedoresRepository.listarTodos();
      setFornecedores(dados);
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalNovo = () => {
    setFornecedorEditando(null);
    setModoVisualizacao(false);
    setModalAberto(true);
  };

  const abrirModalEditar = (forn: FornecedorSupabase) => {
    setFornecedorEditando(forn);
    setModoVisualizacao(false);
    setModalAberto(true);
  };

  const abrirModalVisualizar = (forn: FornecedorSupabase) => {
    setFornecedorEditando(forn);
    setModoVisualizacao(true);
    setModalAberto(true);
  };

  const onSalvarFornecedor = async (fornecedor: Omit<FornecedorSupabase, 'id' | 'criado_em' | 'atualizado_em'>) => {
    try {
      if (fornecedorEditando) {
        await fornecedoresRepository.atualizar(fornecedorEditando.id, fornecedor);
      } else {
        await fornecedoresRepository.criar(fornecedor);
      }
      await recarregarFornecedores();
      setModalAberto(false);
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err);
      throw err;
    }
  };


  useEffect(() => {
    recarregarFornecedores();
  }, []);

  const ufs = [...new Set(fornecedores.map(f => f.uf).filter(Boolean))].sort();

  const filtrados = fornecedores.filter((f) => {
    const q = busca.toLowerCase();
    const matchBusca = !q ||
      f.nome.toLowerCase().includes(q) ||
      (f.cnpj ?? '').toLowerCase().includes(q) ||
      (f.municipio ?? '').toLowerCase().includes(q);
    const matchUf = filtroUf === 'todos' || f.uf === filtroUf;
    return matchBusca && matchUf;
  });

  const totalPaginas = Math.ceil(filtrados.length / porPagina);
  const paginados = filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  useEffect(() => { setPaginaAtual(1); }, [busca, filtroUf]);

  const selectCls = 'border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700';

  return (
    <div className="flex flex-col h-full">
      <ModalFornecedor
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={onSalvarFornecedor}
        fornecedorEditando={fornecedorEditando}
        modoVisualizacao={modoVisualizacao}
      />
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
          <p className="text-sm text-slate-500 mt-1">Cadastro e gestão de fornecedores e parceiros.</p>
        </div>
        <button
          onClick={abrirModalNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <PlusCircle size={16} />
          Novo Fornecedor
        </button>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CNPJ ou cidade..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select value={filtroUf} onChange={(e) => setFiltroUf(e.target.value)} className={selectCls}>
            <option value="todos">Todos os estados</option>
            {ufs.map((uf) => (
              <option key={uf} value={uf!}>{uf}</option>
            ))}
          </select>

          <span className="text-xs text-slate-400 ml-auto">
            {filtrados.length} fornecedor{filtrados.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {carregando ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20">
            <div className="bg-slate-100 rounded-2xl p-5 mb-4">
              <Truck size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">Nenhum fornecedor encontrado</p>
            <p className="text-sm text-slate-400">Tente ajustar os filtros de busca.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">CNPJ</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cidade / UF</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Telefone</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Avaliação</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginados.map((f, idx) => (
                      <tr
                        key={f.id}
                        className={`hover:bg-slate-50 transition-colors ${idx !== paginados.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <td className="px-4 py-3 max-w-[280px]">
                          <p className="font-medium text-slate-800 truncate">{f.nome}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs text-slate-500">{f.cnpj || <span className="text-slate-300">—</span>}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-slate-600">{f.tipo || <span className="text-slate-300">—</span>}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            {f.municipio || f.uf ? (
                              <>
                                <MapPin size={12} className="text-slate-400" />
                                {[f.municipio, f.uf].filter(Boolean).join(' / ')}
                              </>
                            ) : <span className="text-slate-300">—</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            {f.telefone ? (
                              <>
                                <Phone size={12} className="text-slate-400" />
                                {f.telefone}
                              </>
                            ) : <span className="text-slate-300">—</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-slate-600">{f.avaliacao || <span className="text-slate-300">—</span>}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              title="Visualizar"
                              onClick={() => abrirModalVisualizar(f)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              title="Editar"
                              onClick={() => abrirModalEditar(f)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <Pencil size={15} />
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
                <span className="text-sm text-slate-500">
                  Página {paginaAtual} de {totalPaginas}
                </span>
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
