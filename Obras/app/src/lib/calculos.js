// ============================================================
// CÁLCULOS EVM — Earned Value Management
// ERP Biasi Engenharia
// ============================================================

/**
 * Semáforos padrão Biasi
 * @param {string} indicador - 'idc' | 'idp' | 'desvioFisico' | 'ppc'
 * @param {number} valor
 * @returns {'verde'|'amarelo'|'vermelho'}
 */
export function semaforo(indicador, valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return 'vermelho'

  switch (indicador) {
    case 'idc':
      if (valor >= 1.0) return 'verde'
      if (valor >= 0.85) return 'amarelo'
      return 'vermelho'

    case 'idp':
      if (valor >= 0.95) return 'verde'
      if (valor >= 0.80) return 'amarelo'
      return 'vermelho'

    case 'desvioFisico':
      // desvio é realizado - previsto (negativo = atraso)
      const abs = Math.abs(valor)
      if (abs <= 2) return 'verde'
      if (abs <= 5) return 'amarelo'
      return 'vermelho'

    case 'ppc':
      if (valor >= 80) return 'verde'
      if (valor >= 60) return 'amarelo'
      return 'vermelho'

    default:
      return 'verde'
  }
}

/**
 * Retorna cor CSS de um semáforo
 */
export function corSemaforo(indicador, valor) {
  const s = semaforo(indicador, valor)
  return {
    verde: '#16a34a',
    amarelo: '#ca8a04',
    vermelho: '#dc2626',
  }[s]
}

/**
 * Retorna classes Tailwind para badges de semáforo
 */
export function classesSemaforo(indicador, valor) {
  const s = semaforo(indicador, valor)
  return {
    verde: 'bg-green-100 text-green-700 border border-green-200',
    amarelo: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    vermelho: 'bg-red-100 text-red-700 border border-red-200',
  }[s]
}

/**
 * Função genérica para calcular índices de desempenho
 * @param {Array} itens - [{valor_orcado, perc_previsto, perc_realizado}]
 * @param {number} fallback - valor retornado quando VP=0
 * @returns {number}
 * @private
 */
function _calcularIndice(itens, fallback = 1) {
  if (!itens || itens.length === 0) return 1

  let va = 0  // Valor Agregado (BCWP)
  let vp = 0  // Valor Planejado (BCWS)

  itens.forEach(item => {
    if (!item.valor_orcado) return
    const previsto = (item.perc_previsto || 0) / 100
    const realizado = (item.perc_realizado || 0) / 100
    va += item.valor_orcado * realizado
    vp += item.valor_orcado * previsto
  })

  if (vp === 0) return va > 0 ? fallback : 1
  return Math.round((va / vp) * 1000) / 1000
}

/**
 * IDC — Índice de Desempenho de Custo (CPI)
 * CPI = VA / CR (usando % para simplificar)
 * @param {Array} itens - [{valor_orcado, perc_previsto, perc_realizado}]
 * @returns {number}
 */
export function calcularIDC(itens) {
  return _calcularIndice(itens, 1.5)
}

/**
 * IDP — Índice de Desempenho de Prazo (SPI)
 * SPI = VA / VP
 * @param {Array} itens - [{valor_orcado, perc_previsto, perc_realizado}]
 * @returns {number}
 */
export function calcularIDP(itens) {
  return _calcularIndice(itens, 1.2)
}

/**
 * Desvio Físico em pontos percentuais
 * Positivo = adiantado, Negativo = atrasado
 */
export function calcularDesvioFisico(previsto, realizado) {
  return Math.round((realizado - previsto) * 10) / 10
}

/**
 * EAC — Estimativa para Concluir (Estimate at Completion)
 * EAC = BAC / CPI
 * @param {number} bac - Budget at Completion
 * @param {number} idc - IDC/CPI
 * @returns {number}
 */
export function calcularEAC(bac, idc) {
  if (!idc || idc === 0) return bac * 1.5
  return Math.round(bac / idc)
}

/**
 * VAC — Variação ao Término (Variance at Completion)
 * VAC = BAC - EAC (positivo = economia, negativo = estouro)
 */
export function calcularVAC(bac, eac) {
  return Math.round(bac - eac)
}

/**
 * TCPI — Índice de Desempenho para Término
 * Quanto precisa performar para finalizar no orçamento
 * TCPI = (BAC - VA) / (BAC - CR)
 */
export function calcularTCPI(bac, va, cr) {
  const denominador = bac - cr
  if (denominador === 0) return 1
  if (denominador < 0) return 0
  return Math.round(((bac - va) / denominador) * 1000) / 1000
}

/**
 * Gera dados para Curva S
 * @param {Array} folhas - itens EAP nível folha com valor_orcado
 * @param {Function} getCronograma - (itemId) => array[12] de % acumulado
 * @param {Function} getMedicao - (itemId) => { realizado }
 * @param {Array} periodos - array de labels dos períodos
 * @param {number} periodoAtual - índice do período atual (0-based)
 * @returns {Array} [{periodo, planejado_acum, realizado_acum, tendencia}]
 */
export function gerarCurvaS(folhas, getCronograma, getMedicao, periodos, periodoAtual) {
  if (!folhas || folhas.length === 0) return []

  const totalOrcado = folhas.reduce((sum, i) => sum + (i.valor_orcado || 0), 0)
  if (totalOrcado === 0) return []

  const resultado = []

  // Calcula realizado no período atual para projeção de tendência
  let realizadoAtualPercent = 0
  folhas.forEach(item => {
    const med = getMedicao(item.id)
    const realizado = (med.realizado || 0) / 100
    realizadoAtualPercent += (item.valor_orcado / totalOrcado) * realizado * 100
  })

  // Previsto no período final do projeto
  let previstoPeriodoAtualPercent = 0
  folhas.forEach(item => {
    const crono = getCronograma(item.id)
    const previsto = (crono[periodoAtual] || 0) / 100
    previstoPeriodoAtualPercent += (item.valor_orcado / totalOrcado) * previsto * 100
  })

  // Taxa de progresso diário baseada no realizado até agora
  const velocidadeRealizada = periodoAtual > 0
    ? realizadoAtualPercent / (periodoAtual + 1)
    : realizadoAtualPercent

  for (let p = 0; p < periodos.length; p++) {
    let planejado = 0
    let realizado = null
    let tendencia = null

    folhas.forEach(item => {
      const crono = getCronograma(item.id)
      const peso = item.valor_orcado / totalOrcado
      planejado += peso * (crono[p] || 0)
    })

    // Realizado só até o período atual
    if (p <= periodoAtual) {
      let realizadoAcum = 0
      folhas.forEach(item => {
        // Usa a medição atual como proxy (simplificação)
        const med = getMedicao(item.id)
        const peso = item.valor_orcado / totalOrcado
        // Interpola entre 0 e o realizado atual
        const fator = p / Math.max(periodoAtual, 1)
        const crono = getCronograma(item.id)
        // realizado no período p = min(realizado_atual, proporcional ao planejado)
        const realizadoEstimado = Math.min(
          (med.realizado || 0),
          crono[p] * (1 + (realizadoAtualPercent - previstoPeriodoAtualPercent) / Math.max(previstoPeriodoAtualPercent, 1))
        )
        realizadoAcum += peso * Math.max(0, realizadoEstimado)
      })

      // Para o período atual, usa o valor real
      if (p === periodoAtual) {
        realizadoAcum = realizadoAtualPercent
      }
      realizado = Math.round(realizadoAcum * 10) / 10
    }

    // Tendência: projeção linear a partir do realizado atual
    if (p >= periodoAtual) {
      const periodosRestantes = periodos.length - 1 - periodoAtual
      if (periodosRestantes > 0) {
        const incrementoPorPeriodo = (100 - realizadoAtualPercent) / periodosRestantes
        tendencia = Math.min(100, Math.round((realizadoAtualPercent + incrementoPorPeriodo * (p - periodoAtual)) * 10) / 10)
      } else {
        tendencia = realizadoAtualPercent
      }
    }

    resultado.push({
      periodo: periodos[p].label,
      planejado: Math.round(planejado * 10) / 10,
      realizado,
      tendencia,
    })
  }

  return resultado
}

/**
 * Formata valor em Real Brasileiro
 * @param {number} valor
 * @returns {string} Ex: "R$ 1.234.567,89"
 */
export function formatarMoeda(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return 'R$ —'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

/**
 * Formata percentual com 1 casa decimal
 */
export function formatarPercent(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return '—'
  return `${Number(valor).toFixed(1)}%`
}

/**
 * Retorna label legível do status de atividade
 */
export function labelStatus(status) {
  const labels = {
    'CRITICO': 'Crítico (FT=0)',
    'IMPEDIMENTO_CIVIL': 'Impedimento Civil',
    'PENDENCIA_INFRA': 'Pendência Infra',
    'LIBERADO': 'Liberado',
    'EM_ANDAMENTO': 'Em Andamento',
    'CONCLUIDO': 'Concluído',
  }
  return labels[status] || status
}

/**
 * Retorna classe de cor para status de atividade
 */
export function classesStatusAtividade(status) {
  const classes = {
    'CRITICO': 'bg-red-100 text-red-800 border border-red-200',
    'IMPEDIMENTO_CIVIL': 'bg-orange-100 text-orange-800 border border-orange-200',
    'PENDENCIA_INFRA': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    'LIBERADO': 'bg-blue-100 text-blue-800 border border-blue-200',
    'EM_ANDAMENTO': 'bg-cyan-100 text-cyan-800 border border-cyan-200',
    'CONCLUIDO': 'bg-green-100 text-green-800 border border-green-200',
  }
  return classes[status] || 'bg-slate-100 text-slate-700'
}

/**
 * Determina status geral da obra com base no IDP
 */
export function statusGeralObra(idp) {
  const s = semaforo('idp', idp)
  const labels = { verde: 'No Prazo', amarelo: 'Em Atenção', vermelho: 'Em Atraso' }
  return { semaforo: s, label: labels[s] }
}

/**
 * Calcula resumo financeiro de uma obra a partir de contratos e medições reais
 * @param {Array} contratos - contratos da obra
 * @param {Array} medicoes - medicoes_contrato da obra
 * @returns {Object}
 */
export function calcularResumoFinanceiroObra(contratos, medicoes) {
  const totalContratado = contratos.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
  const totalMaoObra = contratos.reduce((s, c) => s + (parseFloat(c.valor_mao_obra) || 0), 0)
  const totalMaterial = contratos.reduce((s, c) => s + (parseFloat(c.valor_material) || 0), 0)
  const totalMedido = medicoes.reduce((s, m) => s + (parseFloat(m.valor_liquido) || 0), 0)
  const totalPendente = totalContratado - totalMedido
  const percMedido = totalContratado > 0 ? (totalMedido / totalContratado) * 100 : 0
  return { totalContratado, totalMedido, totalPendente, percMedido, totalMaoObra, totalMaterial }
}

/**
 * Agrupa medições de contrato por mês para gráficos de evolução
 * @param {Array} medicoes - array de medicoes_contrato
 * @returns {Array} [{mes, label, valor, acumulado}]
 */
export function calcularEvolucaoMensal(medicoes) {
  const porMes = {}
  medicoes.forEach(m => {
    if (!m.data_medicao) return
    const key = m.data_medicao.substring(0, 7) // YYYY-MM
    porMes[key] = (porMes[key] || 0) + (parseFloat(m.valor_liquido) || 0)
  })
  const meses = Object.keys(porMes).sort()
  let acumulado = 0
  return meses.map(mes => {
    acumulado += porMes[mes]
    const [y, m] = mes.split('-')
    const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    return { mes, label, valor: porMes[mes], acumulado }
  })
}

/**
 * Calcula PPC simulado (Percentual de Planejamento Concluído)
 * Base: % de itens que atingiram o previsto no período
 */
export function calcularPPC(folhas, getCronograma, getMedicao, periodoAtual) {
  if (!folhas || folhas.length === 0) return 0
  const ativos = folhas.filter(i => {
    const crono = getCronograma(i.id)
    return (crono[periodoAtual] || 0) > 0
  })
  if (ativos.length === 0) return 100
  const concluidos = ativos.filter(i => {
    const crono = getCronograma(i.id)
    const med = getMedicao(i.id)
    return (med.realizado || 0) >= (crono[periodoAtual] || 0)
  })
  return Math.round((concluidos.length / ativos.length) * 100)
}
