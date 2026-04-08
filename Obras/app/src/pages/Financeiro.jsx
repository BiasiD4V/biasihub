import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, TrendingUp, ArrowRight, Download, Loader2, ShoppingCart } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import { obrasService, contratosService, medicoesContratoService, pedidosCompraService } from '../lib/supabase'
import { formatarMoeda, calcularEvolucaoMensal } from '../lib/calculos'
import KpiCard from '../components/ui/KpiCard'
import { useObra } from '../context/ObraContext'

export default function Financeiro() {
  const { obraSelecionadaId } = useObra()
  const [obras, setObras] = useState([])
  const [contratos, setContratos] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        const [o, c, m, p] = await Promise.all([
          obrasService.listar(),
          contratosService.listarTodos(),
          medicoesContratoService.listarTodos(),
          pedidosCompraService.listarTodos(),
        ])
        setObras(o || [])
        setContratos(c || [])
        setMedicoes(m || [])
        setPedidos(p || [])
      } catch (err) {
        console.error('Erro ao carregar financeiro:', err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const dadosFiltrados = useMemo(() => {
    const cf = obraSelecionadaId ? contratos.filter(c => c.obra_id === obraSelecionadaId) : contratos
    const mf = obraSelecionadaId ? medicoes.filter(m => m.obra_id === obraSelecionadaId) : medicoes
    const pf = obraSelecionadaId ? pedidos.filter(p => p.obra_id === obraSelecionadaId) : pedidos
    return { contratos: cf, medicoes: mf, pedidos: pf }
  }, [contratos, medicoes, pedidos, obraSelecionadaId])

  const totais = useMemo(() => {
    const { contratos: cf, medicoes: mf, pedidos: pf } = dadosFiltrados
    const contratado = cf.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
    const medido = mf.reduce((s, m) => s + (parseFloat(m.valor_liquido) || 0), 0)
    const pedidosTotal = pf.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)
    return { contratado, medido, aMedir: contratado - medido, pedidosTotal }
  }, [dadosFiltrados])

  const evolucao = useMemo(() => calcularEvolucaoMensal(dadosFiltrados.medicoes), [dadosFiltrados.medicoes])

  const porObra = useMemo(() => {
    return obras.map(o => {
      const cObra = contratos.filter(c => c.obra_id === o.id)
      const mObra = medicoes.filter(m => m.obra_id === o.id)
      const pObra = pedidos.filter(p => p.obra_id === o.id)
      const contratado = cObra.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
      const medido = mObra.reduce((s, m) => s + (parseFloat(m.valor_liquido) || 0), 0)
      const pedidosVal = pObra.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)
      const perc = contratado > 0 ? (medido / contratado) * 100 : 0
      return { ...o, contratado, medido, pedidosVal, perc, numContratos: cObra.length }
    }).filter(o => o.contratado > 0 || o.medido > 0)
      .sort((a, b) => b.contratado - a.contratado)
  }, [obras, contratos, medicoes, pedidos])

  const percMedido = totais.contratado > 0 ? ((totais.medido / totais.contratado) * 100).toFixed(1) : '0'

  const exportarCSV = () => {
    const header = 'Código,Obra,Contratado,Medido,%Medido,Pedidos\n'
    const rows = porObra.map(o => `${o.codigo},"${o.nome}",${o.contratado.toFixed(2)},${o.medido.toFixed(2)},${o.perc.toFixed(1)},${o.pedidosVal.toFixed(2)}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `financeiro_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (carregando) return <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: '#233772' }} /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão consolidada financeira {obraSelecionadaId ? 'da obra selecionada' : 'de todas as obras'}</p>
        </div>
        <button onClick={exportarCSV} className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard titulo="Total Contratado" valor={formatarMoeda(totais.contratado)} icone={DollarSign} cor="blue" subtitulo={`${dadosFiltrados.contratos.length} contratos`} />
        <KpiCard titulo="Total Medido" valor={formatarMoeda(totais.medido)} icone={TrendingUp} cor="green" subtitulo={`${percMedido}% do contratado`} />
        <KpiCard titulo="A Medir" valor={formatarMoeda(totais.aMedir)} icone={ArrowRight} cor="yellow" subtitulo="Saldo dos contratos" />
        <KpiCard titulo="Pedidos de Compra" valor={formatarMoeda(totais.pedidosTotal)} icone={ShoppingCart} cor="gray" subtitulo={`${dadosFiltrados.pedidos.length} pedidos`} />
      </div>

      {/* Tabela por obra */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Financeiro por Obra</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Obra', 'Contratos', 'Contratado', 'Medido', '% Medido', 'Pedidos'].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {porObra.map(o => (
                <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/obras/${o.id}`} className="hover:underline">
                      <p className="font-medium text-gray-800 text-xs">{o.nome}</p>
                      <p className="text-xs text-gray-400">{o.codigo}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">{o.numContratos}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{formatarMoeda(o.contratado)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">{formatarMoeda(o.medido)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-gray-700">{o.perc.toFixed(1)}%</span>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(o.perc, 100)}%`, backgroundColor: '#233772' }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{formatarMoeda(o.pedidosVal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2" style={{ backgroundColor: '#eef1f8', borderColor: '#233772' }}>
                <td className="px-4 py-3 font-bold text-sm" style={{ color: '#233772' }}>TOTAL</td>
                <td className="px-4 py-3 text-center font-bold text-sm">{dadosFiltrados.contratos.length}</td>
                <td className="px-4 py-3 text-right font-bold text-sm">{formatarMoeda(totais.contratado)}</td>
                <td className="px-4 py-3 text-right font-bold text-sm">{formatarMoeda(totais.medido)}</td>
                <td className="px-4 py-3 text-center font-bold text-sm" style={{ color: '#233772' }}>{percMedido}%</td>
                <td className="px-4 py-3 text-right font-bold text-sm">{formatarMoeda(totais.pedidosTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Evolução mensal */}
      {evolucao.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-800">Evolução Financeira Mensal</h2>
            <p className="text-xs text-gray-400 mt-0.5">Medições mensais e acumulado</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolucao} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip formatter={(v) => [formatarMoeda(v)]} labelStyle={{ fontWeight: 600 }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#233772" strokeWidth={2.5} dot={{ fill: '#233772', r: 4 }} />
              <Line type="monotone" dataKey="valor" name="Mensal" stroke="#FFC82D" strokeWidth={2} dot={{ fill: '#FFC82D', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
