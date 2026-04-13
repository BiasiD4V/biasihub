import React, { useState, useEffect, useMemo } from 'react'
import { Loader2, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Label, BarChart, Bar, Legend,
} from 'recharts'
import {
  obrasService, contratosService, medicoesContratoService, orcamentosSiengeService,
} from '../lib/supabase'
import { formatarMoeda } from '../lib/calculos'
import { Link } from 'react-router-dom'
import { useObra } from '../context/ObraContext'

const MODOS = [
  { id: 'scatter', label: 'Mapa de Execução' },
  { id: 'barra', label: 'Orçado × Contratado × Medido' },
]

export default function PrevistoxRealizado() {
  const { obraSelecionadaId, obraAtual } = useObra()
  const [obras, setObras] = useState([])
  const [contratos, setContratos] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [orcamentos, setOrcamentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modo, setModo] = useState('scatter')

  useEffect(() => {
    async function carregar() {
      try {
        const [o, c, m, orc] = await Promise.all([
          obrasService.listar(),
          contratosService.listarTodos(),
          medicoesContratoService.listarTodos(),
          orcamentosSiengeService.listarTodos(),
        ])
        setObras(o || [])
        setContratos(c || [])
        setMedicoes(m || [])
        setOrcamentos(orc || [])
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  // Agrupa BAC por obra_id
  const bacPorObra = useMemo(() => {
    const map = {}
    for (const i of orcamentos) {
      if (!map[i.obra_id]) map[i.obra_id] = { bac: 0, bacMo: 0, bacMat: 0 }
      map[i.obra_id].bac += parseFloat(i.valor_total) || 0
      map[i.obra_id].bacMo += parseFloat(i.valor_mo) || 0
      map[i.obra_id].bacMat += parseFloat(i.valor_material) || 0
    }
    return map
  }, [orcamentos])

  const dados = useMemo(() => {
    const obrasVis = obraSelecionadaId ? obras.filter(o => o.id === obraSelecionadaId) : obras
    return obrasVis.map(o => {
      const cObra = contratos.filter(c => c.obra_id === o.id)
      const mObra = medicoes.filter(m => m.obra_id === o.id)
      const contratado = cObra.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
      const medido = mObra.reduce((s, m) => s + (parseFloat(m.valor_liquido) || 0), 0)
      const bac = bacPorObra[o.id]?.bac || 0

      const percMedidoContratado = contratado > 0 ? (medido / contratado) * 100 : 0
      const percMedidoOrcado = bac > 0 ? (medido / bac) * 100 : null
      const desvioOrc = bac > 0 ? contratado - bac : null // positivo = acima do orçado

      // Prazo decorrido (% do tempo total)
      const inicio = o.data_inicio ? new Date(o.data_inicio) : null
      const fim = o.data_fim_prevista ? new Date(o.data_fim_prevista) : null
      const hoje = new Date()
      let percPrazo = 50
      if (inicio && fim && fim > inicio) {
        const total = fim - inicio
        const decorrido = Math.min(hoje - inicio, total)
        percPrazo = Math.max(0, Math.min(100, (decorrido / total) * 100))
      }

      const sigla = (o.codigo || '').substring(0, 5)
      return {
        id: o.id,
        nome: o.nome,
        codigo: o.codigo,
        sigla,
        bac,
        contratado,
        medido,
        percMedidoContratado: Math.round(percMedidoContratado * 10) / 10,
        percMedidoOrcado: percMedidoOrcado !== null ? Math.round(percMedidoOrcado * 10) / 10 : null,
        desvioOrc,
        percPrazo: Math.round(percPrazo * 10) / 10,
        x: Math.round(percMedidoContratado * 10) / 10,
        y: Math.round(percPrazo * 10) / 10,
      }
    }).filter(o => o.contratado > 0 || o.bac > 0)
  }, [obras, contratos, medicoes, bacPorObra, obraSelecionadaId])

  // Totais gerais
  const totais = useMemo(() => ({
    bac: dados.reduce((s, d) => s + d.bac, 0),
    contratado: dados.reduce((s, d) => s + d.contratado, 0),
    medido: dados.reduce((s, d) => s + d.medido, 0),
  }), [dados])

  // Para o gráfico de barras — top 15 por BAC/contratado
  const dadosGrafico = useMemo(() => {
    const sorted = [...dados].sort((a, b) => (b.bac || b.contratado) - (a.bac || a.contratado)).slice(0, 15)
    return sorted.map(d => ({
      sigla: d.sigla,
      nome: d.nome,
      'Orçado (BAC)': d.bac > 0 ? Math.round(d.bac / 1000) : null,
      'Contratado': Math.round(d.contratado / 1000),
      'Medido': Math.round(d.medido / 1000),
    }))
  }, [dados])

  if (carregando) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="animate-spin" style={{ color: '#233772' }} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Previsto × Realizado</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {obraAtual
              ? <><span className="font-medium">{obraAtual.nome}</span> <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">filtro ativo</span></>
              : 'Orçado (BAC) × Contratado × Medido por obra'}
          </p>
        </div>
        {/* Toggle modo */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {MODOS.map(m => (
            <button
              key={m.id}
              onClick={() => setModo(m.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${modo === m.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Orçado Total (BAC)', value: totais.bac, color: '#233772', note: totais.bac > 0 ? null : 'Sync orçamentos pendente' },
          { label: 'Contratado Total', value: totais.contratado, color: '#6366f1' },
          { label: 'Medido Total', value: totais.medido, color: '#16a34a',
            extra: totais.contratado > 0 ? `${((totais.medido / totais.contratado) * 100).toFixed(1)}% do contratado` : null },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 font-medium">{k.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: k.color }}>{formatarMoeda(k.value)}</p>
            {k.note && <p className="text-xs text-amber-600 mt-0.5">{k.note}</p>}
            {k.extra && <p className="text-xs text-gray-400 mt-0.5">{k.extra}</p>}
          </div>
        ))}
      </div>

      {/* Gráfico de barras */}
      {modo === 'barra' && dadosGrafico.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-800">Orçado × Contratado × Medido (R$ mil) — Top 15 obras</h2>
            <p className="text-xs text-gray-400 mt-0.5">Barras em R$ mil. Orçado = BAC do Sienge; Contratado = soma de contratos; Medido = soma de medições</p>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="sigla" tick={{ fontSize: 10, fill: '#6b7280' }} angle={-40} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${(v/1000).toFixed(0)}M`} />
              <Tooltip formatter={(v, name) => [`R$ ${(v).toLocaleString('pt-BR')}k`, name]} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="Orçado (BAC)" fill="#233772" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Contratado" fill="#818cf8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Medido" fill="#4ade80" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scatter chart */}
      {modo === 'scatter' && dados.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-800">Mapa de Execução — % Medido × % Prazo</h2>
            <p className="text-xs text-gray-400 mt-0.5">Obras acima da diagonal estão adiantadas financeiramente</p>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" dataKey="x" domain={[0, 100]} name="% Medido" tick={{ fontSize: 11, fill: '#6b7280' }}>
                <Label value="% Medido / Contratado" offset={-10} position="insideBottom" fontSize={12} fill="#6b7280" />
              </XAxis>
              <YAxis type="number" dataKey="y" domain={[0, 100]} name="% Prazo" tick={{ fontSize: 11, fill: '#6b7280' }}>
                <Label value="% Prazo Decorrido" angle={-90} position="insideLeft" offset={10} fontSize={12} fill="#6b7280" />
              </YAxis>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs space-y-0.5">
                    <p className="font-semibold text-gray-700 mb-1">{d?.nome}</p>
                    {d?.bac > 0 && <p className="text-gray-600">BAC (orçado): <strong>{formatarMoeda(d?.bac)}</strong></p>}
                    <p className="text-gray-600">Contratado: <strong>{formatarMoeda(d?.contratado)}</strong></p>
                    <p className="text-gray-600">Medido: <strong>{formatarMoeda(d?.medido)}</strong></p>
                    <p className="text-gray-600">% Medido: <strong>{d?.percMedidoContratado}%</strong></p>
                    {d?.percMedidoOrcado !== null && <p className="text-gray-600">% do BAC: <strong>{d?.percMedidoOrcado}%</strong></p>}
                    <p className="text-gray-600">% Prazo: <strong>{d?.percPrazo}%</strong></p>
                    {d?.desvioOrc !== null && (
                      <p className={d.desvioOrc > 0 ? 'text-red-600' : 'text-green-600'}>
                        Desvio s/ orçado: <strong>{d.desvioOrc > 0 ? '+' : ''}{formatarMoeda(d.desvioOrc)}</strong>
                      </p>
                    )}
                  </div>
                )
              }} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="#FFC82D" strokeDasharray="6 4" strokeWidth={1.5} />
              <Scatter data={dados} shape={(props) => {
                const { cx, cy, payload } = props
                const desvio = payload.percMedidoContratado - payload.percPrazo
                const cor = desvio >= -5 ? '#16a34a' : desvio >= -15 ? '#d97706' : '#dc2626'
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={10} fill={cor} fillOpacity={0.2} stroke={cor} strokeWidth={2} />
                    <text x={cx} y={cy + 4} textAnchor="middle" fill={cor} fontSize={8} fontWeight="bold">{payload.sigla}</text>
                  </g>
                )
              }} />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {dados.map(d => {
              const desvio = d.percMedidoContratado - d.percPrazo
              const cor = desvio >= -5 ? 'bg-green-500' : desvio >= -15 ? 'bg-yellow-500' : 'bg-red-500'
              return (
                <div key={d.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className={`w-3 h-3 rounded-full ${cor}`} />
                  <span className="font-mono font-bold text-gray-700">{d.sigla}</span>
                  <span className="text-gray-400 truncate max-w-32">{d.nome?.substring(0, 25)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Desempenho por Obra</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Obra', 'BAC (Orçado)', 'Contratado', 'Desvio Orc.', 'Medido', '% Med/Cont', '% Med/Orc', '% Prazo', 'Status'].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dados.map(d => {
                const desvio = d.percMedidoContratado - d.percPrazo
                const situacao = desvio >= -5 ? 'No Prazo' : desvio >= -15 ? 'Em Atenção' : 'Em Atraso'
                const corSituacao = desvio >= -5 ? 'bg-green-100 text-green-700' : desvio >= -15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                const corDesvioOrc = d.desvioOrc === null ? '' : d.desvioOrc > 0 ? 'text-red-600' : 'text-green-600'
                const IconDesvio = d.desvioOrc === null ? Minus : d.desvioOrc > 0 ? TrendingUp : TrendingDown
                return (
                  <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/obras/${d.id}`} className="hover:underline">
                        <p className="font-medium text-gray-800 text-xs">{d.nome}</p>
                        <p className="text-xs text-gray-400">{d.codigo}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {d.bac > 0 ? <span style={{ color: '#233772' }} className="font-semibold">{formatarMoeda(d.bac)}</span> : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{formatarMoeda(d.contratado)}</td>
                    <td className="px-4 py-3 text-right">
                      {d.desvioOrc !== null ? (
                        <span className={`flex items-center justify-end gap-1 text-sm font-medium ${corDesvioOrc}`}>
                          <IconDesvio size={12} />
                          {d.desvioOrc > 0 ? '+' : ''}{formatarMoeda(Math.abs(d.desvioOrc))}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">{formatarMoeda(d.medido)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold" style={{ color: '#233772' }}>{d.percMedidoContratado}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.percMedidoOrcado !== null
                        ? <span className="text-sm font-semibold text-indigo-600">{d.percMedidoOrcado}%</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{d.percPrazo}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${corSituacao}`}>{situacao}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Total</td>
                <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: '#233772' }}>
                  {totais.bac > 0 ? formatarMoeda(totais.bac) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-700">{formatarMoeda(totais.contratado)}</td>
                <td className="px-4 py-3 text-right text-sm font-bold">
                  {totais.bac > 0 && (
                    <span className={totais.contratado > totais.bac ? 'text-red-600' : 'text-green-600'}>
                      {totais.contratado > totais.bac ? '+' : ''}{formatarMoeda(totais.contratado - totais.bac)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-700">{formatarMoeda(totais.medido)}</td>
                <td className="px-4 py-3 text-center text-sm font-bold" style={{ color: '#233772' }}>
                  {totais.contratado > 0 ? `${((totais.medido / totais.contratado) * 100).toFixed(1)}%` : '—'}
                </td>
                <td className="px-4 py-3 text-center text-sm font-bold text-indigo-600">
                  {totais.bac > 0 ? `${((totais.medido / totais.bac) * 100).toFixed(1)}%` : '—'}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
