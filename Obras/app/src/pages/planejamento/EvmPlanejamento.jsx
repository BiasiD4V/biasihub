// ============================================================================
// pages/planejamento/EvmPlanejamento.jsx
// EVM completo: IDC, IDP, ONT, PPC com semáforo RAG + histórico + interpretação
// SPEC-PLN-002-2026 — Etapa 11
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useObra } from '../../context/ObraContext'
import { usePermissoes } from '../../hooks/usePermissoes'
import {
  calcEVMCompleto, interpretarEVM, semaforoEVM,
  calcVP, calcVA, calcPPC,
} from '../../lib/planejamento/calcEVM'
import { semanaRef, formatarSemana } from '../../lib/planejamento/diasUteis'
import { AlertTriangle, Gauge, TrendingUp, CheckCircle, XCircle, Info, DollarSign } from 'lucide-react'

// ─── Tooltip customizado ──────────────────────────────────────────────────────
function TooltipEVM({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const nomes = { idc: 'IDC', idp: 'IDP', meta: 'Meta (1,0)' }
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-600">{nomes[entry.dataKey] || entry.name}:</span>
          <span className="font-medium">{Number(entry.value).toFixed(3)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Card semáforo RAG ────────────────────────────────────────────────────────
function CardSemaforo({ label, valor, descricao, formato = 'indice' }) {
  const sem = semaforoEVM(valor)
  const formatado = valor === null
    ? '—'
    : formato === 'moeda'
      ? `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : formato === 'percent'
        ? `${valor.toFixed(1)}%`
        : valor.toFixed(3)

  return (
    <div className="bg-white rounded-xl border p-5 flex flex-col gap-2" style={{ borderColor: sem.cor + '60' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ color: sem.cor, backgroundColor: sem.bg }}
        >
          {sem.label}
        </span>
      </div>
      <p className="text-3xl font-bold" style={{ color: sem.cor }}>{formatado}</p>
      {descricao && <p className="text-xs text-slate-400">{descricao}</p>}
    </div>
  )
}

// ─── Mensagem interpretação ───────────────────────────────────────────────────
function MensagemEVM({ tipo, msg }) {
  const estilos = {
    danger:  { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    icon: XCircle,     cor: '#dc2626' },
    warning: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  icon: AlertTriangle, cor: '#d97706' },
    success: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  icon: CheckCircle, cor: '#16a34a' },
  }
  const e = estilos[tipo] || estilos.success
  const Icon = e.icon
  return (
    <div className={`flex items-start gap-3 rounded-lg px-4 py-3 border ${e.bg} ${e.border}`}>
      <Icon size={16} className="mt-0.5 flex-shrink-0" style={{ color: e.cor }} />
      <span className={`text-sm ${e.text}`}>{msg}</span>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function EvmPlanejamento() {
  const { obraSelecionadaId, obraAtual, planejamentoId: planejamentoIdCtx } = useObra()
  const perm = usePermissoes()

  const [planejamentos,   setPlanejamentos]   = useState([])
  const [planejamentoId,  setPlanejamentoId]  = useState(null)
  const [atividades,      setAtividades]      = useState([])
  const [snapshots,       setSnapshots]       = useState([])
  const [cr,              setCr]              = useState(null)
  const [crManual,        setCrManual]        = useState('')
  const [orcamentoTotal,  setOrcamentoTotal]  = useState(0)
  const [loading,         setLoading]         = useState(true)
  const [erro,            setErro]            = useState(null)
  const [salvandoSnap,    setSalvandoSnap]    = useState(false)

  const hojeRef = semanaRef(new Date())

  // ── Carregar lista de versões (para dropdown) ──────────────────────────────
  useEffect(() => {
    if (!obraSelecionadaId) { setLoading(false); return }
    setLoading(true)
    setErro(null)

    supabase
      .from('obra_planejamentos')
      .select('id, versao, status, data_base_assinada')
      .eq('obra_id', obraSelecionadaId)
      .order('versao', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setErro(error.message); setLoading(false); return }
        setPlanejamentos(data || [])
        setPlanejamentoId(planejamentoIdCtx || data?.[0]?.id || null)
        if (!planejamentoIdCtx && !data?.[0]) setLoading(false)
      })
  }, [obraSelecionadaId, planejamentoIdCtx])

  // ── Carregar dados quando planejamento muda ────────────────────────────────
  useEffect(() => {
    if (!planejamentoId) return

    const carregar = async () => {
      setLoading(true)
      setErro(null)
      try {
        // Atividades com peso e datas
        const { data: atvsData, error: atvsErr } = await supabase
          .from('planejamento_atividades')
          .select('id, peso_percentual, perc_realizado, data_inicio_prevista, data_fim_prevista')
          .eq('planejamento_id', planejamentoId)
        if (atvsErr) throw atvsErr
        setAtividades(atvsData || [])

        // Snapshots históricos
        const { data: snapData } = await supabase
          .from('evm_snapshots')
          .select('semana_ref, vp, va, cr, idc, idp, ont, ppc')
          .eq('planejamento_id', planejamentoId)
          .order('semana_ref')
        setSnapshots(snapData || [])

        // Orçamento da obra (BAC) — buscar de orcamentos_sienge se disponível
        const { data: orcData } = await supabase
          .from('orcamentos_sienge')
          .select('valor_orcado')
          .eq('obra_id', obraSelecionadaId)
          .limit(1)
        const bac = orcData?.[0]?.valor_orcado || 0
        setOrcamentoTotal(Number(bac))

        // CR atual: pegar do snapshot mais recente ou do user input
        const ultSnap = (snapData || []).slice(-1)[0]
        if (ultSnap?.cr) {
          setCr(Number(ultSnap.cr))
          setCrManual(String(ultSnap.cr))
        }
      } catch (e) {
        setErro(e.message)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [planejamentoId, obraSelecionadaId])

  // ── EVM atual ───────────────────────────────────────────────────────────────
  const evmAtual = useMemo(() => {
    if (!atividades.length) return null
    const crVal = cr || (crManual ? Number(crManual.replace(',', '.')) : null)
    return calcEVMCompleto(atividades, crVal, orcamentoTotal, new Date())
  }, [atividades, cr, crManual, orcamentoTotal])

  const mensagens = useMemo(() => {
    if (!evmAtual) return []
    return interpretarEVM({
      idc: evmAtual.idc,
      idp: evmAtual.idp,
      ont: evmAtual.ont,
      orcamentoTotal,
      dataFimPrevista: null,
    })
  }, [evmAtual, orcamentoTotal])

  // ── Dados histórico para gráfico ────────────────────────────────────────────
  const dadosHistorico = useMemo(() => {
    return snapshots.map(s => ({
      semana: formatarSemana(s.semana_ref).replace(/Semana \d+ · /, ''),
      idc:    s.idc !== null ? +Number(s.idc).toFixed(3) : null,
      idp:    s.idp !== null ? +Number(s.idp).toFixed(3) : null,
      meta:   1.0,
    }))
  }, [snapshots])

  // ── Tabela histórica ─────────────────────────────────────────────────────────
  const tabelaHistorico = useMemo(() => {
    return snapshots.map(s => ({
      semana: formatarSemana(s.semana_ref),
      vp:     Number(s.vp || 0).toFixed(1),
      va:     Number(s.va || 0).toFixed(1),
      cr:     s.cr ? `R$ ${Number(s.cr).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—',
      idc:    s.idc !== null ? Number(s.idc).toFixed(3) : '—',
      idp:    s.idp !== null ? Number(s.idp).toFixed(3) : '—',
      ppc:    s.ppc !== null ? `${Number(s.ppc).toFixed(0)}%` : '—',
    }))
  }, [snapshots])

  // ── Salvar snapshot manual ───────────────────────────────────────────────────
  const handleSalvarSnapshot = async () => {
    if (!evmAtual || !planejamentoId) return
    setSalvandoSnap(true)
    try {
      const crVal = Number((crManual || '0').replace(',', '.')) || null
      const { error } = await supabase
        .from('evm_snapshots')
        .upsert({
          planejamento_id: planejamentoId,
          semana_ref: hojeRef,
          vp:  evmAtual.vp,
          va:  evmAtual.va,
          cr:  crVal,
          idc: evmAtual.idc,
          idp: evmAtual.idp,
          ont: evmAtual.ont,
        }, { onConflict: 'planejamento_id,semana_ref' })

      if (error) throw error

      // Atualizar lista local
      setSnapshots(prev => {
        const sem = prev.find(s => s.semana_ref === hojeRef)
        const novo = {
          semana_ref: hojeRef,
          vp: evmAtual.vp, va: evmAtual.va, cr: crVal,
          idc: evmAtual.idc, idp: evmAtual.idp, ont: evmAtual.ont, ppc: null,
        }
        return sem
          ? prev.map(s => s.semana_ref === hojeRef ? novo : s)
          : [...prev, novo].sort((a, b) => a.semana_ref.localeCompare(b.semana_ref))
      })
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvandoSnap(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (!obraSelecionadaId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <Gauge size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Selecione uma obra no cabeçalho</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Desempenho EVM</h1>
          <p className="text-sm text-slate-500 mt-1">
            Earned Value Management — IDC · IDP · ONT · PPC
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {planejamentos.length > 1 && (
            <select
              value={planejamentoId || ''}
              onChange={e => setPlanejamentoId(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {planejamentos.map(p => (
                <option key={p.id} value={p.id}>
                  V.{String(p.versao).padStart(2,'0')} — {p.status}
                </option>
              ))}
            </select>
          )}

          {perm.lancarCR && (
            <button
              onClick={handleSalvarSnapshot}
              disabled={salvandoSnap || !evmAtual}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {salvandoSnap ? 'Salvando...' : 'Salvar Snapshot'}
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          <AlertTriangle size={18} />
          <span className="text-sm">{erro}</span>
        </div>
      )}

      {/* Input CR (Custo Real) */}
      {perm.lancarCR && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Custo Real (CR / ACWP):</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">R$</span>
            <input
              type="text"
              value={crManual}
              onChange={e => {
                setCrManual(e.target.value)
                const v = Number(e.target.value.replace(',', '.'))
                if (!isNaN(v) && v > 0) setCr(v)
              }}
              placeholder="Ex: 450000"
              className="w-40 border border-amber-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <p className="text-xs text-amber-600">
            Informe o custo real acumulado até hoje para calcular IDC e ONT.
          </p>
        </div>
      )}

      {/* Cards semáforo RAG */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      ) : evmAtual ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <CardSemaforo
              label="VP (Planejado)"
              valor={evmAtual.vp}
              formato="percent"
              descricao="% físico previsto até hoje"
            />
            <CardSemaforo
              label="VA (Realizado)"
              valor={evmAtual.va}
              formato="percent"
              descricao="% físico efetivamente concluído"
            />
            <CardSemaforo
              label="IDC"
              valor={evmAtual.idc}
              descricao={evmAtual.idc !== null ? 'Desempenho de Custo (VA/CR)' : 'Informe o CR para calcular'}
            />
            <CardSemaforo
              label="IDP"
              valor={evmAtual.idp}
              descricao="Desempenho de Prazo (VA/VP)"
            />
            <CardSemaforo
              label="ONT"
              valor={evmAtual.ont}
              formato="moeda"
              descricao="Orçamento na Tendência"
            />
          </div>

          {/* Interpretação automática */}
          {mensagens.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Info size={15} />
                Interpretação automática
              </h2>
              {mensagens.map((m, i) => (
                <MensagemEVM key={i} tipo={m.tipo} msg={m.msg} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-32 text-slate-400">
          <p>Sem atividades cadastradas para calcular EVM</p>
        </div>
      )}

      {/* Gráfico histórico IDC/IDP */}
      {dadosHistorico.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-700" />
            <h2 className="font-semibold text-slate-800">Histórico IDC / IDP por Semana</h2>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosHistorico} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                domain={[0, 'auto']}
                tick={{ fontSize: 12, fill: '#64748b' }}
                width={45}
                tickFormatter={v => v.toFixed(2)}
              />
              <Tooltip content={<TooltipEVM />} />
              <Legend wrapperStyle={{ fontSize: '13px' }} />

              {/* Meta = 1,0 */}
              <ReferenceLine
                y={1.0}
                stroke="#94a3b8"
                strokeDasharray="4 2"
                label={{ value: 'Meta 1,0', position: 'right', fill: '#94a3b8', fontSize: 11 }}
              />

              <Line
                type="monotone"
                dataKey="idc"
                name="IDC (Custo)"
                stroke="#233772"
                strokeWidth={2}
                dot={{ fill: '#233772', r: 4 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="idp"
                name="IDP (Prazo)"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ fill: '#16a34a', r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela histórica */}
      {tabelaHistorico.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Histórico de Snapshots EVM</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Semana</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">VP (%)</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">VA (%)</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">CR</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">IDC</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">IDP</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">PPC</th>
                </tr>
              </thead>
              <tbody>
                {tabelaHistorico.map((row, i) => {
                  const idcN = row.idc !== '—' ? Number(row.idc) : null
                  const idpN = row.idp !== '—' ? Number(row.idp) : null
                  const semIDC = semaforoEVM(idcN)
                  const semIDP = semaforoEVM(idpN)
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{row.semana}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.vp}%</td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.va}%</td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.cr}</td>
                      <td className="px-4 py-3 text-right">
                        {idcN !== null ? (
                          <span className="font-medium" style={{ color: semIDC.cor }}>{row.idc}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {idpN !== null ? (
                          <span className="font-medium" style={{ color: semIDP.cor }}>{row.idp}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.ppc}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Glossário rápido */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
        <div><strong>VP (Valor Previsto / BCWS):</strong> % físico que deveria estar concluído até hoje.</div>
        <div><strong>VA (Valor Agregado / BCWP):</strong> % físico realmente concluído (ponderado pelos pesos).</div>
        <div><strong>CR (Custo Real / ACWP):</strong> valor financeiro gasto até hoje.</div>
        <div><strong>IDC = VA / CR:</strong> ≥ 1 = dentro do custo · &lt; 0,9 = custo crítico.</div>
        <div><strong>IDP = VA / VP:</strong> ≥ 1 = adiantado · &lt; 0,9 = atraso crítico.</div>
        <div><strong>ONT = Orçamento / IDC:</strong> projeção do custo final se desempenho atual continuar.</div>
      </div>

    </div>
  )
}
