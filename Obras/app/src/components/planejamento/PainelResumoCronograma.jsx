import React, { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react'
import { COR_TIPO } from '../../lib/planejamento/parseEAP'

// ─── Helpers de formatação ───────────────────────────────────────────────────

function fmtPct(v) {
  return `${Number(v || 0).toFixed(1)}%`
}

function fmtMoeda(v) {
  const n = Number(v || 0)
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `R$ ${(n / 1_000).toFixed(0)}k`
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
}

// ─── Cálculos client-side ────────────────────────────────────────────────────

/**
 * Calcula % físico realizado ponderado pelos pesos dos Serviços.
 */
function calcFisicoRealizado(eap) {
  const servicos   = eap.filter(i => i.tipo === 'S' && i.peso_percentual)
  const totalPeso  = servicos.reduce((s, i) => s + (Number(i.peso_percentual) || 0), 0)
  if (!totalPeso) return 0

  const realizado = servicos.reduce((s, i) =>
    s + (Number(i.peso_percentual) || 0) * (Number(i.peso_realizado_agregado) || 0) / 100
  , 0)

  return Math.round(realizado / totalPeso * 1000) / 10 // 1 casa decimal
}

/**
 * Calcula % físico previsto com base na posição da data de hoje
 * interpolando linearmente dentro do período previsto de cada Serviço.
 */
function calcFisicoPrevisto(eap) {
  const hoje      = new Date().toISOString().slice(0, 10)
  const servicos  = eap.filter(i => i.tipo === 'S' && i.peso_percentual)
  const totalPeso = servicos.reduce((s, i) => s + (Number(i.peso_percentual) || 0), 0)
  if (!totalPeso) return 0

  let previstoPonderado = 0
  for (const s of servicos) {
    const peso = Number(s.peso_percentual) || 0

    // Usa datas previstas; se ausentes, cai para baseline
    const ini_str = s.data_inicio_prevista || s.data_inicio_baseline
    const fim_str = s.data_fim_prevista    || s.data_fim_baseline
    if (!ini_str || !fim_str) continue

    let fracao = 0
    if (hoje >= fim_str) {
      fracao = 1
    } else if (hoje >= ini_str) {
      const ini     = new Date(ini_str + 'T12:00:00')
      const fim     = new Date(fim_str + 'T12:00:00')
      const cur     = new Date(hoje    + 'T12:00:00')
      const duracao = Math.max(1, (fim - ini) / 86_400_000)
      fracao = Math.min(1, (cur - ini) / 86_400_000 / duracao)
    }
    previstoPonderado += peso * fracao
  }

  return Math.round(previstoPonderado / totalPeso * 1000) / 10
}

/**
 * Constrói lista de Etapas (tipo E) com % realizado agregado dos seus Serviços.
 */
function calcStatusPorEtapa(eap) {
  const etapas = eap.filter(i => i.tipo === 'E')

  return etapas.map(etapa => {
    // Todos os Serviços descendentes desta Etapa
    const codigoEtapa = etapa.codigo + '.'
    const servicos    = eap.filter(i => i.tipo === 'S' && i.codigo.startsWith(codigoEtapa) && i.peso_percentual)
    const totalPeso   = servicos.reduce((s, i) => s + (Number(i.peso_percentual) || 0), 0)

    let pctReal = 0
    if (totalPeso > 0) {
      const realizado = servicos.reduce((s, i) =>
        s + (Number(i.peso_percentual) || 0) * (Number(i.peso_realizado_agregado) || 0) / 100
      , 0)
      pctReal = Math.round(realizado / totalPeso * 10) / 10
    }

    // Contar status dos serviços
    const contagens = { concluida: 0, em_andamento: 0, atrasada: 0, nao_iniciada: 0 }
    for (const s of servicos) {
      const st = s.status_execucao || 'nao_iniciada'
      if (contagens[st] !== undefined) contagens[st]++
      else contagens.nao_iniciada++
    }

    return { ...etapa, pctReal, totalServicos: servicos.length, contagens }
  })
}

// ─── Componente KPI card ─────────────────────────────────────────────────────

function KpiCard({ label, value, sub, cor, trend }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendCor  = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#94a3b8'

  return (
    <div className="bg-slate-50 rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide truncate">{label}</span>
        {trend && <TrendIcon size={12} style={{ color: trendCor, flexShrink: 0 }} />}
      </div>
      <div className="text-xl font-bold font-mono leading-tight" style={{ color: cor || '#1e293b' }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

/**
 * PainelResumoCronograma
 *
 * Painel colapsável com KPIs e status por Etapa, calculados client-side a partir
 * do array `eap`. Não faz chamadas ao Supabase.
 *
 * Props:
 *   eap       - array normalizado de itens EAP (já mesclado com atividades)
 *   aberto    - se o painel está expandido
 *   onToggle  - callback para fechar/abrir
 */
export default function PainelResumoCronograma({ eap, aberto, onToggle }) {
  const fisicoReal     = useMemo(() => calcFisicoRealizado(eap),    [eap])
  const fisicoPrevisto = useMemo(() => calcFisicoPrevisto(eap),     [eap])
  const etapas         = useMemo(() => calcStatusPorEtapa(eap),     [eap])

  const servicos   = eap.filter(i => i.tipo === 'S')
  const concluidos = servicos.filter(i => i.status_execucao === 'concluida').length
  const atrasados  = servicos.filter(i => i.status_execucao === 'atrasada').length
  const valorTotal = eap.filter(i => i.tipo === 'S').reduce((s, i) => s + (Number(i.valor_orcado) || 0), 0)

  // Sinaleiro: real vs previsto
  const delta = fisicoReal - fisicoPrevisto
  const trendReal = delta > 1 ? 'up' : delta < -1 ? 'down' : null

  // Cor da barra de progresso por % realizado
  function corBarra(pct) {
    if (pct >= 100) return '#16a34a'
    if (pct >= 60)  return '#2563eb'
    if (pct >= 30)  return '#d97706'
    return '#233772'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

      {/* Header clicável */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2">
          {aberto ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Resumo da Obra
          </span>
          {!aberto && (
            <span className="text-xs text-slate-400 ml-2">
              {fmtPct(fisicoReal)} real · {fmtPct(fisicoPrevisto)} previsto · {concluidos}/{servicos.length} serviços concluídos
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {atrasados > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {atrasados} atrasado{atrasados > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {/* Corpo colapsável */}
      {aberto && (
        <div className="border-t border-slate-100 p-4 space-y-4">

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Físico Realizado"
              value={fmtPct(fisicoReal)}
              cor={fisicoReal >= fisicoPrevisto ? '#16a34a' : '#dc2626'}
              trend={trendReal}
            />
            <KpiCard
              label="Físico Previsto"
              value={fmtPct(fisicoPrevisto)}
              cor="#233772"
            />
            <KpiCard
              label="Serviços"
              value={`${concluidos}/${servicos.length}`}
              sub={`${atrasados > 0 ? atrasados + ' atrasado(s)' : 'sem atrasos'}`}
              cor={atrasados > 0 ? '#dc2626' : '#16a34a'}
            />
            <KpiCard
              label="Valor Orçado"
              value={fmtMoeda(valorTotal)}
              cor="#233772"
            />
          </div>

          {/* Barra comparativa real vs previsto */}
          {(fisicoReal > 0 || fisicoPrevisto > 0) && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>Avanço Físico</span>
                <span className="font-mono" style={{ color: delta >= 0 ? '#16a34a' : '#dc2626' }}>
                  {delta >= 0 ? '+' : ''}{fmtPct(delta)} vs previsto
                </span>
              </div>
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                {/* Barra previsto (fundo) */}
                <div className="absolute inset-y-0 left-0 rounded-full bg-slate-300 transition-all"
                  style={{ width: `${Math.min(100, fisicoPrevisto)}%` }} />
                {/* Barra realizado (frente) */}
                <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, fisicoReal)}%`,
                    backgroundColor: fisicoReal >= fisicoPrevisto ? '#16a34a' : '#233772',
                  }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Status por Etapa */}
          {etapas.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Status por Etapa
              </div>
              <div className="space-y-2">
                {etapas.map(etapa => (
                  <div key={etapa.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
                          style={{ backgroundColor: COR_TIPO['E'] + '20', color: COR_TIPO['E'] }}>
                          E
                        </span>
                        <span className="text-xs font-mono text-slate-400 flex-shrink-0">{etapa.codigo}</span>
                        <span className="text-xs text-slate-700 truncate">{etapa.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {etapa.contagens.atrasada > 0 && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                            {etapa.contagens.atrasada}↓
                          </span>
                        )}
                        <span className="text-xs font-mono font-semibold"
                          style={{ color: corBarra(etapa.pctReal) }}>
                          {fmtPct(etapa.pctReal)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, etapa.pctReal)}%`,
                          backgroundColor: corBarra(etapa.pctReal),
                        }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado vazio */}
          {servicos.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">
              Nenhum serviço encontrado na EAP.
            </p>
          )}

        </div>
      )}
    </div>
  )
}
