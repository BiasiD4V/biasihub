import { useState } from 'react'
import { ChevronDown, ChevronRight, Package } from 'lucide-react'
import { PainelFornecedores } from './PainelFornecedores'
import type { ItemCatalogo } from '../../infrastructure/supabase/catalogoRepository'

interface LinhaItemProps {
  item: ItemCatalogo
}

export function LinhaItem({ item }: LinhaItemProps) {
  const [expandido, setExpandido] = useState(false)

  const formatFaixa = (min: number, max: number) => {
    if (min <= 0 && max <= 0) return '—'
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    if (min === max || min <= 0) return fmt(max)
    return `${fmt(min)} – ${fmt(max)}`
  }

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Linha clicável */}
      <button
        onClick={() => setExpandido((p) => !p)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 ${
          expandido ? 'bg-blue-50' : ''
        }`}
      >
        {/* Ícone expand */}
        <span className="text-gray-400 flex-shrink-0">
          {expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        {/* Ícone item */}
        <Package size={13} className="text-gray-300 flex-shrink-0" />

        {/* Descrição */}
        <span className="flex-1 text-sm text-gray-800 font-medium truncate">
          {item.descricao}
        </span>

        {/* Unidade */}
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
          {item.unidade}
        </span>

        {/* Nº fornecedores */}
        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[80px] text-right">
          {item.total_fornecedores} fornecedor{item.total_fornecedores !== 1 ? 'es' : ''}
        </span>

        {/* Faixa de preço */}
        <span className="text-xs font-medium text-gray-600 flex-shrink-0 min-w-[160px] text-right">
          {formatFaixa(item.menor_custo, item.maior_custo)}
        </span>
      </button>

      {/* Painel expansível com fornecedores */}
      {expandido && (
        <PainelFornecedores descricao={item.descricao} unidade={item.unidade} />
      )}
    </div>
  )
}
