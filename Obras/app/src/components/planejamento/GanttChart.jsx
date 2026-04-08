import React, { useEffect, useRef, useState } from 'react'
import Gantt from 'frappe-gantt'

// ============================================================================
// GanttChart — wrapper frappe-gantt
// Recebe lista de atividades (tipo S) com datas e renderiza o Gantt
// ============================================================================

const ZOOM_OPCOES = ['Day', 'Week', 'Month', 'Quarter Year']
const ZOOM_LABELS = { Day: 'Dia', Week: 'Semana', Month: 'Mês', 'Quarter Year': 'Trimestre' }

export default function GanttChart({ atividades = [], predecessoras = [], atvIdToEap = {}, baselineCongelada = false, onClickAtividade }) {
  const containerRef = useRef(null)
  const ganttRef = useRef(null)
  const [zoom, setZoom] = useState('Month')

  // Converte atividades para o formato frappe-gantt
  function converterTarefas(lista) {
    // Mapa eap_item.id → atividade_id para resolver dependências
    const eapIdToAtvId = {}
    for (const a of lista) {
      if (a.atividade_id) eapIdToAtvId[a.id] = a.atividade_id
    }

    return lista
      .filter(a => a.data_inicio_prevista && a.data_fim_prevista)
      .map(a => {
        // Acha predecessoras desta atividade pelo atividade_id
        const preds = predecessoras
          .filter(p => p.atividade_id === a.atividade_id)
          .map(p => {
            // Acha o eap item que tem esse atividade_id como predecessora
            const predEap = atvIdToEap[p.predecessora_id]
            return predEap ? predEap.id : null
          })
          .filter(Boolean)

        return {
          id: a.id,
          name: `${a.codigo ? a.codigo + ' — ' : ''}${a.nome}`,
          start: a.data_inicio_prevista,
          end: a.data_fim_prevista,
          progress: Math.min(100, Number(a.peso_realizado_agregado || 0)),
          dependencies: preds.join(', '),
          custom_class: a.is_critica ? 'bar-critica' : '',
        }
      })
  }

  useEffect(() => {
    if (!containerRef.current) return

    const tarefas = converterTarefas(atividades)
    if (tarefas.length === 0) return

    // Limpar instância anterior
    containerRef.current.innerHTML = ''

    try {
      ganttRef.current = new Gantt(containerRef.current, tarefas, {
        view_mode: zoom,
        date_format: 'YYYY-MM-DD',
        language: 'pt',
        bar_height: 22,
        bar_corner_radius: 4,
        arrow_curve: 5,
        padding: 16,
        on_click: (task) => {
          if (onClickAtividade) onClickAtividade(task.id)
        },
        on_view_change: () => {},
        popup_trigger: 'click',
        custom_popup_html: (task) => `
          <div style="padding:10px;min-width:180px;font-family:sans-serif;font-size:12px">
            <p style="font-weight:700;margin:0 0 4px;color:#233772">${task.name}</p>
            <p style="margin:0;color:#64748b">Início: ${task._start?.toLocaleDateString('pt-BR') || '—'}</p>
            <p style="margin:0;color:#64748b">Fim: ${task._end?.toLocaleDateString('pt-BR') || '—'}</p>
            <p style="margin:2px 0 0;color:#16a34a;font-weight:600">Progresso: ${task.progress}%</p>
          </div>
        `,
      })
    } catch (err) {
      console.warn('[GanttChart]', err.message)
    }
  }, [atividades, predecessoras, zoom])

  // Mudar zoom
  function handleZoom(novoZoom) {
    setZoom(novoZoom)
    if (ganttRef.current) {
      ganttRef.current.change_view_mode(novoZoom)
    }
  }

  const tarefas = converterTarefas(atividades)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-800">Gantt</h3>
          {baselineCongelada && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              🔒 Baseline ativa
            </span>
          )}
        </div>
        {/* Controles de zoom */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {ZOOM_OPCOES.map(z => (
            <button key={z}
              onClick={() => handleZoom(z)}
              className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
              style={zoom === z
                ? { backgroundColor: '#233772', color: '#fff' }
                : { color: '#64748b' }}>
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#4169e1' }} />
          No prazo
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
          Caminho crítico
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#94a3b8' }} />
          Baseline
        </div>
      </div>

      {/* Container do Gantt */}
      {tarefas.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          Nenhuma atividade com datas definidas para exibir no Gantt.
          <br />
          Edite as datas de início e fim na tabela acima.
        </div>
      ) : (
        <div className="overflow-x-auto p-2">
          <style>{`
            .gantt .bar-critica > .bar { fill: #ef4444 !important; }
            .gantt .bar-progress { fill: #233772 !important; }
            .gantt .bar { fill: #4169e1; }
            .gantt .bar-label { font-size: 11px; fill: #fff; }
            .gantt .lower-text, .gantt .upper-text { font-size: 11px; }
            .gantt .grid-header { fill: #f8fafc; }
            .gantt .grid-row { fill: transparent; }
            .gantt .grid-row:nth-child(even) { fill: #f8fafc; }
            .gantt .today-highlight { fill: #fef9c3; opacity: 0.5; }
          `}</style>
          <div ref={containerRef} />
        </div>
      )}
    </div>
  )
}
