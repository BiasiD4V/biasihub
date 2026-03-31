import { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export interface ItemMaoObra {
  id: string;
  atividade: string;
  jornada: number; // em horas
  unid: string;
  qtd: number;
  tempoTotal: number; // em dias
  profissionais: ProfissionalMaoObra[];
}

export interface ProfissionalMaoObra {
  id: string;
  profissao: string;
  unid: string;
  coef: number; // coeficiente
  hhTotal: number; // horas hora total
}

interface TabelaMaoObraProps {
  item: ItemMaoObra;
  onAtualizar: (item: ItemMaoObra) => void;
  onRemover: (id: string) => void;
}

export function TabelaMaoObra({ item, onAtualizar, onRemover }: TabelaMaoObraProps) {
  const [editando, setEditando] = useState(false);
  const [itemEditado, setItemEditado] = useState<ItemMaoObra>(item);
  const [novoProfissional, setNovoProfissional] = useState<Omit<ProfissionalMaoObra, 'id'>>({
    profissao: '',
    unid: 'm',
    coef: 0,
    hhTotal: 0,
  });

  function salvarItem() {
    onAtualizar(itemEditado);
    setEditando(false);
  }

  function adicionarProfissional() {
    if (!novoProfissional.profissao.trim()) return;
    
    const novoP: ProfissionalMaoObra = {
      ...novoProfissional,
      id: Date.now().toString(),
    };
    
    setItemEditado({
      ...itemEditado,
      profissionais: [...itemEditado.profissionais, novoP],
    });
    
    setNovoProfissional({ profissao: '', unid: 'm', coef: 0, hhTotal: 0 });
  }

  function removerProfissional(profId: string) {
    setItemEditado({
      ...itemEditado,
      profissionais: itemEditado.profissionais.filter(p => p.id !== profId),
    });
  }

  // Calcular totais
  const totalCoef = itemEditado.profissionais.reduce((sum, p) => sum + p.coef, 0);
  const totalHhTotal = itemEditado.profissionais.reduce((sum, p) => sum + p.hhTotal, 0);

  if (!editando) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-semibold text-slate-800">{item.atividade}</h4>
            <p className="text-xs text-slate-500 mt-1">
              {item.jornada}h • {item.qtd}x • {item.tempoTotal} dias
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditando(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => onRemover(item.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Tabela de profissionais */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 text-left font-semibold text-slate-600">PROFISSIONAL</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600">UNID</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">COEF</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Hh TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {item.profissionais.map((prof) => (
                <tr key={prof.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700">{prof.profissao}</td>
                  <td className="px-3 py-2 text-center text-slate-700">{prof.unid}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-700">
                    {prof.coef.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-blue-600">
                    {prof.hhTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
              {item.profissionais.length > 0 && (
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={2} className="px-3 py-2 text-right text-slate-700">
                    TOTAL
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-800">
                    {totalCoef.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-blue-600">
                    {totalHhTotal.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // MODO EDIÇÃO
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      {/* Editar atividade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Atividade</label>
          <input
            type="text"
            value={itemEditado.atividade}
            onChange={(e) => setItemEditado({ ...itemEditado, atividade: e.target.value })}
            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Jornada (h)</label>
          <input
            type="number"
            value={itemEditado.jornada}
            onChange={(e) => setItemEditado({ ...itemEditado, jornada: parseFloat(e.target.value) })}
            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">QTD</label>
          <input
            type="number"
            value={itemEditado.qtd}
            onChange={(e) => setItemEditado({ ...itemEditado, qtd: parseFloat(e.target.value) })}
            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tempo (d)</label>
          <input
            type="number"
            value={itemEditado.tempoTotal}
            onChange={(e) => setItemEditado({ ...itemEditado, tempoTotal: parseFloat(e.target.value) })}
            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Profissionais */}
      <div className="mb-4 p-3 bg-white rounded border border-slate-200">
        <h5 className="text-xs font-semibold text-slate-700 mb-3">Profissionais</h5>
        
        {/* Lista */}
        <div className="space-y-2 mb-3">
          {itemEditado.profissionais.map((prof) => (
            <div key={prof.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
              <div className="flex-1">
                <span className="font-medium text-slate-700">{prof.profissao}</span>
                <span className="text-slate-500 ml-2">• {prof.coef.toFixed(4)} • {prof.hhTotal.toFixed(2)}h</span>
              </div>
              <button
                onClick={() => removerProfissional(prof.id)}
                className="text-red-600 hover:bg-red-50 p-1 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Adicionar profissional */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-slate-50 rounded border border-dashed border-slate-300">
          <input
            type="text"
            value={novoProfissional.profissao}
            onChange={(e) => setNovoProfissional({ ...novoProfissional, profissao: e.target.value })}
            placeholder="Profissão"
            className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            value={novoProfissional.unid}
            onChange={(e) => setNovoProfissional({ ...novoProfissional, unid: e.target.value })}
            placeholder="UNID"
            className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="number"
            value={novoProfissional.coef}
            onChange={(e) => setNovoProfissional({ ...novoProfissional, coef: parseFloat(e.target.value) })}
            placeholder="COEF"
            step="0.0001"
            className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={adicionarProfissional}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1 text-xs font-medium flex items-center justify-center gap-1"
          >
            <Plus size={12} />
            Adicionar
          </button>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setEditando(false)}
          className="px-3 py-1.5 rounded border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          onClick={salvarItem}
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
