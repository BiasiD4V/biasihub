import React from 'react'
import { Plus, ArrowRightToLine, ArrowLeftFromLine, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { COR_TIPO, LABEL_TIPO } from '../../lib/planejamento/parseEAP'

const TIPOS = ['CC', 'E', 'SE', 'S']

/**
 * ToolbarEAP
 *
 * Barra flutuante de edição rápida da EAP — aparece somente em modo edição.
 *
 * Props:
 *   itemSelecionado     - item EAP atualmente selecionado (ou null)
 *   baselineCongelada
 *   perm
 *   onAddTipo(tipo)     - abre ModalNovoItemEAP pré-selecionando o tipo
 *   onRecuar()          - recua item selecionado (aumenta nível / vira filho do anterior)
 *   onPromover()        - promove item selecionado (diminui nível / vira irmão do pai)
 *   onMoverCima()
 *   onMoverBaixo()
 *   onExcluir()
 */
export default function ToolbarEAP({
  itemSelecionado,
  baselineCongelada,
  perm,
  onAddTipo,
  onRecuar,
  onPromover,
  onMoverCima,
  onMoverBaixo,
  onExcluir,
}) {
  const temItem = !!itemSelecionado
  const podeEditar = perm.editarCronograma && !baselineCongelada

  function BtnTipo({ tipo }) {
    return (
      <button
        onClick={() => onAddTipo?.(tipo)}
        title={`Adicionar ${LABEL_TIPO[tipo]}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all hover:shadow-sm text-xs font-bold"
        style={{ borderColor: COR_TIPO[tipo], color: COR_TIPO[tipo], backgroundColor: COR_TIPO[tipo] + '10' }}>
        <Plus size={11} />
        {tipo}
      </button>
    )
  }

  function BtnAcao({ icon: Icon, label, onClick, disabled, title }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title || label}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        <Icon size={12} />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  return (
    <div className="sticky bottom-4 z-30 mx-auto max-w-fit">
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-2.5 flex-wrap">

        {/* Divider label */}
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider hidden sm:inline">
          Adicionar
        </span>

        {/* Quick add por tipo */}
        {TIPOS.map(t => (
          <BtnTipo key={t} tipo={t} />
        ))}

        {/* Separador */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Ações sobre item selecionado */}
        <BtnAcao
          icon={ArrowRightToLine}
          label="Recuar →"
          onClick={onRecuar}
          disabled={!temItem || !podeEditar}
          title={temItem ? 'Recuar nível (tornar filho)' : 'Selecione um item'}
        />
        <BtnAcao
          icon={ArrowLeftFromLine}
          label="Promover ←"
          onClick={onPromover}
          disabled={!temItem || !podeEditar}
          title={temItem ? 'Promover nível (tornar irmão do pai)' : 'Selecione um item'}
        />

        {/* Separador */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        <BtnAcao
          icon={ChevronUp}
          label="Subir ↑"
          onClick={onMoverCima}
          disabled={!temItem || !podeEditar}
          title={temItem ? 'Mover para cima entre irmãos' : 'Selecione um item'}
        />
        <BtnAcao
          icon={ChevronDown}
          label="Descer ↓"
          onClick={onMoverBaixo}
          disabled={!temItem || !podeEditar}
          title={temItem ? 'Mover para baixo entre irmãos' : 'Selecione um item'}
        />

        {/* Excluir */}
        {temItem && podeEditar && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button
              onClick={onExcluir}
              title={`Excluir ${itemSelecionado?.nome || 'item'}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={12} />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          </>
        )}

        {/* Info item selecionado */}
        {temItem && (
          <div className="ml-2 flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: COR_TIPO[itemSelecionado.tipo] + '20', color: COR_TIPO[itemSelecionado.tipo] }}>
              {itemSelecionado.tipo}
            </span>
            <span className="font-mono">{itemSelecionado.codigo}</span>
            <span className="truncate max-w-[120px]">{itemSelecionado.nome}</span>
          </div>
        )}
      </div>
    </div>
  )
}
