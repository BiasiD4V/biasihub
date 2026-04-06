import { useState } from 'react';
import { PlusCircle, Search, Users, Eye, Pencil, Power } from 'lucide-react';
import { useClientes } from '../context/ClientesContext';
import { StatusBadgeNovo } from '../components/ui/StatusBadgeNovo';
import { ModalCliente } from '../components/clientes/ModalCliente';
import type { Cliente } from '../domain/entities/Cliente';
import { SEGMENTOS_CLIENTE } from '../domain/value-objects/SegmentoCliente';

export function Clientes() {
  const { clientes } = useClientes();

  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'PF' | 'PJ'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [filtroSegmento, setFiltroSegmento] = useState('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState(false);

  const abrirNovoCliente = () => {
    setClienteEditando(null);
    setModoVisualizacao(false);
    setModalAberto(true);
  };

  const abrirVisualizacaoCliente = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setModoVisualizacao(true);
    setModalAberto(true);
  };

  const abrirEdicaoCliente = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setModoVisualizacao(false);
    setModalAberto(true);
  };


  const filtrados = clientes.filter((c) => {
    const q = busca.toLowerCase();
    const matchBusca =
      !q ||
      c.razaoSocial.toLowerCase().includes(q) ||
      (c.nomeFantasia ?? '').toLowerCase().includes(q) ||
      (c.nomeInterno ?? '').toLowerCase().includes(q) ||
      c.cnpjCpf.toLowerCase().includes(q);
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo;
    const matchStatus =
      filtroStatus === 'todos' ||
      (filtroStatus === 'ativo' ? c.ativo : !c.ativo);
    const matchSegmento =
      filtroSegmento === 'todos' || c.segmento === filtroSegmento;
    return matchBusca && matchTipo && matchStatus && matchSegmento;
  });

  const selectCls =
    'border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700';

  return (
    <div className="flex flex-col h-full">
      <ModalCliente
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        clienteEditando={clienteEditando ?? undefined}
        modoVisualizacao={modoVisualizacao}
      />
      {/* Cabeçalho */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastro e gestão de clientes do sistema.
          </p>
        </div>
        <button
          onClick={abrirNovoCliente}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <PlusCircle size={16} />
          Novo Cliente
        </button>
      </div>

      {/* Corpo */}
      <div className="flex-1 p-8 overflow-auto">
        {/* Barra de filtros */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Busca */}
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por razão social, fantasia ou CNPJ..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tipo */}
          <select
            value={filtroTipo}
            onChange={(e) =>
              setFiltroTipo(e.target.value as 'todos' | 'PF' | 'PJ')
            }
            className={selectCls}
          >
            <option value="todos">Todos os tipos</option>
            <option value="PJ">Pessoa Jurídica</option>
            <option value="PF">Pessoa Física</option>
          </select>

          {/* Status */}
          <select
            value={filtroStatus}
            onChange={(e) =>
              setFiltroStatus(
                e.target.value as 'todos' | 'ativo' | 'inativo'
              )
            }
            className={selectCls}
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>

          {/* Segmento */}
          <select
            value={filtroSegmento}
            onChange={(e) => setFiltroSegmento(e.target.value)}
            className={selectCls}
          >
            <option value="todos">Todos os segmentos</option>
            {SEGMENTOS_CLIENTE.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Contador */}
          <span className="text-xs text-slate-400 ml-auto">
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tabela ou empty state */}
        {filtrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20">
            <div className="bg-slate-100 rounded-2xl p-5 mb-4">
              <Users size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">
              Nenhum cliente encontrado
            </p>
            <p className="text-sm text-slate-400">
              {busca ||
              filtroTipo !== 'todos' ||
              filtroStatus !== 'todos' ||
              filtroSegmento !== 'todos'
                ? 'Tente ajustar os filtros de busca.'
                : 'Clique em "Novo Cliente" para cadastrar o primeiro cliente.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: card view */}
            <div className="lg:hidden space-y-3">
              {filtrados.map((cliente) => (
                <div key={cliente.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{cliente.razaoSocial}</p>
                      {cliente.nomeInterno && (
                        <p className="text-xs text-blue-600 font-medium">{cliente.nomeInterno}</p>
                      )}
                      {cliente.nomeFantasia && (
                        <p className="text-xs text-slate-500">{cliente.nomeFantasia}</p>
                      )}
                    </div>
                    <StatusBadgeNovo status={cliente.ativo ? 'ativo' : 'inativo'} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-3">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{cliente.tipo}</span>
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{cliente.segmento}</span>
                    {cliente.cidade && cliente.uf && (
                      <span>{cliente.cidade}/{cliente.uf}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5 mb-3">
                    <p className="font-mono">{cliente.cnpjCpf}</p>
                    {cliente.contatoPrincipal && <p>{cliente.contatoPrincipal}</p>}
                    {cliente.telefone && <p>{cliente.telefone}</p>}
                  </div>
                  <div className="flex gap-1 border-t border-slate-100 pt-2">
                    <button onClick={() => abrirVisualizacaoCliente(cliente)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 py-1.5 rounded-lg hover:bg-slate-50">
                      <Eye size={14} /> Ver
                    </button>
                    <button onClick={() => abrirEdicaoCliente(cliente)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-amber-600 py-1.5 rounded-lg hover:bg-amber-50">
                      <Pencil size={14} /> Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table view */}
            <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Razão Social
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Nome Fantasia
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      CNPJ / CPF
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Segmento
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Contato
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      Telefone
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      Cidade / UF
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((cliente, idx) => (
                    <tr
                      key={cliente.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        idx !== filtrados.length - 1
                          ? 'border-b border-slate-100'
                          : ''
                      }`}
                    >
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadgeNovo
                          status={cliente.ativo ? 'ativo' : 'inativo'}
                        />
                      </td>

                      {/* Razão Social */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <div>
                          <p className="font-medium text-slate-800 truncate">
                            {cliente.razaoSocial}
                          </p>
                          {cliente.nomeInterno && (
                            <span className="text-xs text-blue-600 font-medium truncate block">
                              {cliente.nomeInterno}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {cliente.tipo}
                          </span>
                        </div>
                      </td>

                      {/* Nome Fantasia */}
                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="text-slate-600 text-sm truncate block">
                          {cliente.nomeFantasia || (
                            <span className="text-slate-300">—</span>
                          )}
                        </span>
                      </td>

                      {/* CNPJ/CPF */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-500">
                          {cliente.cnpjCpf}
                        </span>
                      </td>

                      {/* Segmento */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                          {cliente.segmento}
                        </span>
                      </td>

                      {/* Contato */}
                      <td className="px-4 py-3 max-w-[140px]">
                        <span className="text-xs text-slate-600 truncate block">
                          {cliente.contatoPrincipal || (
                            <span className="text-slate-300">—</span>
                          )}
                        </span>
                      </td>

                      {/* Telefone */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-500">
                          {cliente.telefone || (
                            <span className="text-slate-300">—</span>
                          )}
                        </span>
                      </td>

                      {/* Cidade/UF */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-500">
                          {cliente.cidade && cliente.uf
                            ? `${cliente.cidade} / ${cliente.uf}`
                            : cliente.cidade || cliente.uf || (
                                <span className="text-slate-300">—</span>
                              )}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            title="Visualizar"
                            onClick={() => abrirVisualizacaoCliente(cliente)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            title="Editar"
                            onClick={() => abrirEdicaoCliente(cliente)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            title={
                              cliente.ativo ? 'Inativar' : 'Ativar'
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              cliente.ativo
                                ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                                : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
