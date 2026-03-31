import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search } from 'lucide-react';
import { useNovoOrcamento } from '../context/NovoOrcamentoContext';
import { ModalNovoOrcamento } from '../components/orcamentos/ModalNovoOrcamento';
import { KanbanFunil } from '../components/orcamentos/KanbanFunil';

export function OrcamentosKanban() {
  const navigate = useNavigate();
  const { orcamentos } = useNovoOrcamento();
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const filtrados = orcamentos.filter(
    (o) =>
      o.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      o.numero.toLowerCase().includes(busca.toLowerCase()) ||
      o.clienteNome.toLowerCase().includes(busca.toLowerCase()) ||
      o.responsavel.toLowerCase().includes(busca.toLowerCase())
  );

  function handleCriado(id: string) {
    setModalAberto(false);
    navigate(`/orcamentos/${id}`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kanban — Funil de Vendas</h1>
          <p className="text-sm text-slate-500 mt-1">
            {orcamentos.length} oportunidade{orcamentos.length !== 1 ? 's' : ''} no funil
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <PlusCircle size={16} />
          Nova Oportunidade
        </button>
      </div>

      {/* Corpo */}
      <div className="flex-1 p-8 overflow-hidden flex flex-col">
        {/* Busca */}
        <div className="mb-6 relative max-w-sm flex-shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por título, número, cliente..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-auto">
          <KanbanFunil orcamentos={filtrados} />
        </div>
      </div>

      {/* Modal */}
      <ModalNovoOrcamento
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onCriado={handleCriado}
      />
    </div>
  );
}
