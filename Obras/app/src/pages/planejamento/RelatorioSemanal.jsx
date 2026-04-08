// ============================================================================
// pages/planejamento/RelatorioSemanal.jsx
// Relatório Semanal PCO — PDF (jsPDF + autotable) ou Excel (xlsx)
// Template Biasi: logo, header, Curva S, EVM, RAG, PPC
// SPEC-PLN-002-2026 — Etapa 13
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useObra } from '../../context/ObraContext'
import ObraSearchSelect from '../../components/ui/ObraSearchSelect'
import { usePermissoes } from '../../hooks/usePermissoes'
import {
  calcVP, calcVA, calcIDC, calcIDP, calcONT, calcPPC, semaforoEVM,
} from '../../lib/planejamento/calcEVM'
import { semanaRef, formatarSemana } from '../../lib/planejamento/diasUteis'
import {
  FileText, Download, Table, Printer,
  AlertTriangle, CheckCircle, XCircle, Clock,
} from 'lucide-react'

// ─── Semáforo RAG visual ──────────────────────────────────────────────────────
function Semaforo({ valor }) {
  const sem = semaforoEVM(valor)
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sem.cor }} />
      <span className="text-sm font-semibold" style={{ color: sem.cor }}>
        {valor !== null ? valor.toFixed(3) : '—'} ({sem.label})
      </span>
    </div>
  )
}

// ─── Card KPI compacto ────────────────────────────────────────────────────────
function KpiCard({ label, valor, formato = 'numero', semaforo = false }) {
  const sem = semaforo ? semaforoEVM(valor) : null
  const formatado = valor === null || valor === undefined
    ? '—'
    : formato === 'moeda'
      ? `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
      : formato === 'percent'
        ? `${Number(valor).toFixed(1)}%`
        : Number(valor).toFixed(3)

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={sem ? { borderColor: sem.cor + '60', backgroundColor: sem.bg } : { borderColor: '#e2e8f0', backgroundColor: 'white' }}
    >
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-bold" style={{ color: sem?.cor || '#1e293b' }}>{formatado}</span>
      {sem && <span className="text-xs font-medium" style={{ color: sem.cor }}>{sem.label}</span>}
    </div>
  )
}

// ─── Exportar Excel ───────────────────────────────────────────────────────────
async function exportarExcel({ obra, semana, atividades, avancosSemana, snapshots, evmAtual }) {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()

  // Aba 1 — Resumo EVM
  const resumo = [
    ['RELATÓRIO SEMANAL PCO — BIASI ENGENHARIA'],
    [`Obra: ${obra?.nome || '—'}`],
    [`Semana: ${formatarSemana(semana)}`],
    [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
    [],
    ['INDICADORES EVM'],
    ['VP (%)', 'VA (%)', 'IDC', 'IDP'],
    [
      evmAtual?.vp?.toFixed(2) ?? '—',
      evmAtual?.va?.toFixed(2) ?? '—',
      evmAtual?.idc?.toFixed(3) ?? '—',
      evmAtual?.idp?.toFixed(3) ?? '—',
    ],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(resumo)
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumo EVM')

  // Aba 2 — Avanços da semana
  const cabecalho = ['Atividade', '% Previsto', '% Realizado', 'Desvio', 'Observação']
  const linhas = atividades.map(a => {
    const av = avancosSemana.find(x => x.atividade_id === a.id)
    const vpA = calcVP([a], new Date())
    const vaA = Number(av?.perc_realizado || 0)
    return [
      a.nome,
      vpA.toFixed(1) + '%',
      vaA.toFixed(1) + '%',
      (vaA - vpA).toFixed(1) + '%',
      av?.observacao || '',
    ]
  })
  const ws2 = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas])
  XLSX.utils.book_append_sheet(wb, ws2, 'Avanços Semana')

  // Aba 3 — Histórico EVM
  const cab3 = ['Semana', 'VP (%)', 'VA (%)', 'CR', 'IDC', 'IDP', 'PPC']
  const linhas3 = snapshots.map(s => [
    s.semana_ref,
    Number(s.vp || 0).toFixed(1),
    Number(s.va || 0).toFixed(1),
    s.cr || '',
    s.idc !== null ? Number(s.idc).toFixed(3) : '',
    s.idp !== null ? Number(s.idp).toFixed(3) : '',
    s.ppc !== null ? Number(s.ppc).toFixed(0) + '%' : '',
  ])
  const ws3 = XLSX.utils.aoa_to_sheet([cab3, ...linhas3])
  XLSX.utils.book_append_sheet(wb, ws3, 'Histórico EVM')

  const nomeArq = `RelatorioSemanal_${(obra?.nome || 'Obra').replace(/\s+/g, '_')}_${semana}.xlsx`
  XLSX.writeFile(wb, nomeArq)
}

// ─── Exportar PDF ─────────────────────────────────────────────────────────────
async function exportarPDF({ obra, semana, atividades, avancosSemana, evmAtual, logoBase64 }) {
  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.width

  // Header
  doc.setFillColor(35, 55, 114) // #233772
  doc.rect(0, 0, W, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('RELATÓRIO SEMANAL — PCO', W / 2, 12, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Biasi Engenharia  ·  ${obra?.nome || '—'}`, W / 2, 20, { align: 'center' })
  doc.text(formatarSemana(semana), W / 2, 26, { align: 'center' })

  // KPIs EVM
  let y = 40
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('INDICADORES EVM', 14, y)
  y += 7

  const kpis = [
    { l: 'VP (%)',  v: evmAtual?.vp != null ? evmAtual.vp.toFixed(1) + '%' : '—' },
    { l: 'VA (%)',  v: evmAtual?.va != null ? evmAtual.va.toFixed(1) + '%' : '—' },
    { l: 'IDC',    v: evmAtual?.idc?.toFixed(3) ?? '—' },
    { l: 'IDP',    v: evmAtual?.idp?.toFixed(3) ?? '—' },
  ]
  const colW = (W - 28) / 4
  kpis.forEach((k, i) => {
    const x = 14 + i * colW
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(x, y, colW - 4, 16, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(k.l, x + 3, y + 6)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(35, 55, 114)
    doc.text(k.v, x + 3, y + 14)
  })
  y += 24

  // Tabela avanços
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('AVANÇO FÍSICO — SEMANA', 14, y)
  y += 5

  const rows = atividades.map(a => {
    const av = avancosSemana.find(x => x.atividade_id === a.id)
    const vpA = calcVP([a], new Date()).toFixed(1)
    const vaA = Number(av?.perc_realizado || 0).toFixed(1)
    const desv = (Number(vaA) - Number(vpA)).toFixed(1)
    return [a.nome, `${vpA}%`, `${vaA}%`, `${desv}%`, av?.observacao || '']
  })

  doc.autoTable({
    startY: y,
    head: [['Atividade', 'Previsto', 'Realizado', 'Desvio', 'Observação']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [35, 55, 114], textColor: 255, fontSize: 9 },
    bodyStyles:  { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  // Footer
  const pageH = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(148, 163, 184)
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} — Biasi Engenharia`,
    W / 2, pageH - 8, { align: 'center' }
  )

  const nomeArq = `RelatorioSemanal_${(obra?.nome || 'Obra').replace(/\s+/g, '_')}_${semana}.pdf`
  doc.save(nomeArq)
}

// ─── Componente principal ─────────────────────────────────────────────────────
function RelatorioSemanal() {
  const { obraSelecionadaId, setObraSelecionada, obraAtual, planejamentoId } = useObra()
  const perm = usePermissoes()

  const [semana,          setSemana]          = useState(semanaRef(new Date()))
  const [atividades,      setAtividades]      = useState([])
  const [avancosSemana,   setAvancosSemana]   = useState([])
  const [snapshots,       setSnapshots]       = useState([])
  const [loading,         setLoading]         = useState(true)
  const [erro,            setErro]            = useState(null)
  const [gerandoPDF,      setGerandoPDF]      = useState(false)
  const [gerandoXLS,      setGerandoXLS]      = useState(false)

  // ── Carregar dados ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!planejamentoId) return

    const carregar = async () => {
      setLoading(true)
      setErro(null)
      try {
        const { data: atvs, error: atvsErr } = await supabase
          .from('planejamento_atividades')
          .select('id, nome, peso_percentual, data_inicio_prevista, data_fim_prevista, perc_realizado')
          .eq('planejamento_id', planejamentoId)
        if (atvsErr) throw atvsErr
        setAtividades(atvs || [])

        if (atvs?.length) {
          const { data: avs } = await supabase
            .from('avancos_fisicos')
            .select('atividade_id, semana_ref, perc_realizado, observacao')
            .in('atividade_id', atvs.map(a => a.id))
            .eq('semana_ref', semana)
          setAvancosSemana(avs || [])
        }

        const { data: snaps } = await supabase
          .from('evm_snapshots')
          .select('semana_ref, vp, va, cr, idc, idp, ont, ppc')
          .eq('planejamento_id', planejamentoId)
          .order('semana_ref')
        setSnapshots(snaps || [])
      } catch (e) {
        setErro(e.message)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [planejamentoId, semana])

  // ── EVM da semana atual ────────────────────────────────────────────────────
  const evmAtual = useMemo(() => {
    if (!atividades.length) return null
    const dataRef = new Date(semana + 'T12:00:00')
    const vp = calcVP(atividades, dataRef)
    const va = calcVA(atividades)
    return { vp, va, idc: null, idp: calcIDP(va, vp) }
  }, [atividades, semana])

  // ── Dados curva histórica ──────────────────────────────────────────────────
  const dadosCurva = useMemo(() => {
    return snapshots.slice(-12).map(s => ({
      semana: s.semana_ref?.slice(5),  // MM-DD
      vp:     Number(s.vp || 0).toFixed(1),
      va:     Number(s.va || 0).toFixed(1),
    }))
  }, [snapshots])

  // ── Navegar semana ─────────────────────────────────────────────────────────
  const navSemana = (dir) => {
    const d = new Date(semana + 'T12:00:00')
    d.setDate(d.getDate() + dir * 7)
    setSemana(d.toISOString().split('T')[0])
  }

  // ── PPC da semana ──────────────────────────────────────────────────────────
  const ppcAtual = useMemo(() => {
    if (!atividades.length) return null
    const planejadas = atividades.filter(a => {
      const ini = a.data_inicio_prevista
      const fim = a.data_fim_prevista
      return ini && fim && ini <= semana && fim >= semana
    }).length
    const concluidas = avancosSemana.filter(av => av.perc_realizado >= 100).length
    return calcPPC(planejadas, concluidas)
  }, [atividades, avancosSemana, semana])

  // ── Atividades com atraso ──────────────────────────────────────────────────
  const atividadesStatus = useMemo(() => {
    return atividades.map(a => {
      const av = avancosSemana.find(x => x.atividade_id === a.id)
      const vpA = calcVP([a], new Date(semana + 'T12:00:00'))
      const vaA = Number(av?.perc_realizado || a.perc_realizado || 0)
      const desvio = vaA - vpA
      return { ...a, vpA, vaA, desvio, observacao: av?.observacao || '' }
    }).sort((a, b) => a.desvio - b.desvio)
  }, [atividades, avancosSemana, semana])

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (!obraSelecionadaId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Selecione uma obra no cabeçalho</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-800">Relatório Semanal</h1>
          <div className="flex items-center gap-2">
            <ObraSearchSelect
              value={obraSelecionadaId}
              onChange={setObraSelecionada}
              allowTodas={false}
              className="min-w-[260px]"
            />
            <span className="text-sm text-slate-500 mt-0.5">{obraAtual?.nome || '—'}</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Template PCO Biasi — EVM · Curva S · PPC · RAG</p>
        </div>

        {/* Navegação de semana */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navSemana(-1)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[200px] text-center">
            {formatarSemana(semana)}
          </span>
          <button
            onClick={() => navSemana(1)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
          >
            ›
          </button>
        </div>

        {/* Botões exportar */}
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setGerandoXLS(true)
              try {
                await exportarExcel({ obra: obraAtual, semana, atividades: atividadesStatus, avancosSemana, snapshots, evmAtual })
              } finally {
                setGerandoXLS(false)
              }
            }}
            disabled={gerandoXLS || loading}
            className="flex items-center gap-2 px-4 py-2 border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <Table size={15} />
            {gerandoXLS ? 'Gerando…' : 'Excel'}
          </button>
          <button
            onClick={async () => {
              setGerandoPDF(true)
              try {
                await exportarPDF({ obra: obraAtual, semana, atividades: atividadesStatus, avancosSemana, evmAtual })
              } finally {
                setGerandoPDF(false)
              }
            }}
            disabled={gerandoPDF || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <Download size={15} />
            {gerandoPDF ? 'Gerando…' : 'PDF'}
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          <AlertTriangle size={18} />
          <span className="text-sm">{erro}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="VP (Planejado)" valor={evmAtual?.vp} formato="percent" />
            <KpiCard label="VA (Realizado)" valor={evmAtual?.va} formato="percent" />
            <KpiCard label="IDP" valor={evmAtual?.idp} semaforo />
            <KpiCard label="PPC" valor={ppcAtual} formato="percent" />
          </div>

          {/* Mini curva S */}
          {dadosCurva.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-3 text-sm">Curva S — Últimas 12 semanas</h2>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={dadosCurva} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} width={35} />
                  <Tooltip formatter={(v, n) => [`${v}%`, n === 'vp' ? 'Planejado' : 'Realizado']} />
                  <Area type="monotone" dataKey="vp" stroke="#233772" fill="#233772" fillOpacity={0.1} strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="va" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabela avanços com RAG */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Avanço Físico por Atividade</h2>
              <span className="text-xs text-slate-400">{atividades.length} atividades</span>
            </div>

            {atividadesStatus.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                Nenhuma atividade cadastrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Atividade</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Previsto</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Realizado</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Desvio</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atividadesStatus.map(a => {
                      const semA = a.desvio >= 0
                        ? { cor: '#16a34a', bg: '#f0fdf4', icon: CheckCircle, label: 'OK' }
                        : a.desvio >= -10
                          ? { cor: '#d97706', bg: '#fffbeb', icon: Clock,        label: 'Atenção' }
                          : { cor: '#dc2626', bg: '#fef2f2', icon: XCircle,      label: 'Crítico' }
                      const Icon = semA.icon
                      return (
                        <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700 font-medium">{a.nome}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{a.vpA.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-right text-slate-600">{a.vaA.toFixed(1)}%</td>
                          <td className={`px-4 py-3 text-right font-semibold ${a.desvio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {a.desvio > 0 ? '+' : ''}{a.desvio.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
                              style={{ color: semA.cor, backgroundColor: semA.bg, borderColor: semA.cor + '40' }}
                            >
                              <Icon size={11} />
                              {semA.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{a.observacao}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default RelatorioSemanal