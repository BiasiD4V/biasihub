// ============================================================================
// pages/Resultado.jsx
// Resultado Operacional: Faturamento − MO − DI − ADM Central
// Acesso: admin, master, diretor, gerente (ver_resultado)
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Target, AlertCircle, Info, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Minus, Download, RefreshCw
} from 'lucide-react'
import { supabase, despesasIndiretasService, admCentralService, faturamentoMensalService } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SearchableSelect, { obrasParaOptions } from '../components/ui/SearchableSelect'

// ─── Constantes ──────────────────────────────────────────────
const MESES = [
  { v: 1,  l: 'Jan', ln: 'Janeiro'   }, { v: 2,  l: 'Fev', ln: 'Fevereiro' },
  { v: 3,  l: 'Mar', ln: 'Março'     }, { v: 4,  l: 'Abr', ln: 'Abril'     },
  { v: 5,  l: 'Mai', ln: 'Maio'      }, { v: 6,  l: 'Jun', ln: 'Junho'     },
  { v: 7,  l: 'Jul', ln: 'Julho'     }, { v: 8,  l: 'Ago', ln: 'Agosto'    },
  { v: 9,  l: 'Set', ln: 'Setembro'  }, { v: 10, l: 'Out', ln: 'Outubro'   },
  { v: 11, l: 'Nov', ln: 'Novembro'  }, { v: 12, l: 'Dez', ln: 'Dezembro'  },
]

function nomeMes(n)  { return MESES.find(m => m.v === n)?.ln ?? String(n) }
function nomeMesAb(n){ return MESES.find(m => m.v === n)?.l  ?? String(n) }

function fmt(v, compacto = false) {
  if (compacto && Math.abs(v) >= 1_000_000)
    return (v / 1_000_000).toFixed(1).replace('.', ',') + ' M'
  if (compacto && Math.abs(v) >= 1_000)
    return (v / 1_000).toFixed(0) + ' K'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0)
}

function pct(v) {
  return (v || 0).toFixed(1).replace('.', ',') + '%'
}

function corMargem(m) {
  if (m >= 15) return '#16a34a'  // verde
  if (m >= 5)  return '#d97706'  // amarelo
  return '#dc2626'               // vermelho
}

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, valor, sub, cor = '#233772', icone: Icone }) {
  return (
    <div className="bg-white rounded-xl border p-4 flex flex-col gap-1" style={{ borderColor: cor + '30' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {Icone && <Icone size={16} style={{ color: cor }} />}
      </div>
      <span className="text-2xl font-bold tabular-nums" style={{ color: cor }}>{valor}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  )
}

// ─── Linha de obra no resultado ────────────────────────────────
function LinhaObra({ obra, fat, mo, di, adm, expandido, onToggle }) {
  const resultado = fat - mo - di - adm
  const margem    = fat > 0 ? (resultado / fat) * 100 : 0
  const cor       = corMargem(margem)

  const Icone = resultado > 0 ? TrendingUp : resultado < 0 ? TrendingDown : Minus

  return (
    <>
      <tr
        className="border-b hover:bg-slate-50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expandido ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            <span className="font-semibold text-slate-800 text-sm">{obra.nome}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-700">{fmt(fat)}</td>
        <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-600">{fmt(mo)}</td>
        <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-600">{fmt(di)}</td>
        <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-600">{fmt(adm)}</td>
        <td className="px-4 py-3 text-sm text-right tabular-nums font-bold" style={{ color: cor }}>
          {fmt(resultado)}
        </td>
        <td className="px-4 py-3 text-right">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: cor + '18', color: cor, border: `1px solid ${cor}40` }}
          >
            <Icone size={11} />
            {pct(margem)}
          </span>
        </td>
      </tr>
      {expandido && (
        <tr className="bg-slate-50/50 border-b">
          <td colSpan={7} className="px-6 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Faturamento',           valor: fat,       pct: 100,                          cor: '#233772' },
                { label: 'MO (alocação)',          valor: mo,        pct: fat > 0 ? mo  / fat * 100 : 0, cor: '#dc2626' },
                { label: 'DI (desp. indiretas)',   valor: di,        pct: fat > 0 ? di  / fat * 100 : 0, cor: '#ea580c' },
                { label: 'ADM Central',            valor: adm,       pct: fat > 0 ? adm / fat * 100 : 0, cor: '#9333ea' },
              ].map(({ label, valor, pct: p, cor: c }) => (
                <div key={label} className="bg-white rounded-lg border p-3 text-xs">
                  <p className="text-slate-400 mb-0.5">{label}</p>
                  <p className="font-bold text-sm tabular-nums" style={{ color: c }}>{fmt(valor)}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, p)}%`, backgroundColor: c }}
                    />
                  </div>
                  <p className="text-slate-400 mt-0.5">{pct(p)} do fat.</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Componente principal ─────────────────────────────────────
export default function Resultado() {
  const { usuario } = useAuth()
  const hoje = new Date()

  const podeVer = ['admin', 'master', 'diretor', 'gerente'].includes(usuario?.perfil)

  // Filtros
  const [mes,       setMes]       = useState(hoje.getMonth() + 1)
  const [ano,       setAno]       = useState(hoje.getFullYear())
  const [filtroObra,setFiltroObra]= useState('')

  // Dados brutos
  const [obras,     setObras]     = useState([])
  const [medicoes,  setMedicoes]  = useState([])
  const [moAloc,    setMoAloc]    = useState([])
  const [despIndir, setDespIndir] = useState([])
  const [admReg,    setAdmReg]    = useState(null)

  const [carregando, setCarregando] = useState(false)
  const [erro,       setErro]       = useState(null)
  const [expandidos, setExpandidos] = useState({})

  const anos = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [obrasData, medicaoDados, moDados, diDados, admDados] = await Promise.all([
        // Obras ativas
        supabase.from('obras').select('id, nome, status').order('nome').then(r => r.data || []),

        // Medições do mês selecionado
        supabase
          .from('medicoes_contrato')
          .select('obra_id, valor_mao_obra, valor_material, data_medicao')
          .gte('data_medicao', `${ano}-${String(mes).padStart(2,'0')}-01`)
          .lt('data_medicao',
            mes === 12
              ? `${ano + 1}-01-01`
              : `${ano}-${String(mes + 1).padStart(2,'0')}-01`
          )
          .then(r => r.data || []),

        // MO planejamento (custo total snapshot por obra)
        supabase
          .from('mo_planejamento')
          .select('obra_id, custo_total_snapshot')
          .then(r => r.data || []),

        // DI do mês
        despesasIndiretasService.listar({ mes, ano }),

        // ADM Central do mês
        admCentralService.buscarMes(mes, ano),
      ])

      setObras(obrasData)
      setMedicoes(medicaoDados)
      setMoAloc(moDados)
      setDespIndir(diDados)
      setAdmReg(admDados)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [mes, ano])

  useEffect(() => { carregar() }, [carregar])

  // Calcula faturamento por obra no mês
  const fatPorObra = useMemo(() => {
    const m = {}
    medicoes.forEach(med => {
      const v = (parseFloat(med.valor_mao_obra) || 0) + (parseFloat(med.valor_material) || 0)
      m[med.obra_id] = (m[med.obra_id] || 0) + v
    })
    return m
  }, [medicoes])

  // Calcula MO por obra (soma custo_total_snapshot de mo_planejamento)
  const moPorObra = useMemo(() => {
    const m = {}
    moAloc.forEach(r => {
      m[r.obra_id] = (m[r.obra_id] || 0) + (parseFloat(r.custo_total_snapshot) || 0)
    })
    return m
  }, [moAloc])

  // Calcula DI por obra no mês
  const diPorObra = useMemo(() => {
    const m = {}
    despIndir.forEach(d => {
      m[d.obra_id] = (m[d.obra_id] || 0) + (parseFloat(d.valor) || 0)
    })
    return m
  }, [despIndir])

  // Percentual ADM efetivo
  const pctAdm = useMemo(() => {
    if (!admReg) return 0
    return admReg.percentual_override != null
      ? admReg.percentual_override
      : admReg.percentual_calculado
  }, [admReg])

  // Obras com faturamento no mês (filtradas)
  const obrasComFat = useMemo(() => {
    return obras.filter(o => {
      if (filtroObra && o.id !== filtroObra) return false
      return (fatPorObra[o.id] || 0) > 0
    })
  }, [obras, fatPorObra, filtroObra])

  // Linhas calculadas
  const linhas = useMemo(() => {
    return obrasComFat.map(o => {
      const fat = fatPorObra[o.id] || 0
      const mo  = moPorObra[o.id]  || 0
      const di  = diPorObra[o.id]  || 0
      const adm = fat * (pctAdm / 100)
      return { obra: o, fat, mo, di, adm }
    }).sort((a, b) => b.fat - a.fat)
  }, [obrasComFat, fatPorObra, moPorObra, diPorObra, pctAdm])

  // Totais
  const totais = useMemo(() => {
    return linhas.reduce((t, l) => ({
      fat: t.fat + l.fat,
      mo:  t.mo  + l.mo,
      di:  t.di  + l.di,
      adm: t.adm + l.adm,
    }), { fat: 0, mo: 0, di: 0, adm: 0 })
  }, [linhas])

  const totalResultado = totais.fat - totais.mo - totais.di - totais.adm
  const margemGeral    = totais.fat > 0 ? (totalResultado / totais.fat) * 100 : 0

  function exportarCsv() {
    const rows = [
      ['Obra', 'Faturamento', 'MO', 'DI', 'ADM', 'Resultado', 'Margem%'],
      ...linhas.map(l => {
        const r = l.fat - l.mo - l.di - l.adm
        const m = l.fat > 0 ? r / l.fat * 100 : 0
        return [
          l.obra.nome,
          l.fat.toFixed(2), l.mo.toFixed(2), l.di.toFixed(2), l.adm.toFixed(2),
          r.toFixed(2), m.toFixed(2) + '%',
        ]
      }),
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `resultado_${nomeMesAb(mes)}_${ano}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!podeVer) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-700 rounded-xl">
        <AlertCircle className="mx-auto mb-2" size={24} />
        <p className="font-semibold">Sem permissão para visualizar Resultado Operacional.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#233772' }}>
            <Target size={22} /> Resultado Operacional
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Faturamento − MO − DI − ADM Central por obra / mês
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
          {linhas.length > 0 && (
            <button
              onClick={exportarCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
            >
              <Download size={14} /> CSV
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Mês</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
          >
            {MESES.map(m => <option key={m.v} value={m.v}>{m.ln}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Ano</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
          >
            {anos.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 min-w-[240px]">
          <label className="text-xs font-semibold text-slate-500 uppercase">Obra</label>
          <SearchableSelect
            value={filtroObra}
            onChange={setFiltroObra}
            options={obrasParaOptions(obras)}
            placeholder="Todas as obras"
            clearable
          />
        </div>
        {/* Status ADM */}
        <div className="ml-auto flex items-end">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
            ${admReg ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
            {admReg
              ? <>✓ ADM Central: {pct(pctAdm)} ({nomeMes(mes)}/{ano})</>
              : <>⚠ ADM Central não cadastrado para {nomeMes(mes)}/{ano}</>
            }
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {/* Carregando */}
      {carregando && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />
          Carregando…
        </div>
      )}

      {!carregando && (
        <>
          {/* KPIs gerais */}
          {linhas.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                label="Faturamento"
                valor={fmt(totais.fat, true)}
                sub={`${nomeMes(mes)}/${ano}`}
                cor="#233772"
                icone={TrendingUp}
              />
              <KpiCard
                label="MO Total"
                valor={fmt(totais.mo, true)}
                sub={pct(totais.fat > 0 ? totais.mo / totais.fat * 100 : 0) + ' do fat.'}
                cor="#dc2626"
              />
              <KpiCard
                label="DI Total"
                valor={fmt(totais.di, true)}
                sub={pct(totais.fat > 0 ? totais.di / totais.fat * 100 : 0) + ' do fat.'}
                cor="#ea580c"
              />
              <KpiCard
                label="ADM Central"
                valor={fmt(totais.adm, true)}
                sub={`${pct(pctAdm)} aplicado`}
                cor="#9333ea"
              />
              <KpiCard
                label="Resultado"
                valor={fmt(totalResultado, true)}
                sub={pct(margemGeral) + ' margem'}
                cor={corMargem(margemGeral)}
                icone={totalResultado >= 0 ? TrendingUp : TrendingDown}
              />
              <KpiCard
                label="Obras"
                valor={linhas.length}
                sub="com faturamento"
                cor="#0891b2"
              />
            </div>
          )}

          {/* Barra de composição do resultado */}
          {totais.fat > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Composição do Faturamento — {nomeMes(mes)}/{ano}
              </p>
              <div className="flex h-8 rounded-lg overflow-hidden">
                {[
                  { label: 'MO',   valor: totais.mo,                                       cor: '#ef4444' },
                  { label: 'DI',   valor: totais.di,                                       cor: '#f97316' },
                  { label: 'ADM',  valor: totais.adm,                                      cor: '#a855f7' },
                  { label: 'RES',  valor: Math.max(0, totalResultado),                     cor: '#16a34a' },
                  { label: 'DÉF',  valor: Math.max(0, -totalResultado),                    cor: '#dc2626' },
                ].filter(s => s.valor > 0).map(({ label, valor, cor }) => (
                  <div
                    key={label}
                    title={`${label}: ${fmt(valor)} (${pct(valor / totais.fat * 100)})`}
                    style={{ width: `${valor / totais.fat * 100}%`, backgroundColor: cor }}
                    className="flex items-center justify-center text-white text-[10px] font-bold overflow-hidden"
                  >
                    {valor / totais.fat > 0.08 ? label : ''}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {[
                  { label: 'MO',          valor: totais.mo,  cor: '#ef4444' },
                  { label: 'DI',          valor: totais.di,  cor: '#f97316' },
                  { label: 'ADM Central', valor: totais.adm, cor: '#a855f7' },
                  { label: totalResultado >= 0 ? 'Resultado' : 'Déficit', valor: Math.abs(totalResultado), cor: corMargem(margemGeral) },
                ].map(({ label, valor, cor }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cor }} />
                    <span className="text-slate-600">{label}:</span>
                    <span className="font-semibold tabular-nums text-slate-800">{fmt(valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela por obra */}
          {linhas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Target size={40} strokeWidth={1} />
              <p className="text-sm">Nenhuma medição encontrada para {nomeMes(mes)}/{ano}.</p>
              <p className="text-xs text-slate-300">
                Certifique-se de que a sincronização Sienge está atualizada e há medições no período.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700">
                  Resultado por Obra — {nomeMes(mes)} / {ano}
                </h2>
                <p className="text-xs text-slate-400">Clique em uma obra para ver o detalhamento</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[11px] uppercase text-slate-500 tracking-wide">
                      <th className="px-4 py-2.5">Obra</th>
                      <th className="px-4 py-2.5 text-right">Faturamento</th>
                      <th className="px-4 py-2.5 text-right">MO</th>
                      <th className="px-4 py-2.5 text-right">DI</th>
                      <th className="px-4 py-2.5 text-right">ADM</th>
                      <th className="px-4 py-2.5 text-right">Resultado</th>
                      <th className="px-4 py-2.5 text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map(({ obra, fat, mo, di, adm }) => (
                      <LinhaObra
                        key={obra.id}
                        obra={obra}
                        fat={fat}
                        mo={mo}
                        di={di}
                        adm={adm}
                        expandido={!!expandidos[obra.id]}
                        onToggle={() => setExpandidos(p => ({ ...p, [obra.id]: !p[obra.id] }))}
                      />
                    ))}
                    {/* Linha de totais */}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        TOTAL — {linhas.length} obras
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{fmt(totais.fat)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-red-600">{fmt(totais.mo)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-orange-600">{fmt(totais.di)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-purple-600">{fmt(totais.adm)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums font-bold"
                        style={{ color: corMargem(margemGeral) }}>
                        {fmt(totalResultado)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ backgroundColor: corMargem(margemGeral) + '18', color: corMargem(margemGeral), border: `1px solid ${corMargem(margemGeral)}40` }}
                        >
                          {pct(margemGeral)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notas metodológicas */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
            <p className="font-semibold mb-2 flex items-center gap-1">
              <Info size={13} /> Metodologia de cálculo
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Faturamento</strong>: medições Sienge do período (valor_mao_obra + valor_material — bruto)</li>
              <li><strong>MO</strong>: custo total alocado em Recursos / Planejamento (custo_total_snapshot)</li>
              <li><strong>DI</strong>: despesas indiretas lançadas manualmente para a obra no mês</li>
              <li><strong>ADM Central</strong>: {admReg ? `${pct(pctAdm)} × faturamento da obra` : 'não cadastrado — valor zerado'}</li>
              <li><strong>Resultado</strong> = Faturamento − MO − DI − ADM · <strong>Margem</strong> = Resultado / Faturamento × 100</li>
            </ul>
            <p className="mt-2 text-blue-600">
              ⚠ O MO mostrado é o <em>custo planejado/alocado</em>. Para resultado com custo real de folha,
              integre com o módulo de Custos MO ou Sienge RH.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
