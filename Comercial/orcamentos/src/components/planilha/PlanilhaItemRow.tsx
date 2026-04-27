import { Trash2 } from 'lucide-react'
import { BuscaInsumo } from './PlanilhaBuscaInsumo'
import { fmt, type ItemLocal } from './planilhaTypes'

interface ItemRowProps {
  item: ItemLocal
  onUpdate: (id: string, campo: string, valor: string | number | boolean) => void
  onDelete: (id: string) => void
  totalVerbaBase?: number
}

export function ItemRow({ item, onUpdate, onDelete, totalVerbaBase = 0 }: ItemRowProps) {
  const totalMat = item.is_verba ? 0 : item.quantidade * item.preco_unit_material
  const totalMO = item.is_verba ? 0 : item.quantidade * item.preco_unit_mo
  const totalVerba = item.is_verba ? (item.verba_pct / 100) * totalVerbaBase : 0
  const total = item.is_verba ? totalVerba : (totalMat + totalMO)

  const id = item.id || item._tempId || ''

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-100 hover:bg-slate-50 group text-xs">
      {/* Número */}
      <span className="w-20 text-slate-400 font-mono flex-shrink-0">{item.numero_item}</span>

      {/* Descrição — com autocomplete de insumos */}
      <BuscaInsumo
        value={item.descricao}
        onChange={(descricao, unidade, preco) => {
          onUpdate(id, 'descricao', descricao)
          if (unidade) onUpdate(id, 'unidade', unidade)
          if (preco > 0) onUpdate(id, 'preco_unit_material', preco)
        }}
      />

      {!item.is_verba ? (
        <>
          {/* Unidade */}
          <input
            value={item.unidade ?? ''}
            onChange={(e) => onUpdate(id, 'unidade', e.target.value)}
            placeholder="un"
            className="w-12 px-1 py-0.5 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-600"
          />
          {/* Quantidade */}
          <input
            type="number"
            value={item.quantidade}
            onChange={(e) => onUpdate(id, 'quantidade', parseFloat(e.target.value) || 0)}
            className="w-16 px-1 py-0.5 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-700"
          />
          {/* Preço material */}
          <input
            type="number"
            step="0.01"
            value={item.preco_unit_material || ''}
            placeholder="0,00"
            onChange={(e) => onUpdate(id, 'preco_unit_material', parseFloat(e.target.value) || 0)}
            className="w-24 px-1 py-0.5 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-700"
          />
          {/* Preço MO */}
          <input
            type="number"
            step="0.01"
            value={item.preco_unit_mo || ''}
            placeholder="0,00"
            onChange={(e) => onUpdate(id, 'preco_unit_mo', parseFloat(e.target.value) || 0)}
            className="w-24 px-1 py-0.5 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-700"
          />
          {/* Total material */}
          <span className="w-24 text-right text-slate-600 flex-shrink-0">{totalMat > 0 ? fmt(totalMat) : '—'}</span>
          {/* Total MO */}
          <span className="w-24 text-right text-slate-600 flex-shrink-0">{totalMO > 0 ? fmt(totalMO) : '—'}</span>
        </>
      ) : (
        <>
          {/* Verba % */}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-slate-500">Verba:</span>
            <input
              type="number"
              step="0.1"
              value={item.verba_pct || ''}
              placeholder="0"
              onChange={(e) => onUpdate(id, 'verba_pct', parseFloat(e.target.value) || 0)}
              className="w-16 px-1 py-0.5 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none"
            />
            <span className="text-slate-400">%</span>
          </div>
          <span className="flex-1" />
          <span className="w-24 text-right text-slate-500 flex-shrink-0">—</span>
          <span className="w-24 text-right text-slate-500 flex-shrink-0">—</span>
          <span className="w-24 text-right text-slate-500 flex-shrink-0">—</span>
          <span className="w-24 text-right text-slate-500 flex-shrink-0">—</span>
        </>
      )}

      {/* Total */}
      <span className={`w-28 text-right font-medium flex-shrink-0 ${total > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
        {total > 0 ? fmt(total) : '—'}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(id)}
        className="ml-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-400 transition-all flex-shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
