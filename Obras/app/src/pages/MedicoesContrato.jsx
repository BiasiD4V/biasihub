import React, { useState, useEffect, useMemo } from 'react'
import { Loader2, AlertTriangle, ClipboardCheck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { medicoesContratoService } from '../lib/supabase'
import { formatarMoeda, calcularEvolucaoMensal } from '../lib/calculos'
import KpiCard from '../components/ui/KpiCard'
import { useObra } from '../context/ObraContext'

export default function MedicoesContrato() {
  const { obraSelecionadaId } = useObra()
  const [medicoes, setMedicoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroAprovacao, setFiltroAprovacao] = useState('')

  useEffect(() => {
    medicoesContratoService.listarTodos()
      .then(data => setMedicoes(data || []))
      .catch(err => console.error(err))
      .finally(() => setCarregando(false))
  }, [])

  const filtradas = useMemo(() => {
    let mf = obraSelecionadaId ? medicoes.filter(m => m.obra_id === obraSelecionadaId) : medicoes
    if (filtroAprovacao) mf = mf.filter(m => m.aprovacao === filtroAprovacao)
    return mf
  }, [medicoes, obraSelecionadaId, filtroAprovacao])

  const totalBruto = filtradas.reduce((s, m) => s + (parseFloat(m.valor_mao_obra) || 0) + (parseFloat(m.valor_material) || 0), 0)
  const totalMedido = filtradas.reduce((s, m) => s + (parseFloat(m.valor_liquido) || 0), 0)
  const pendentes = filtradas.filter(m => m.aprovacao === 'pendente').length
  const hoje = new Date()
  const vencidas = filtradas.filter(m => m.data_vencimento && new Date(m.data_vencimento) < hoje && !m.finalizada).length
  const evolucao = useMemo(() => calcularEvolucaoMensal(filtradas), [filtradas])

  if (carregando) return <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: '#233772' }} /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Medições de Contrato</h1>
        <p className="text-sm text-gray-500 mt-0.5">{filtradas.length} medições {obraSelecionadaId ? 'da obra selecionada' : 'de todas as obras'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard titulo="Total Medições" valor={filtradas.length.toString()} icone={ClipboardCheck} cor="blue" />
        <KpiCard titulo="Valor Bruto" valor={formatarMoeda(totalBruto)} subtitulo="MO + Material" cor="blue" />
        <KpiCard titulo="Valor Líquido" valor={formatarMoeda(totalMedido)} subtitulo="Após deduções" cor="green" />
        <KpiCard titulo="Pendentes" valor={pendentes.toString()} cor="yellow" subtitulo="Aguardando aprovação" />
        <KpiCard titulo="Vencidas" valor={vencidas.toString()} icone={AlertTriangle} cor="red" subtitulo="Não finalizadas" />
      </div>

      {/* Filtro */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <select value={filtroAprovacao} onChange={e => setFiltroAprovacao(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white">
          <option value="">Todas as aprovações</option>
          <option value="pendente">Pendente</option>
          <option value="aprovada">Aprovada</option>
          <option value="rejeitada">Rejeitada</option>
        </select>
      </div>

      {/* Gráfico mensal */}
      {evolucao.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Medições por Mês</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [formatarMoeda(v), 'Valor']} />
              <Bar dataKey="valor" fill="#233772" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Contrato', 'Nº Med.', 'Data Medição', 'Vencimento', 'MO', 'Material', 'Valor Bruto', 'Valor Líquido', 'Aprovação', 'Finalizada'].map(col => (
                  <th key={col} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.slice(0, 100).map((m, i) => {
                const vencida = m.data_vencimento && new Date(m.data_vencimento) < hoje && !m.finalizada
                return (
                  <tr key={i} className={`hover:bg-gray-50/50 ${vencida ? 'bg-red-50/30' : ''}`}>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{m.contrato_num}</td>
                    <td className="px-3 py-2.5 font-medium text-center">{m.numero_medicao}</td>
                    <td className="px-3 py-2.5 text-xs">{m.data_medicao ? new Date(m.data_medicao).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className={vencida ? 'text-red-600 font-semibold' : ''}>
                        {m.data_vencimento ? new Date(m.data_vencimento).toLocaleDateString('pt-BR') : '—'}
                      </span>
                      {vencida && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs">{formatarMoeda(parseFloat(m.valor_mao_obra) || 0)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{formatarMoeda(parseFloat(m.valor_material) || 0)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700">{formatarMoeda((parseFloat(m.valor_mao_obra) || 0) + (parseFloat(m.valor_material) || 0))}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold" style={{ color: '#233772' }}>{formatarMoeda(parseFloat(m.valor_liquido) || 0)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        m.aprovacao === 'aprovada' ? 'bg-green-100 text-green-700' :
                        m.aprovacao === 'rejeitada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{m.aprovacao}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-center">{m.finalizada ? 'Sim' : 'Não'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtradas.length > 100 && (
            <p className="text-center text-xs text-gray-400 py-3">Mostrando 100 de {filtradas.length} medições</p>
          )}
        </div>
      </div>
    </div>
  )
}
