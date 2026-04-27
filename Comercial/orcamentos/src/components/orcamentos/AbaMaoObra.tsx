import { useState } from 'react';
import { Plus } from 'lucide-react';
import { TabelaMaoObra, type ItemMaoObra } from './TabelaMaoObra';

interface AbaMaoObraProps {
  orcamentoId: string;
}

export function AbaMaoObra({ orcamentoId: _orcamentoId }: AbaMaoObraProps) {
  const [itens, setItens] = useState<ItemMaoObra[]>([]);
  const [adicionar, setAdicionar] = useState(false);
  const [novoItem, setNovoItem] = useState<Omit<ItemMaoObra, 'id' | 'profissionais'>>({
    atividade: '',
    jornada: 8,
    unid: 'm',
    qtd: 1,
    tempoTotal: 1,
  });

  function adicionarItem() {
    if (!novoItem.atividade.trim()) return;

    const item: ItemMaoObra = {
      ...novoItem,
      id: Date.now().toString(),
      profissionais: [],
    };

    setItens([...itens, item]);
    setNovoItem({ atividade: '', jornada: 8, unid: 'm', qtd: 1, tempoTotal: 1 });
    setAdicionar(false);
  }

  function atualizarItem(itemAtualizado: ItemMaoObra) {
    setItens(itens.map(i => i.id === itemAtualizado.id ? itemAtualizado : i));
  }

  function removerItem(id: string) {
    setItens(itens.filter(i => i.id !== id));
  }

  // Calcular total geral
  const totalCoefGeral = itens.reduce((sum, item) => 
    sum + item.profissionais.reduce((s, p) => s + p.coef, 0), 0
  );
  const totalHhGeral = itens.reduce((sum, item) => 
    sum + item.profissionais.reduce((s, p) => s + p.hhTotal, 0), 0
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Mão de Obra</h3>
          <p className="text-xs text-slate-500 mt-1">Atividades e profissionais envolvidos</p>
        </div>
        <button
          onClick={() => setAdicionar(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nova Atividade
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        {/* Adicionar novo */}
        {adicionar && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-slate-800 mb-3">Nova Atividade</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Atividade</label>
                <input
                  type="text"
                  value={novoItem.atividade}
                  onChange={(e) => setNovoItem({ ...novoItem, atividade: e.target.value })}
                  placeholder="Ex: Dellabruna - Galpão e Mezanino"
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Jornada (h)</label>
                <input
                  type="number"
                  value={novoItem.jornada}
                  onChange={(e) => setNovoItem({ ...novoItem, jornada: parseFloat(e.target.value) })}
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">QTD</label>
                <input
                  type="number"
                  value={novoItem.qtd}
                  onChange={(e) => setNovoItem({ ...novoItem, qtd: parseFloat(e.target.value) })}
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Tempo (dias)</label>
              <input
                type="number"
                value={novoItem.tempoTotal}
                onChange={(e) => setNovoItem({ ...novoItem, tempoTotal: parseFloat(e.target.value) })}
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setAdicionar(false)}
                className="px-3 py-1.5 rounded border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarItem}
                className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
              >
                Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Lista de itens */}
        {itens.length === 0 && !adicionar ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <Plus size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Nenhuma atividade adicionada</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Nova Atividade" para começar</p>
          </div>
        ) : (
          <>
            {itens.map((item) => (
              <TabelaMaoObra
                key={item.id}
                item={item}
                onAtualizar={atualizarItem}
                onRemover={removerItem}
              />
            ))}
          </>
        )}
      </div>

      {/* Resumo total */}
      {itens.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Total de Atividades</p>
              <p className="text-2xl font-bold text-slate-800">{itens.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Coeficiente Total</p>
              <p className="text-2xl font-bold text-slate-800">{totalCoefGeral.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Horas Homem Total</p>
              <p className="text-2xl font-bold text-blue-600">{totalHhGeral.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
