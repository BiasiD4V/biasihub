// ============================================================================
// lib/planejamento/diasUteis.js
// Calcula data fim dado data início + duração em dias úteis (seg–sex)
// Exclui feriados nacionais brasileiros (fixos + móveis via fórmula de Gauss)
// ============================================================================

/**
 * Calcula feriados nacionais para um dado ano.
 * Inclui feriados fixos e os móveis baseados na Páscoa.
 */
export function feriadosAno(ano) {
  // Feriados fixos
  const fixos = [
    `${ano}-01-01`, // Confraternização Universal
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência
    `${ano}-10-12`, // N. Sra. Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-12-25`, // Natal
  ]

  // Páscoa (algoritmo de Meeus/Jones/Butcher)
  const pascoa = calcPascoa(ano)
  const moveis = [
    addDias(pascoa, -48), // Carnaval (seg)
    addDias(pascoa, -47), // Carnaval (ter)
    addDias(pascoa, -2),  // Sexta-feira Santa
    pascoa,               // Páscoa
    addDias(pascoa, 60),  // Corpus Christi
  ]

  return new Set([...fixos, ...moveis.map(d => d.toISOString().split('T')[0])])
}

function calcPascoa(ano) {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

function addDias(data, dias) {
  const d = new Date(data)
  d.setDate(d.getDate() + dias)
  return d
}

/**
 * ehDiaUtil(data, feriados)
 */
export function ehDiaUtil(data, feriados) {
  const d = new Date(data)
  const diaSemana = d.getDay() // 0 = dom, 6 = sab
  if (diaSemana === 0 || diaSemana === 6) return false
  const str = d.toISOString().split('T')[0]
  return !feriados.has(str)
}

/**
 * calcDataFim(dataInicio, duracaoDias)
 * Retorna a data fim considerando apenas dias úteis.
 * duracaoDias = número de dias úteis a adicionar.
 */
export function calcDataFim(dataInicio, duracaoDias) {
  if (!dataInicio || !duracaoDias) return null
  const inicio = new Date(dataInicio + 'T12:00:00')
  const feriados = feriadosAno(inicio.getFullYear())
  // Incluir feriados do próximo ano também (obras longas)
  const feriadosProxAno = feriadosAno(inicio.getFullYear() + 1)
  const todosFeriados = new Set([...feriados, ...feriadosProxAno])

  let atual = new Date(inicio)
  let diasContados = 0

  while (diasContados < duracaoDias) {
    atual.setDate(atual.getDate() + 1)
    if (ehDiaUtil(atual, todosFeriados)) diasContados++
  }

  return atual.toISOString().split('T')[0]
}

/**
 * calcDuracaoEmDiasUteis(dataInicio, dataFim)
 * Calcula quantos dias úteis há entre duas datas.
 */
export function calcDuracaoEmDiasUteis(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return 0
  const inicio = new Date(dataInicio + 'T12:00:00')
  const fim = new Date(dataFim + 'T12:00:00')
  const feriados = feriadosAno(inicio.getFullYear())
  const feriadosProxAno = feriadosAno(fim.getFullYear())
  const todosFeriados = new Set([...feriados, ...feriadosProxAno])

  let atual = new Date(inicio)
  let count = 0
  while (atual < fim) {
    atual.setDate(atual.getDate() + 1)
    if (ehDiaUtil(atual, todosFeriados)) count++
  }
  return count
}

/**
 * semanaRef(data)
 * Retorna a data da segunda-feira da semana da data informada (formato YYYY-MM-DD)
 */
export function semanaRef(data = new Date()) {
  const d = new Date(data)
  const dia = d.getDay() // 0 = dom
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

/**
 * formatarSemana(dataSegunda)
 * Ex: "2026-03-30" → "Semana 14 · 30/mar – 03/abr/2026"
 */
export function formatarSemana(dataSegunda) {
  const d = new Date(dataSegunda + 'T12:00:00')
  const sexta = new Date(d)
  sexta.setDate(d.getDate() + 4)

  const semana = Math.ceil(
    ((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + 1) / 7
  )

  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  const ini = `${String(d.getDate()).padStart(2,'0')}/${meses[d.getMonth()]}`
  const fim = `${String(sexta.getDate()).padStart(2,'0')}/${meses[sexta.getMonth()]}/${sexta.getFullYear()}`

  return `Semana ${semana} · ${ini} – ${fim}`
}
