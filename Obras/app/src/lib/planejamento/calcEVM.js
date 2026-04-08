// ============================================================================
// lib/planejamento/calcEVM.js
// Cálculos de Earned Value Management — SPEC-PLN-002-2026
// VP (BCWS), VA (BCWP), CR (ACWP), IDC, IDP, ONT, PPC
// Funções puras e testáveis isoladamente
// ============================================================================

/**
 * calcVP(atividades, dataReferencia)
 * Valor Previsto (Planned Value / BCWS)
 * Soma dos pesos × % planejado acumulado até dataReferencia
 *
 * atividades: [{ peso_percentual, data_inicio_prevista, data_fim_prevista, duracao_dias }]
 */
export function calcVP(atividades, dataReferencia) {
  const dataRef = new Date(dataReferencia)
  let vp = 0

  for (const a of atividades) {
    if (!a.data_inicio_prevista || !a.data_fim_prevista) continue
    const peso = Number(a.peso_percentual || 0)
    const inicio = new Date(a.data_inicio_prevista)
    const fim = new Date(a.data_fim_prevista)
    const durTotal = Math.max(1, (fim - inicio) / 86400000) // dias

    if (dataRef <= inicio) {
      // Ainda não começou
      vp += 0
    } else if (dataRef >= fim) {
      // Já deveria ter terminado
      vp += peso
    } else {
      // Em progresso: prorata linear
      const diasDecorridos = (dataRef - inicio) / 86400000
      vp += peso * (diasDecorridos / durTotal)
    }
  }

  return Math.min(100, vp)
}

/**
 * calcVA(atividades)
 * Valor Agregado (Earned Value / BCWP)
 * Soma dos pesos × % realizado atual
 *
 * atividades: [{ peso_percentual, peso_realizado_perc }]
 */
export function calcVA(atividades) {
  let va = 0
  for (const a of atividades) {
    const peso = Number(a.peso_percentual || 0)
    const realizado = Number(a.peso_realizado_perc || 0) / 100
    va += peso * realizado
  }
  return Math.min(100, va)
}

/**
 * calcIDC(va, cr)
 * Índice de Desempenho de Custo = VA / CR
 * > 1: abaixo do custo, < 1: acima do custo
 */
export function calcIDC(va, cr) {
  if (!cr || cr === 0) return null
  return va / cr
}

/**
 * calcIDP(va, vp)
 * Índice de Desempenho de Prazo = VA / VP
 * > 1: adiantado, < 1: atrasado
 */
export function calcIDP(va, vp) {
  if (!vp || vp === 0) return null
  return va / vp
}

/**
 * calcONT(orcamentoTotal, idc)
 * Orçamento na Tendência = Orçamento Total / IDC
 * Projeção do custo final se o desempenho atual continuar
 */
export function calcONT(orcamentoTotal, idc) {
  if (!idc || idc === 0) return null
  return orcamentoTotal / idc
}

/**
 * calcPPC(tarefasPlanejadas, tarefasConcluidas)
 * Percentual do Plano Concluído
 * % de tarefas planejadas que foram efetivamente concluídas na semana
 */
export function calcPPC(tarefasPlanejadas, tarefasConcluidas) {
  if (!tarefasPlanejadas || tarefasPlanejadas === 0) return null
  return (tarefasConcluidas / tarefasPlanejadas) * 100
}

/**
 * calcDesvios(va, vp, cr)
 * CV = VA - CR (Desvio de Custo — positivo = economia)
 * SV = VA - VP (Desvio de Prazo — positivo = adiantado)
 */
export function calcDesvios(va, vp, cr) {
  return {
    cv: cr !== null ? va - cr : null,
    sv: vp !== null ? va - vp : null,
  }
}

/**
 * interpretarEVM({ idc, idp, ont, orcamentoTotal, dataFimPrevista })
 * Retorna texto de interpretação automática para cada indicador
 */
export function interpretarEVM({ idc, idp, ont, orcamentoTotal, dataFimPrevista }) {
  const msgs = []

  if (idc !== null) {
    if (idc < 0.9) {
      const extra = ont && orcamentoTotal ? `Estimativa final: R$ ${ont.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : ''
      msgs.push({ tipo: 'danger', msg: `IDC ${idc.toFixed(3)} — Custo acima do previsto. ${extra}` })
    } else if (idc < 1.0) {
      msgs.push({ tipo: 'warning', msg: `IDC ${idc.toFixed(3)} — Custo ligeiramente acima do orçado. Atenção.` })
    } else {
      msgs.push({ tipo: 'success', msg: `IDC ${idc.toFixed(3)} — Custo dentro do orçado.` })
    }
  }

  if (idp !== null) {
    if (idp < 0.9) {
      msgs.push({ tipo: 'danger', msg: `IDP ${idp.toFixed(3)} — Obra atrasada. Revisar cronograma.` })
    } else if (idp < 1.0) {
      msgs.push({ tipo: 'warning', msg: `IDP ${idp.toFixed(3)} — Leve atraso. Monitorar.` })
    } else {
      msgs.push({ tipo: 'success', msg: `IDP ${idp.toFixed(3)} — Dentro do prazo.` })
    }
  }

  if (idc !== null && idp !== null && idc >= 1.0 && idp >= 1.0) {
    msgs.push({ tipo: 'success', msg: 'Obra dentro do prazo e do custo. Continue monitorando semanalmente.' })
  }

  return msgs
}

/**
 * semaforo(valor, tipo)
 * tipo: 'idc' | 'idp'
 * Retorna { cor, bg, label, status }
 */
export function semaforoEVM(valor) {
  if (valor === null || valor === undefined) {
    return { cor: '#94a3b8', bg: '#f1f5f9', label: 'Sem dado', status: 'cinza' }
  }
  if (valor >= 1.0) return { cor: '#16a34a', bg: '#f0fdf4', label: 'OK', status: 'verde' }
  if (valor >= 0.9) return { cor: '#d97706', bg: '#fffbeb', label: 'Atenção', status: 'amarelo' }
  return { cor: '#dc2626', bg: '#fef2f2', label: 'Crítico', status: 'vermelho' }
}

/**
 * calcEVMCompleto(atividades, cr, orcamentoTotal, dataReferencia)
 * Calcula todos os indicadores EVM de uma vez
 */
export function calcEVMCompleto(atividades, cr = null, orcamentoTotal = 0, dataReferencia = new Date()) {
  const vp = calcVP(atividades, dataReferencia)
  const va = calcVA(atividades)
  const idc = calcIDC(va, cr)
  const idp = calcIDP(va, vp)
  const ont = orcamentoTotal > 0 ? calcONT(orcamentoTotal, idc) : null
  const { cv, sv } = calcDesvios(va, vp, cr)

  return { vp, va, cr, idc, idp, ont, cv, sv }
}
