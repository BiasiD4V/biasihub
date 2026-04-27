import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import type { NivelItem } from '../../infrastructure/supabase/planilhaOrcamentariaRepository'
import { ItemRow } from './PlanilhaItemRow'
import { fmt, type ItemLocal } from './planilhaTypes'

interface HierarquiaProps {
  itens: ItemLocal[]
  onUpdate: (id: string, campo: string, valor: string | number | boolean) => void
  onDelete: (id: string) => void
  onAddFilho: (parentNum: string, nivelPai: NivelItem | 'SE_verba') => void
}

export function HierarquiaBloco({ itens, onUpdate, onDelete, onAddFilho }: HierarquiaProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (num: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })

  const CCs = itens.filter((i) => i.nivel === 'CC')

  return (
    <div>
      {/* Table header */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
        <span className="w-20 flex-shrink-0">Item</span>
        <span className="flex-1">Descrição</span>
        <span className="w-12 text-center">Unid</span>
        <span className="w-16 text-right">Qtd</span>
        <span className="w-24 text-right">R$ Unit Mat</span>
        <span className="w-24 text-right">R$ Unit MO</span>
        <span className="w-24 text-right">Total Mat</span>
        <span className="w-24 text-right">Total MO</span>
        <span className="w-28 text-right">Total Geral</span>
        <span className="w-6" />
      </div>

      {CCs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm italic">
          Nenhum item. Clique em "+ CC" para começar.
        </div>
      ) : (
        CCs.map((cc) => {
          const Es = itens.filter(
            (i) => i.nivel === 'E' && i.numero_item.startsWith(cc.numero_item + '.')
              && !i.numero_item.slice(cc.numero_item.length + 1).includes('.')
          )
          const ccCollapsed = collapsed.has(cc.id || cc._tempId || '')

          const ccServicos = itens.filter(
            (i) => i.nivel === 'S' && i.numero_item.startsWith(cc.numero_item + '.')
              && !i.is_verba
          )
          const ccMatTotal = ccServicos.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
          const ccMOTotal = ccServicos.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
          const ccTotal = ccMatTotal + ccMOTotal

          return (
            <div key={cc.id || cc._tempId} className="border-b border-slate-200">
              {/* CC Header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-700 text-white">
                <button onClick={() => toggle(cc.id || cc._tempId || '')} className="text-blue-300 hover:text-white">
                  {ccCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                <span className="font-mono text-xs text-blue-300 w-16">{cc.numero_item}</span>
                <input
                  value={cc.descricao}
                  onChange={(e) => onUpdate(cc.id || cc._tempId || '', 'descricao', e.target.value)}
                  className="flex-1 bg-transparent border-b border-blue-500 focus:outline-none text-sm font-semibold placeholder-blue-400"
                  placeholder="Nome da Célula Construtiva (CC)..."
                />
                {ccTotal > 0 && (
                  <span className="text-xs text-blue-200 ml-2 hidden md:block">{fmt(ccTotal)}</span>
                )}
                <button
                  onClick={() => onAddFilho(cc.numero_item, 'CC')}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-500 rounded transition-colors ml-2"
                  title="Adicionar Etapa"
                >
                  <Plus size={11} /> E
                </button>
                <button
                  onClick={() => onDelete(cc.id || cc._tempId || '')}
                  className="p-1 hover:bg-blue-600 rounded transition-colors ml-1"
                  title="Excluir CC"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {!ccCollapsed && Es.map((etapa) => {
                const SEs = itens.filter(
                  (i) => i.nivel === 'SE' && i.numero_item.startsWith(etapa.numero_item + '.')
                    && !i.numero_item.slice(etapa.numero_item.length + 1).includes('.')
                )
                const eCollapsed = collapsed.has(etapa.id || etapa._tempId || '')

                const eServicos = itens.filter(
                  (i) => i.nivel === 'S' && i.numero_item.startsWith(etapa.numero_item + '.')
                    && !i.is_verba
                )
                const eMatTotal = eServicos.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
                const eMOTotal = eServicos.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
                const eTotal = eMatTotal + eMOTotal

                return (
                  <div key={etapa.id || etapa._tempId}>
                    {/* E Header */}
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 text-white">
                      <button onClick={() => toggle(etapa.id || etapa._tempId || '')} className="text-slate-400 hover:text-white">
                        {eCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <span className="font-mono text-xs text-slate-400 w-16">{etapa.numero_item}</span>
                      <input
                        value={etapa.descricao}
                        onChange={(e) => onUpdate(etapa.id || etapa._tempId || '', 'descricao', e.target.value)}
                        className="flex-1 bg-transparent border-b border-slate-500 focus:outline-none text-sm font-medium placeholder-slate-400"
                        placeholder="Nome da Etapa (E)..."
                      />
                      {eTotal > 0 && (
                        <span className="text-xs text-slate-400 ml-2 hidden md:block">{fmt(eTotal)}</span>
                      )}
                      <button
                        onClick={() => onAddFilho(etapa.numero_item, 'E')}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-600 hover:bg-slate-500 rounded transition-colors ml-2"
                        title="Adicionar Sub-etapa"
                      >
                        <Plus size={11} /> SE
                      </button>
                      <button
                        onClick={() => onDelete(etapa.id || etapa._tempId || '')}
                        className="p-1 hover:bg-slate-600 rounded transition-colors ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {!eCollapsed && SEs.map((sub) => {
                      const Ss = itens.filter(
                        (i) => i.nivel === 'S' && i.numero_item.startsWith(sub.numero_item + '.')
                          && !i.numero_item.slice(sub.numero_item.length + 1).includes('.')
                      )
                      const seCollapsed = collapsed.has(sub.id || sub._tempId || '')

                      const sNaoVerba = Ss.filter((i) => !i.is_verba)
                      const seMatTotal = sNaoVerba.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
                      const seMOTotal = sNaoVerba.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
                      const seBase = seMatTotal + seMOTotal
                      const seVerbas = Ss.filter((i) => i.is_verba)
                      const seVerbaTotal = seVerbas.reduce((a, i) => a + (i.verba_pct / 100) * seBase, 0)
                      const seTotal = seBase + seVerbaTotal

                      return (
                        <div key={sub.id || sub._tempId} className="bg-white">
                          {/* SE Header */}
                          <div className="flex items-center gap-2 px-6 py-1.5 bg-slate-100 border-b border-slate-200 text-slate-700">
                            <button onClick={() => toggle(sub.id || sub._tempId || '')} className="text-slate-400 hover:text-slate-700">
                              {seCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                            </button>
                            <span className="font-mono text-xs text-slate-400 w-16">{sub.numero_item}</span>
                            <input
                              value={sub.descricao}
                              onChange={(e) => onUpdate(sub.id || sub._tempId || '', 'descricao', e.target.value)}
                              className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-xs font-semibold text-slate-700 placeholder-slate-400"
                              placeholder="Nome da Sub-etapa (SE)..."
                            />
                            {seTotal > 0 && (
                              <span className="text-xs text-slate-500 ml-2 hidden md:block">{fmt(seTotal)}</span>
                            )}
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => onAddFilho(sub.numero_item, 'SE')}
                                className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-slate-200 hover:bg-slate-300 rounded transition-colors"
                                title="Adicionar Serviço"
                              >
                                <Plus size={10} /> S
                              </button>
                              <button
                                onClick={() => onAddFilho(sub.numero_item, 'SE_verba')}
                                className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-200 rounded transition-colors"
                                title="Adicionar Verba"
                              >
                                <Plus size={10} /> Verba
                              </button>
                            </div>
                            <button
                              onClick={() => onDelete(sub.id || sub._tempId || '')}
                              className="p-1 hover:bg-slate-200 rounded transition-colors ml-1"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>

                          {!seCollapsed && Ss.map((servico) => (
                            <ItemRow
                              key={servico.id || servico._tempId}
                              item={servico}
                              onUpdate={onUpdate}
                              onDelete={onDelete}
                              totalVerbaBase={seBase}
                            />
                          ))}

                          {/* SE subtotal */}
                          {!seCollapsed && Ss.length > 0 && (
                            <div className="flex justify-end gap-1 px-3 py-1 bg-slate-50 border-b border-slate-200 text-xs">
                              <span className="text-slate-500 mr-auto pl-20">Subtotal {sub.numero_item}</span>
                              <span className="w-24 text-right text-slate-600">{seMatTotal > 0 ? fmt(seMatTotal) : '—'}</span>
                              <span className="w-24 text-right text-slate-600">{seMOTotal > 0 ? fmt(seMOTotal) : '—'}</span>
                              <span className="w-28 text-right font-semibold text-slate-700">{seTotal > 0 ? fmt(seTotal) : '—'}</span>
                              <span className="w-7" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}
