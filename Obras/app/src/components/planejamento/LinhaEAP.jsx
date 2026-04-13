import React from 'react'
import { ChevronDown, ChevronRight, Trash2, ChevronUp } from 'lucide-react'
import { COR_TIPO } from '../../lib/planejamento/parseEAP'

/**
 * LinhaEAP
 *
 * Linha da tabela EAP com suporte a edição de cronograma, registro de progresso,
 * reordenação (↑↓) e exibição do valor orçado.
 *
 * Props:
 *   item              - dados do item EAP
 *   expandido         - se o nó está expandido
 *   onToggle          - callback para expandir/recolher
 *   editando          - modo edição ativo
 *   onSalvar          - callback para salvar (centralizado no pai)
 *   onExcluir         - callback para excluir item
 *   perm              - permissões do usuário
 *   profundidade      - nível de indentação
 *   baselineCongelada - se a baseline está congelada (read-only)
 *   predecessorasAtv  - predecessoras desta atividade
 *   atvIdToEap        - mapa atividade_id → código EAP
 *   onAbrirModalPred  - callback para abrir modal de predecessoras
 *   pendingForm       - form centralizado de cronograma
 *   onFormChange      - callback para atualizar form de cronograma
 *   modoProgresso     - true = colunas de execução; false = colunas de planejamento
 *   pendingProgresso  - form centralizado de progresso
 *   onProgressoChange - callback para atualizar form de progresso
 *   ehPrimeiro        - é o primeiro entre irmãos (desabilita ↑)
 *   ehUltimo          - é o último entre irmãos (desabilita ↓)
 *   onMoverCima       - callback para mover item para cima
 *   onMoverBaixo      - callback para mover item para baixo
 */
export default function LinhaEAP({
  item, expandido, onToggle, editando, onSalvar, onExcluir,
  perm, profundidade, baselineCongelada,
  predecessorasAtv, atvIdToEap, onAbrirModalPred,
  pendingForm, onFormChange,
  modoProgresso, pendingProgresso, onProgressoChange,
  ehPrimeiro, ehUltimo, onMoverCima, onMoverBaixo,
  onAbrirParametros,
  itemSelecionadoId, onSelecionar,
}) {
  // ── Form de cronograma (centralizado no pai) ─────────────────────────────────
  const form = pendingForm || {
    duracao_dias:         item.duracao_dias         || '',
    data_inicio_prevista: item.data_inicio_prevista || '',
    data_fim_prevista:    item.data_fim_prevista    || '',
    peso_percentual:      item.peso_percentual      || '',
    valor_orcado:         item.valor_orcado         || '',
    criterio_medicao:     item.criterio_medicao     || 'ZERO_CEM',
  }

  const setForm = (updater) => {
    const novo = typeof updater === 'function' ? updater(form) : updater
    onFormChange?.(item.id, novo)
  }

  const isFolha    = item.tipo === 'S'
  const indentacao = (profundidade || 0) * 20
  const pctReal    = item.peso_realizado_agregado || 0

  // ── Form de progresso (centralizado no pai) ──────────────────────────────────
  const prog = pendingProgresso || {
    pct:              item.peso_realizado_agregado ?? 0,
    status:           item.status_execucao         ?? 'nao_iniciada',
    data_real_inicio: item.data_real_inicio        ?? '',
    data_real_fim:    item.data_real_fim           ?? '',
    obs:              item.obs_execucao            ?? '',
  }

  // Auto-detecta atraso: se data real > data prevista e não está concluída
  function resolverStatusAuto(novoProg) {
    if (novoProg.status === 'concluida') return novoProg.status
    const hoje       = new Date().toISOString().slice(0, 10)
    const fimReal    = novoProg.data_real_fim    || ''
    const inicioReal = novoProg.data_real_inicio || ''
    const fimPrev    = item.data_fim_prevista    || ''
    const inicioPrev = item.data_inicio_prevista || ''
    if (fimReal    && fimPrev    && fimReal    > fimPrev)    return 'atrasada'
    if (inicioReal && inicioPrev && inicioReal > inicioPrev) return 'atrasada'
    if (fimPrev && hoje > fimPrev && novoProg.status !== 'nao_iniciada') return 'atrasada'
    return novoProg.status
  }

  const setProg = (updater) => {
    const prev  = prog
    const novo  = typeof updater === 'function' ? updater(prev) : updater
    const statusFinal = resolverStatusAuto(novo)
    onProgressoChange?.(item.atividade_id, { ...novo, status: statusFinal })
  }

  const STATUS_OPTS = [
    { value: 'nao_iniciada', label: 'Não iniciada', cor: '#94a3b8' },
    { value: 'em_andamento', label: 'Em andamento', cor: '#2563eb' },
    { value: 'concluida',    label: 'Concluída',    cor: '#16a34a' },
    { value: 'atrasada',     label: 'Atrasada',     cor: '#dc2626' },
    { value: 'pausada',      label: 'Pausada',      cor: '#d97706' },
  ]
  const statusInfo = STATUS_OPTS.find(s => s.value === (prog.status || 'nao_iniciada')) || STATUS_OPTS[0]

  // Predecessoras no estilo MS Project: "1.1.1.1FS+2, 1.1.2.1SS"
  const predStr = (predecessorasAtv || [])
    .map(p => {
      const pred = atvIdToEap?.[p.predecessora_id]
      if (!pred) return null
      const lag = p.lag_dias !== 0 ? (p.lag_dias > 0 ? `+${p.lag_dias}` : `${p.lag_dias}`) : ''
      return `${pred.codigo}${p.tipo}${lag}`
    })
    .filter(Boolean)
    .join(', ')

  const isCritica = isFolha && item.is_critica
  const bgTipo    = { CC: '#f3f0ff', E: '#eff6ff', SE: '#f0fdf9', S: 'white' }
  const bgRow     = isCritica && !modoProgresso ? '#fff1f2' : bgTipo[item.tipo]
  const hoverRow  = isCritica && !modoProgresso ? 'hover:bg-red-50' : 'hover:bg-slate-50'

  // Formatação de moeda compacta
  function fmtValor(v) {
    const n = Number(v || 0)
    if (!n) return '—'
    if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `R$${(n / 1_000).toFixed(0)}k`
    return `R$${n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
  }

  const podeMover = editando && !baselineCongelada && perm.editarCronograma

  const eSelecionado = itemSelecionadoId === item.id

  return (
    <tr id={`eap-row-${item.id}`}
      className={`border-b transition-colors ${hoverRow}`}
      style={{
        backgroundColor: eSelecionado ? '#EEF2FF' : bgRow,
        outline: eSelecionado ? '2px solid #233772' : undefined,
        outlineOffset: '-2px',
      }}
      onClick={() => editando && onSelecionar?.(item)}
      onDoubleClick={() => isFolha && onAbrirParametros?.(item)}
      title={isFolha ? 'Duplo clique para abrir parâmetros · Clique para selecionar' : 'Clique para selecionar'}>

      {/* WBS + nome */}
      <td className="px-4 py-2.5" style={{ paddingLeft: `${indentacao + 16}px` }}>
        <div className="flex items-center gap-2">
          {!isFolha && item.temFilhos ? (
            <button onClick={() => onToggle(item.id)}
              className="text-slate-400 hover:text-slate-700 flex-shrink-0">
              {expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div className="w-3.5 flex-shrink-0" />
          )}
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ backgroundColor: COR_TIPO[item.tipo] + '30', color: COR_TIPO[item.tipo] }}>
            {item.tipo}
          </span>
          <span className="font-mono text-xs text-slate-500 flex-shrink-0">{item.codigo}</span>
          <span className={`text-sm truncate max-w-[220px] ${isFolha ? 'text-slate-800' : 'font-semibold text-slate-700'}`}>
            {item.nome}
          </span>
        </div>
      </td>

      {/* Duração */}
      <td className="px-3 py-2.5 text-center">
        {isFolha && editando && perm.editarCronograma && !baselineCongelada ? (
          <input type="number" min="1"
            value={form.duracao_dias}
            onChange={e => setForm(f => ({ ...f, duracao_dias: e.target.value }))}
            className="w-16 text-center border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400"
          />
        ) : (
          <span className="text-xs text-slate-600">
            {item.duracao_dias ? `${item.duracao_dias}d` : '—'}
          </span>
        )}
      </td>

      {/* Predecessoras — somente modo planejamento */}
      {!modoProgresso && (
        <td className="px-3 py-2.5 text-center">
          {isFolha ? (
            <button
              onClick={() => editando && !baselineCongelada && perm.editarCronograma && onAbrirModalPred(item)}
              title={editando && !baselineCongelada ? 'Clique para editar predecessoras' : predStr || ''}
              className={[
                'text-[11px] font-mono max-w-[110px] truncate block mx-auto px-1 py-0.5 rounded transition-colors',
                editando && !baselineCongelada && perm.editarCronograma
                  ? 'hover:bg-blue-50 text-blue-700 cursor-pointer'
                  : 'text-slate-500 cursor-default',
              ].join(' ')}>
              {predStr || (editando && !baselineCongelada && perm.editarCronograma
                ? <span className="text-slate-300">+pred</span>
                : <span className="text-slate-300">—</span>)}
            </button>
          ) : (
            <span className="text-slate-200 text-xs">—</span>
          )}
        </td>
      )}

      {/* Início */}
      <td className="px-3 py-2.5 text-center">
        {isFolha && editando && perm.editarCronograma && !baselineCongelada ? (
          <input type="date"
            value={form.data_inicio_prevista}
            onChange={e => setForm(f => ({ ...f, data_inicio_prevista: e.target.value }))}
            className="border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400"
          />
        ) : (
          <span className="text-xs text-slate-600">
            {item.data_inicio_prevista
              ? new Date(item.data_inicio_prevista + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              : '—'}
          </span>
        )}
      </td>

      {/* Fim */}
      <td className="px-3 py-2.5 text-center">
        {isFolha && editando && perm.editarCronograma && !baselineCongelada ? (
          <input type="date"
            value={form.data_fim_prevista}
            onChange={e => setForm(f => ({ ...f, data_fim_prevista: e.target.value }))}
            className="border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400"
          />
        ) : (
          <span className="text-xs text-slate-600">
            {item.data_fim_prevista
              ? new Date(item.data_fim_prevista + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              : '—'}
          </span>
        )}
      </td>

      {modoProgresso ? (
        /* ── COLUNAS DE EXECUÇÃO ────────────────────────────────── */
        <>
          {/* Início Real */}
          <td className="px-2 py-2 text-center">
            {isFolha ? (
              <input type="date"
                value={prog.data_real_inicio}
                onChange={e => setProg(p => ({ ...p, data_real_inicio: e.target.value }))}
                className="border border-cyan-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-cyan-400 bg-cyan-50"
              />
            ) : <span className="text-slate-200 text-xs">—</span>}
          </td>

          {/* Fim Real */}
          <td className="px-2 py-2 text-center">
            {isFolha ? (
              <input type="date"
                value={prog.data_real_fim}
                onChange={e => setProg(p => ({ ...p, data_real_fim: e.target.value }))}
                className="border border-cyan-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-cyan-400 bg-cyan-50"
              />
            ) : <span className="text-slate-200 text-xs">—</span>}
          </td>

          {/* % Concluído */}
          <td className="px-2 py-2 text-center">
            {isFolha ? (
              <div className="flex flex-col items-center gap-0.5">
                <input type="number" min="0" max="100" step="1"
                  value={prog.pct ?? 0}
                  onChange={e => setProg(p => ({ ...p, pct: e.target.value }))}
                  className="w-14 text-center border border-cyan-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-cyan-400 bg-cyan-50"
                />
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Number(prog.pct) || 0)}%`,
                      backgroundColor: Number(prog.pct) >= 100 ? '#16a34a' : '#0891b2',
                    }} />
                </div>
              </div>
            ) : <span className="text-slate-200 text-xs">—</span>}
          </td>

          {/* Status execução */}
          <td className="px-2 py-2 text-center">
            {isFolha ? (
              <select
                value={prog.status || 'nao_iniciada'}
                onChange={e => {
                  const s = e.target.value
                  setProg(p => ({ ...p, status: s, pct: s === 'concluida' ? 100 : p.pct }))
                }}
                className="text-[11px] border border-cyan-200 rounded px-1.5 py-1 focus:outline-none focus:border-cyan-400 bg-cyan-50 font-semibold"
                style={{ color: statusInfo.cor }}>
                {STATUS_OPTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            ) : <span className="text-slate-200 text-xs">—</span>}
          </td>
        </>
      ) : (
        /* ── COLUNAS DE PLANEJAMENTO ──────────────────────────────── */
        <>
          {/* Peso % */}
          <td className="px-3 py-2.5 text-center">
            {isFolha && editando && perm.editarCronograma && !baselineCongelada ? (
              <input type="number" min="0" max="100" step="0.01"
                value={form.peso_percentual}
                onChange={e => setForm(f => ({ ...f, peso_percentual: e.target.value }))}
                className="w-16 text-center border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400"
              />
            ) : (
              <span className="text-xs text-slate-600">
                {item.peso_percentual != null ? `${Number(item.peso_percentual).toFixed(2)}%` : '—'}
              </span>
            )}
          </td>

          {/* Valor Orçado */}
          <td className="px-3 py-2.5 text-center">
            {isFolha && editando && perm.editarCronograma && !baselineCongelada ? (
              <input type="number" min="0" step="0.01"
                value={form.valor_orcado}
                onChange={e => setForm(f => ({ ...f, valor_orcado: e.target.value }))}
                placeholder="0"
                className="w-24 text-center border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400"
              />
            ) : (
              <span className="text-xs font-mono text-slate-600">
                {fmtValor(item.valor_orcado)}
              </span>
            )}
          </td>

          {/* % Realizado */}
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[40px]">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, pctReal)}%`,
                    backgroundColor: pctReal >= 100 ? '#16a34a' : pctReal >= 50 ? '#2563eb' : '#233772',
                  }} />
              </div>
              <span className="text-xs text-slate-600 flex-shrink-0">{Number(pctReal).toFixed(0)}%</span>
            </div>
          </td>

          {/* Status execução (somente leitura no modo planejamento) */}
          <td className="px-3 py-2.5 text-center">
            {isFolha ? (() => {
              const st  = item.status_execucao || 'nao_iniciada'
              const cfg = {
                nao_iniciada: { label: 'Não iniciada', bg: '#f1f5f9', cor: '#94a3b8' },
                em_andamento: { label: 'Em andamento', bg: '#eff6ff', cor: '#2563eb' },
                concluida:    { label: 'Concluída',    bg: '#f0fdf4', cor: '#16a34a' },
                atrasada:     { label: 'Atrasada',     bg: '#fef2f2', cor: '#dc2626' },
                pausada:      { label: 'Pausada',      bg: '#fffbeb', cor: '#d97706' },
              }[st] || { label: st, bg: '#f1f5f9', cor: '#94a3b8' }
              return (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
                  style={{ backgroundColor: cfg.bg, color: cfg.cor }}>
                  {cfg.label}
                </span>
              )
            })() : <span className="text-slate-200 text-xs">—</span>}
          </td>

          {/* CPM — Aldo Dórea Mattos: FT=0 → crítico */}
          <td className="px-3 py-2.5 text-center">
            {isFolha ? (
              item.is_critica
                ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 whitespace-nowrap">⚑ Crítico</span>
                : <span className="text-[10px] text-slate-400">
                    {item.folga_total != null ? `+${item.folga_total}d` : '—'}
                  </span>
            ) : <span className="text-slate-200 text-xs">—</span>}
          </td>
        </>
      )}

      {/* Ações: reordenar (↑↓) + excluir */}
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-0.5">
          {podeMover && (
            <>
              <button
                onClick={onMoverCima}
                disabled={ehPrimeiro}
                title="Mover para cima"
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                <ChevronUp size={13} />
              </button>
              <button
                onClick={onMoverBaixo}
                disabled={ehUltimo}
                title="Mover para baixo"
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                <ChevronDown size={13} />
              </button>
              <button
                onClick={() => onExcluir(item.id, item.nome)}
                title="Excluir item"
                className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors ml-1">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
