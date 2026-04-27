import { Trash2 } from 'lucide-react';
import { ItemOrcamento } from '../types';
import { calcularSubtotal, formatarMoeda } from '../utils/calculos';

interface Props {
  itens: ItemOrcamento[];
  onRemover: (id: string) => void;
  onAtualizar: (id: string, campo: 'quantidade' | 'valorUnitario', valor: number) => void;
}

export function TabelaItens({ itens, onRemover, onAtualizar }: Props) {
  if (itens.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-lg">
        Nenhum item adicionado. Use o botão acima para incluir itens.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left">Descrição</th>
            <th className="px-4 py-3 text-center w-20">Unid.</th>
            <th className="px-4 py-3 text-center w-28">Qtd.</th>
            <th className="px-4 py-3 text-right w-36">Valor Unit.</th>
            <th className="px-4 py-3 text-right w-36">Subtotal</th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {itens.map((item) => (
            <tr key={item.id} className="bg-white hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-800">{item.descricao}</td>
              <td className="px-4 py-3 text-center text-gray-500">{item.unidade}</td>
              <td className="px-4 py-3 text-center">
                <input
                  type="number"
                  min={1}
                  value={item.quantidade}
                  onChange={(e) => onAtualizar(item.id, 'quantidade', Number(e.target.value))}
                  className="w-20 text-center border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </td>
              <td className="px-4 py-3 text-right">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.valorUnitario}
                  onChange={(e) => onAtualizar(item.id, 'valorUnitario', Number(e.target.value))}
                  className="w-32 text-right border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-700">
                {formatarMoeda(calcularSubtotal(item))}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onRemover(item.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                  title="Remover item"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
