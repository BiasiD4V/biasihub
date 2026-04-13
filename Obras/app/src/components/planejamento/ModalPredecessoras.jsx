// ============================================================================
// components/planejamento/ModalPredecessoras.jsx
// Editor de predecessoras estilo MS Project (FS/SS/FF/SF + lag)
// ============================================================================

import React, { useState, useMemo } from 'react'
import { X, Plus, Trash2, Save, Info } from 'lucide-react'

const TIPOS = [
  { value: 'FS', label: 'FS', desc: 'Fim → Início (padrão)' },
  { value: 'SS', label: 'SS', desc: 'Início → Início' },
  { value: 'FF', label: 'FF', desc: 'Fim → Fim' },
  { value: 'SF', label: 'SF', desc: 'Início → Fim (raro)' },
]

/**
 * Formata no estilo MS Project: "1.1.1.1FS+2" ou "1.1.2.1SS"
 */
function formatarPred(codigo, tipo, lag) {
  const lagStr = lag !== 0
    ? (lag > 0 ? `+${lag}d` : `${lag}d`)
    : ''
  return `${codigo}${tipo}${lagStr}`
}

/**
 * ModalPredecessoras
 *
 * Props:
 *   item              EAP item sendo editado { id, codigo, nome, atividade_id }
 *   todasFolhas       Todas atividades tipo S do planejamento
 *                       [{ id (eap_id), atividade_id, codigo, nome }]
 *   predecessorasAtv  Predecessoras atuais para este item
 *                       [{ id?, predecessora_id (atividade_id), tipo, lag_dias }]
 *   salvando          boolean
 *   onSalvar          async ([{ predecessora_id, tipo, lag_dias }]) => void
 *   onFechar          () => void
 */
export default function ModalPredecessoras({
  item,
  todasFolhas = [],
  predecessorasAtv = [],
  salvando = false,
  onSalvar,
  onFechar,
}) {
  // Estado local das linhas
  const [linhas, setLinhas] = useState(() =>
    predecessorasAtv.map(p => ({
      key:            Math.random(),
      predecessora_id: p.predecessora_id,
      tipo:           p.tipo || 'FS',
      lag_dias:       p.lag_dias ?? 0,
    }))
  )

  // Atividades disponíveis = todas exceto a própria
  const disponiveis = useMemo(() =>
    todasFolhas.filter(f => f.id !== item.id && f.atividade_id),
    [todasFolhas, item.id]
  )

  function addLinha() {
    setLinhas(prev => [...prev, {
      key: Math.random(),
      predecessora_id: '',
      tipo: 'FS',
      lag_dias: 0,
    }])
  }

  function removeLinha(key) {
    setLinhas(prev => prev.filter(l => l.key !== key))
  }

  function editLinha(key, campo, valor) {
    setLinhas(prev => prev.map(l =>
      l.key === key ? { ...l, [campo]: valor } : l
    ))
  }

  function handleSalvar() {
    const validas = linhas.filter(l => l.predecessora_id)
    onSalvar(validas.map(l => ({
      predecessora_id: l.predecessora_id,
      tipo: l.tipo,
      lag_dias: Number(l.lag_dias) || 0,
    })))
  }

  // Monta preview das relações
  const preview = useMemo(() => {
    return linhas
      .filter(l => l.predecessora_id)
      .map(l => {
        const atv = disponiveis.find(d => d.atividade_id === l.predecessora_id)
        return atv ? formatarPred(atv.codigo, l.tipo, Number(l.lag_dias) || 0) : null
      })
      .filter(Boolean)
  }, [linhas, disponiveis])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
        style={{ fontFamily: 'Montserrat, sans-serif' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Predecessoras</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono text-slate-400">{item.codigo}</span>
              {' '}— {item.nome}
            </p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* ── Legenda ── */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 flex flex-wrap gap-x-5 gap-y-1">
            {TIPOS.map(t => (
              <span key={t.value} className="text-xs text-blue-800">
                <strong>{t.value}</strong> — {t.desc}
              </span>
            ))}
            <span className="text-xs text-blue-600">
              <Info size={11} className="inline mr-0.5" />
              Lag positivo = espera · negativo = sobreposição
            </span>
          </div>
        </div>

        {/* ── Tabela de linhas ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {linhas.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">
              Nenhuma predecessora definida. Clique em "+ Adicionar" para incluir.
            </p>
          )}

          {linhas.map((linha, idx) => (
            <div key={linha.key}
              className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50">

              {/* Nº */}
              <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{idx + 1}</span>

              {/* Select atividade predecessora */}
              <select
                value={linha.predecessora_id}
                onChange={e => editLinha(linha.key, 'predecessora_id', e.target.value)}
                className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1.5 text-xs
                  focus:outline-none focus:border-blue-400 bg-white"
              >
                <option value="">— selecione —</option>
                {disponiveis.map(d => (
                  <option key={d.id} value={d.atividade_id}>
                    {d.codigo} — {d.nome}
                  </option>
                ))}
              </select>

              {/* Tipo FS/SS/FF/SF */}
              <select
                value={linha.tipo}
                onChange={e => editLinha(linha.key, 'tipo', e.target.value)}
                className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center
                  focus:outline-none focus:border-blue-400 bg-white font-mono font-bold"
                style={{ color: '#233772' }}
              >
                {TIPOS.map(t => (
                  <option key={t.value} value={t.value}>{t.value}</option>
                ))}
              </select>

              {/* Lag (dias úteis) */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="number"
                  value={linha.lag_dias}
                  onChange={e => editLinha(linha.key, 'lag_dias', e.target.value)}
                  className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center
                    focus:outline-none focus:border-blue-400 bg-white"
                  title="Lag em dias úteis (positivo = espera, negativo = sobreposição)"
                />
                <span className="text-[10px] text-slate-400">d</span>
              </div>

              {/* Preview da notação */}
              {linha.predecessora_id && (
                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5
                  rounded flex-shrink-0 hidden sm:inline">
                  {formatarPred(
                    disponiveis.find(d => d.atividade_id === linha.predecessora_id)?.codigo || '?',
                    linha.tipo,
                    Number(linha.lag_dias) || 0
                  )}
                </span>
              )}

              {/* Remover */}
              <button onClick={() => removeLinha(linha.key)}
                className="text-red-400 hover:text-red-600 p-1 rounded flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Adicionar linha */}
          <button
            onClick={addLinha}
            className="flex items-center gap-2 text-xs font-semibold text-blue-600
              hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} />
            Adicionar predecessora
          </button>
        </div>

        {/* ── Preview resumido ── */}
        {preview.length > 0 && (
          <div className="px-6 py-2 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <p className="text-[10px] text-slate-500">
              <strong className="text-slate-600">Notação MS Project: </strong>
              <span className="font-mono text-blue-700">{preview.join(', ')}</span>
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onFechar}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2
              transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#233772', color: '#fff' }}>
            {salvando
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save size={15} />}
            Salvar e recalcular
          </button>
        </div>
      </div>
    </div>
  )
}
