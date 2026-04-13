// ============================================================================
// lib/planejamento/calcCPM.js
// Motor CPM com FS/SS/FF/SF + lag em dias úteis + datas reais (calendário)
// Passada direta → Passada reversa → Folga total → Caminho crítico
// ============================================================================

import { calcDataFim, calcDuracaoEmDiasUteis, feriadosAno } from './diasUteis.js'

// ─── Helpers de dias úteis ───────────────────────────────────────────────────

/**
 * addDiasUteis(dateStr, n)
 * Adiciona n dias úteis a uma data (n pode ser negativo).
 */
export function addDiasUteis(dateStr, n) {
  if (!dateStr) return null
  if (n === 0) return dateStr
  if (n > 0) return calcDataFim(dateStr, n)

  // n < 0 → retroceder
  const d = new Date(dateStr + 'T12:00:00')
  const feriados = new Set([
    ...feriadosAno(d.getFullYear()),
    ...feriadosAno(d.getFullYear() - 1),
  ])
  let restante = Math.abs(n)
  while (restante > 0) {
    d.setDate(d.getDate() - 1)
    const str = d.toISOString().split('T')[0]
    if (d.getDay() !== 0 && d.getDay() !== 6 && !feriados.has(str)) restante--
  }
  return d.toISOString().split('T')[0]
}

/**
 * Converte número de dia (0 = data do projeto) para string de data.
 * day=0 → proj, day=1 → próximo dia útil após proj, etc.
 */
function dayToDate(day, proj) {
  if (day <= 0) return proj
  return calcDataFim(proj, day) // adiciona `day` dias úteis ao proj
}

/**
 * Converte string de data para número de dia relativo ao proj.
 * proj='2026-01-05' (Mon), '2026-01-12' → 5
 */
function dateToDay(dateStr, proj) {
  if (!dateStr || dateStr <= proj) return 0
  return calcDuracaoEmDiasUteis(proj, dateStr)
}

// ─── Algoritmo CPM com FS/SS/FF/SF ──────────────────────────────────────────

/**
 * calcularCPMDatas(atividades, predecessoras, dataIniProjeto)
 *
 * @param {Array} atividades       [{ id, duracao_dias, data_inicio_prevista? }]
 * @param {Array} predecessoras    [{ atividade_id, predecessora_id, tipo, lag_dias }]
 * @param {string} dataIniProjeto  'YYYY-MM-DD' — âncora para atividades sem predecessoras
 *
 * @returns {Array} [{ id, data_inicio_prevista, data_fim_prevista, folga_total, is_critica }]
 *
 * Convenção de dia:
 *   ES = day 0 → data_inicio = proj
 *   EF = ES + dur (exclusivo) → data_fim = dayToDate(EF - 1, proj)
 *
 * Tipos:
 *   FS: B.ES = A.EF + lag
 *   SS: B.ES = A.ES + lag
 *   FF: B.EF = A.EF + lag  →  B.ES = B.EF - dur
 *   SF: B.EF = A.ES + lag  →  B.ES = B.EF - dur
 */
export function calcularCPMDatas(atividades, predecessoras = [], dataIniProjeto) {
  if (!atividades?.length) return []

  const proj = dataIniProjeto || new Date().toISOString().split('T')[0]

  // Monta mapa de nós
  const nodes = {}
  for (const a of atividades) {
    const dur = Math.max(1, Number(a.duracao_dias || 1))
    const esManual = a.data_inicio_prevista
      ? Math.max(0, dateToDay(a.data_inicio_prevista, proj))
      : null
    nodes[a.id] = { id: a.id, dur, esManual, ES: esManual ?? 0, EF: 0, LS: 0, LF: 0 }
  }

  // Mapas de predecessoras/sucessoras por atividade
  const predsOf = {}   // id → [{ id: predecessora_id, tipo, lag }]
  const succsOf = {}   // id → [{ id: atividade_id, tipo, lag, dur }]
  for (const p of predecessoras) {
    if (!nodes[p.atividade_id] || !nodes[p.predecessora_id]) continue
    const rel = { id: p.predecessora_id, tipo: p.tipo || 'FS', lag: p.lag_dias || 0 }
    const relS = { id: p.atividade_id, tipo: p.tipo || 'FS', lag: p.lag_dias || 0 }
    ;(predsOf[p.atividade_id] ??= []).push(rel)
    ;(succsOf[p.predecessora_id] ??= []).push(relS)
  }

  // Ordenação topológica (Kahn)
  const inDeg = {}
  const adj = {}
  for (const id of Object.keys(nodes)) {
    inDeg[id] = (predsOf[id] || []).length
    adj[id] = (succsOf[id] || []).map(s => s.id)
  }

  const queue = Object.keys(nodes).filter(id => !inDeg[id])
  const topo = []
  while (queue.length) {
    const cur = queue.shift()
    topo.push(cur)
    for (const nxt of adj[cur] || []) {
      if (--inDeg[nxt] === 0) queue.push(nxt)
    }
  }

  // ── Passada direta (Forward Pass) ────────────────────────────
  for (const id of topo) {
    const n = nodes[id]
    let esMin = n.esManual ?? 0
    let efMin = null // restrições FF/SF

    for (const pred of predsOf[id] || []) {
      const p = nodes[pred.id]
      if (!p) continue
      switch (pred.tipo) {
        case 'FS': esMin = Math.max(esMin, p.EF + pred.lag); break
        case 'SS': esMin = Math.max(esMin, p.ES + pred.lag); break
        case 'FF': efMin = efMin === null ? p.EF + pred.lag : Math.max(efMin, p.EF + pred.lag); break
        case 'SF': efMin = efMin === null ? p.ES + pred.lag : Math.max(efMin, p.ES + pred.lag); break
      }
    }

    // FF/SF pode forçar um ES mais tardio
    if (efMin !== null) esMin = Math.max(esMin, efMin - n.dur)

    n.ES = esMin
    n.EF = n.ES + n.dur
  }

  // ── Passada reversa (Backward Pass) ──────────────────────────
  const projDur = Math.max(...Object.values(nodes).map(n => n.EF), 1)

  for (const id of [...topo].reverse()) {
    const n = nodes[id]
    const succs = succsOf[id] || []

    if (!succs.length) {
      n.LF = projDur
    } else {
      let lfMin = Infinity
      for (const succ of succs) {
        const s = nodes[succ.id]
        if (!s) continue
        switch (succ.tipo) {
          case 'FS': lfMin = Math.min(lfMin, s.LS - succ.lag); break
          case 'SS': lfMin = Math.min(lfMin, s.LS - succ.lag + n.dur); break
          case 'FF': lfMin = Math.min(lfMin, s.LF - succ.lag); break
          case 'SF': lfMin = Math.min(lfMin, s.LF - s.dur - succ.lag + n.dur); break
        }
      }
      n.LF = lfMin === Infinity ? projDur : lfMin
    }

    n.LS = n.LF - n.dur
  }

  // ── Resultado em datas reais ──────────────────────────────────
  return topo.map(id => {
    const n = nodes[id]
    const tf = n.LS - n.ES
    return {
      id: n.id,
      data_inicio_prevista: dayToDate(n.ES, proj),
      data_fim_prevista:    dayToDate(Math.max(0, n.EF - 1), proj), // EF exclusivo → -1
      LS_data:              dayToDate(n.LS, proj),
      LF_data:              dayToDate(Math.max(0, n.LF - 1), proj),
      folga_total:          Math.max(0, tf),
      is_critica:           tf <= 0,
    }
  })
}

/**
 * aplicarCPMNoSupabase(planejamentoId, dataIniProjeto, supabaseClient)
 * Busca atividades + predecessoras, calcula CPM e salva no Supabase.
 */
export async function aplicarCPMNoSupabase(planejamentoId, dataIniProjeto, supabaseClient) {
  const { data: ativs, error: e1 } = await supabaseClient
    .from('planejamento_atividades')
    .select('id, duracao_dias, data_inicio_prevista')
    .eq('planejamento_id', planejamentoId)
  if (e1) throw e1
  if (!ativs?.length) return { criticas: 0, total: 0 }

  const { data: preds, error: e2 } = await supabaseClient
    .from('planejamento_predecessoras')
    .select('atividade_id, predecessora_id, tipo, lag_dias')
    .in('atividade_id', ativs.map(a => a.id))
  if (e2) throw e2

  const proj = dataIniProjeto
    || ativs.filter(a => a.data_inicio_prevista).sort((a, b) =>
        a.data_inicio_prevista.localeCompare(b.data_inicio_prevista)
       )[0]?.data_inicio_prevista
    || new Date().toISOString().split('T')[0]

  const resultado = calcularCPMDatas(ativs, preds || [], proj)

  await Promise.all(
    resultado.map(r =>
      supabaseClient
        .from('planejamento_atividades')
        .update({
          data_inicio_prevista: r.data_inicio_prevista,
          data_fim_prevista:    r.data_fim_prevista,
          folga_total:          r.folga_total,
          is_critica:           r.is_critica,
        })
        .eq('id', r.id)
    )
  )

  return {
    criticas: resultado.filter(r => r.is_critica).length,
    total: resultado.length,
  }
}

