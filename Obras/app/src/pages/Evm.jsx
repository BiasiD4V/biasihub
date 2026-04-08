import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { TrendingUp, AlertCircle, Download, Zap } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { obrasService, planejamentoService } from '../lib/supabase'
import { useObra } from '../context/ObraContext'
import { formatarMoeda } from '../lib/calculos'

export default function Evm() {
  const { id: obraIdParam } = useParams()
  const { obraSelecionadaId } = useObra()
  const obraId = obraIdParam || obraSelecionadaId

  const [obra, setObra] = useState(null)
  const [planejamento, setPlanejamento] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!obraId) return
    carregar()
  }, [obraId])

  async function carregar() {
    try {
      setCarregando(true)
      const obraData = await obrasService.buscarPorId(obraId)
      setObra(obraData)

      // Carregar planejamento
      const { planejamento_metadata } = await planejamentoService.listarEapPorObra(obraId)
      setPlanejamento(planejamento_metadata)

      if (planejamento_metadata) {
        // Carregar snapshots EVM (últimos 12 meses)
        const snapshotsData = await planejamentoService.obterSnapshotsEvm(planejamento_metadata.id, 12)
        setSnapshots(snapshotsData || [])
      }

      setErro(null)
    } catch (err) {
      console.error('Erro ao carregar EVM:', err)
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  // Calcular KPIs do último snapshot
  const kpisAtuais = useMemo(() => {
    if (snapshots.length === 0) {
      return { VP: 0, VA: 0, CR: 0, IDC: 0, IDP: 0, EAC: 0, desvio_custo: 0, desvio_prazo: 0, status_custo: 'neutral', status_prazo: 'neutral' }
    }

    const latest = snapshots[snapshots.length - 1]
    const idc = latest.idc_mensal || 0
    const idp = latest.idp_mensal || 0

    return {
      VP: latest.vp_total || 0,
      VA: latest.va_total || 0,
      CR: latest.cr_total || 0,
      IDC: idc,
      IDP: idp,
      EAC: latest.vp_total ? (latest.vp_total / Math.max(idc, 0.01)) : 0, // EAC = BAC / IDC
      desvio_custo: latest.desvio_custo_mensal || 0,
      desvio_prazo: latest.desvio_prazo_mensal || 0,
      status_custo: idc >= 1 ? 'ok' : idc >= 0.95 ? 'warning' : 'critical',
      status_prazo: idp >= 1 ? 'ok' : idp >= 0.95 ? 'warning' : 'critical'
    }
  }, [snapshots])

  // Dados para gráficos
  const graficoEvm = useMemo(() => {
    return snapshots.map(s => ({
      mes: new Date(s.mes).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      VP: s.vp_total || 0,
      VA: s.va_total || 0,
      CR: s.cr_total || 0
    }))
  }, [snapshots])

  const graficoDesvios = useMemo(() => {
    return snapshots.map(s => ({
      mes: new Date(s.mes).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      'Desvio Custo': (s.desvio_custo_mensal || 0) / 1000, // Em milhares
      'Desvio Prazo': (s.desvio_prazo_mensal || 0) / 1000
    }))
  }, [snapshots])

  if (carregando) {
    return <div className="p-8 text-center"><Zap className="animate-spin mx-auto" /> Carregando EVM...</div>
  }

  const statusBgDevio = (status) => {
    if (status === 'ok') return 'bg-green-50 text-green-700'
    if (status === 'warning') return 'bg-yellow-50 text-yellow-700'
    return 'bg-red-50 text-red-700'
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{obra?.nome || 'EVM'}</h1>
          <p className="text-sm text-slate-500 mt-1">Earned Value Management - Análise de Desempenho</p>
        </div>
        <button className="px-3 py-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-semibold flex items-center gap-1">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {erro && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>{erro}</div>
        </div>
      )}

      {snapshots.length === 0 ? (
        <div className="p-8 bg-slate-50 text-center text-slate-600 rounded-lg">
          <TrendingUp className="mx-auto mb-3 text-slate-400" size={32} />
          <p className="font-semibold">Sem dados de EVM</p>
          <p className="text-sm mt-1">Snapshots EVM serão criados automaticamente a partir do apontamento semanal.</p>
        </div>
      ) : (
        <>
          {/* KPIs PRINCIPAIS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-semibold">VP (Planned Value)</p>
              <p className="text-xl font-bold text-blue-600 mt-2">{formatarMoeda(kpisAtuais.VP)}</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-semibold">VA (Earned Value)</p>
              <p className="text-xl font-bold text-green-600 mt-2">{formatarMoeda(kpisAtuais.VA)}</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-semibold">CR (Cost Resources)</p>
              <p className="text-xl font-bold text-amber-600 mt-2">{formatarMoeda(kpisAtuais.CR)}</p>
            </div>

            <div className={`p-4 rounded-lg border ${statusBgDevio(kpisAtuais.status_custo)}`}>
              <p className="text-xs uppercase font-semibold">IDC (Índice Desempenho Custo)</p>
              <p className="text-2xl font-bold mt-2">{kpisAtuais.IDC.toFixed(3)}</p>
              <p className="text-xs mt-1 opacity-75">
                {kpisAtuais.IDC >= 1 ? '✓ Sob custo' : kpisAtuais.IDC >= 0.95 ? '⚠ Próx. limite' : '✗ Custo acima'}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${statusBgDevio(kpisAtuais.status_prazo)}`}>
              <p className="text-xs uppercase font-semibold">IDP (Índice Desempenho Prazo)</p>
              <p className="text-2xl font-bold mt-2">{kpisAtuais.IDP.toFixed(3)}</p>
              <p className="text-xs mt-1 opacity-75">
                {kpisAtuais.IDP >= 1 ? '✓ Adiantado' : kpisAtuais.IDP >= 0.95 ? '⚠ Próx. limite' : '✗ Atrasado'}
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-semibold">EAC (Estima Custo Conclusão)</p>
              <p className="text-xl font-bold text-slate-900 mt-2">{formatarMoeda(kpisAtuais.EAC)}</p>
            </div>
          </div>

          {/* DESVIOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${kpisAtuais.desvio_custo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm font-semibold ${kpisAtuais.desvio_custo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                Desvio de Custo (CV): {formatarMoeda(kpisAtuais.desvio_custo)}
              </p>
              <p className={`text-xs mt-1 ${kpisAtuais.desvio_custo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpisAtuais.desvio_custo >= 0
                  ? '✓ Valor Agregado > Custo Realizado (economia)'
                  : '✗ Custo Realizado > Valor Agregado (despesa)'}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${kpisAtuais.desvio_prazo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm font-semibold ${kpisAtuais.desvio_prazo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                Desvio de Prazo (SV): {formatarMoeda(kpisAtuais.desvio_prazo)}
              </p>
              <p className={`text-xs mt-1 ${kpisAtuais.desvio_prazo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpisAtuais.desvio_prazo >= 0
                  ? '✓ Valor Agregado > Planejado (adiantado)'
                  : '✗ Planejado > Valor Agregado (atrasado)'}
              </p>
            </div>
          </div>

          {/* GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Curva EVM (VP vs VA vs CR) */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Curva EVM (VP · VA · CR)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={graficoEvm} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => [formatarMoeda(value), '']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="VP" stroke="#3b82f6" strokeWidth={2} name="Planejado (VP)" />
                  <Line type="monotone" dataKey="VA" stroke="#10b981" strokeWidth={2} name="Agregado (VA)" />
                  <Line type="monotone" dataKey="CR" stroke="#f59e0b" strokeWidth={2} name="Custo Real (CR)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Desvios mensais */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Desvios (Custo vs Prazo)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={graficoDesvios} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${v}k`} />
                  <Tooltip
                    formatter={(value) => `R$ ${(value * 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="Desvio Custo" fill="#ef4444" name="Desvio Custo" />
                  <Bar dataKey="Desvio Prazo" fill="#f59e0b" name="Desvio Prazo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABELA MENSAL RESUMIDA */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Mês</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">VP</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">VA</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">CR</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">IDC</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">IDP</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Desvio Custo</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Desvio Prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {snapshots.map((s, idx) => (
                  <tr key={idx} className={idx === snapshots.length - 1 ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {new Date(s.mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 text-xs">{formatarMoeda(s.vp_total || 0)}</td>
                    <td className="px-4 py-3 text-right text-green-600 text-xs font-semibold">{formatarMoeda(s.va_total || 0)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 text-xs">{formatarMoeda(s.cr_total || 0)}</td>
                    <td className={`px-4 py-3 text-right font-semibold text-xs ${
                      (s.idc_mensal || 0) >= 1 ? 'text-green-600' : (s.idc_mensal || 0) >= 0.95 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(s.idc_mensal || 0).toFixed(3)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold text-xs ${
                      (s.idp_mensal || 0) >= 1 ? 'text-green-600' : (s.idp_mensal || 0) >= 0.95 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(s.idp_mensal || 0).toFixed(3)}
                    </td>
                    <td className={`px-4 py-3 text-right text-xs ${(s.desvio_custo_mensal || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatarMoeda(s.desvio_custo_mensal || 0)}
                    </td>
                    <td className={`px-4 py-3 text-right text-xs ${(s.desvio_prazo_mensal || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatarMoeda(s.desvio_prazo_mensal || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* INTERPRETAÇÃO */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <p className="font-semibold mb-2">📊 Interpretação do Earned Value Management</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>VP (Planned Value):</strong> Valor que deveria ter sido executado até agora (baseline planejado)</li>
              <li><strong>VA (Earned Value):</strong> Valor que foi realmente executado (medições efetivas)</li>
              <li><strong>CR (Cost of Resources):</strong> Custo real dos recursos consumidos</li>
              <li><strong>IDC (Índice Desempenho Custo):</strong> VA ÷ CR. &gt;1 = economia; &lt;1 = déficit</li>
              <li><strong>IDP (Índice Desempenho Prazo):</strong> VA ÷ VP. &gt;1 = adiantado; &lt;1 = atrasado</li>
              <li><strong>EAC (Estima Custo Conclusão):</strong> Previsão do custo total (BAC ÷ IDC)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
