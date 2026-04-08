import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Building2, Calendar, DollarSign, ClipboardCheck,
  AlertTriangle, CheckCircle2, Clock, TrendingUp, FileText, ExternalLink
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { contratosService, medicoesContratoService, obrasService } from '../lib/supabase'
import { formatarMoeda, calcularEvolucaoMensal } from '../lib/calculos'
import KpiCard from '../components/ui/KpiCard'

const STATUS_CFG = {
  em_andamento: { label: 'Em Andamento', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  concluido:    { label: 'Concluído',    cls: 'bg-green-50 text-green-700 border border-green-200' },
  cancelado:    { label: 'Cancelado',    cls: 'bg-red-50 text-red-600 border border-red-200' },
}

const APROVACAO_CFG = {
  aprovada:  { label: 'Aprovada',  cls: 'bg-green-100 text-green-700' },
  rejeitada: { label: 'Rejeitada', cls: 'bg-red-100 text-red-700' },
  pendente:  { label: 'Pendente',  cls: 'bg-yellow-100 text-yellow-700' },
}

export default function ContratoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contrato, setContrato] = useState(null)
  const [obra, setObra] = useState(null)
  const [medicoes, setMedicoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        const ct = await contratosService.buscarPorId(id)
        setContrato(ct)
        const [ob, med] = await Promise.all([
          obrasService.buscarPorId(ct.obra_id).catch(() => null),
          medicoesContratoService.listarPorContrato(ct.sienge_doc_id, ct.sienge_contract_num),
        ])
        setObra(ob)
        setMedicoes(med || [])
      } catch (err) {
        setErro(err.message)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [id])

  const stats = useMemo(() => {
    if (!contrato) return {}
    const valorTotal = parseFloat(contrato.valor_total) || 0
    const totalBruto = medicoes.reduce((s, m) => s + (parseFloat(m.valor_mao_obra) || 0) + (parseFloat(m.valor_material) || 0), 0)
    const totalMedido = medicoes.reduce((s, m) => s + (parseFloat(m.valor_liquido) || 0), 0)
    const saldo = valorTotal - totalMedido
    const percExec = valorTotal > 0 ? (totalMedido / valorTotal) * 100 : 0
    const pendentes = medicoes.filter(m => m.aprovacao === 'pendente').length
    const hoje = new Date()
    const vencidas = medicoes.filter(m => m.data_vencimento && new Date(m.data_vencimento) < hoje && !m.finalizada).length
    const finalizadas = medicoes.filter(m => m.finalizada).length
    return { valorTotal, totalBruto, totalMedido, saldo, percExec, pendentes, vencidas, finalizadas }
  }, [contrato, medicoes])

  const evolucao = useMemo(() => calcularEvolucaoMensal(medicoes), [medicoes])

  const medicoesOrdenadas = useMemo(() =>
    [...medicoes].sort((a, b) => (a.numero_medicao || 0) - (b.numero_medicao || 0)),
    [medicoes]
  )

  if (carregando) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="animate-spin" style={{ color: '#233772' }} />
    </div>
  )

  if (erro || !contrato) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertTriangle size={32} className="text-red-400" />
      <p className="text-gray-500">{erro || 'Contrato não encontrado.'}</p>
      <button onClick={() => navigate('/contratos')} className="text-sm font-medium" style={{ color: '#233772' }}>
        ← Voltar para Contratos
      </button>
    </div>
  )

  const sCfg = STATUS_CFG[contrato.status] || STATUS_CFG.em_andamento
  const hoje = new Date()
  const dataFim = contrato.data_fim ? new Date(contrato.data_fim) : null
  const diasRestantes = dataFim ? Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/contratos" className="flex items-center gap-1 hover:text-gray-700 transition-colors">
          <ArrowLeft size={14} /> Contratos
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-700">{contrato.sienge_contract_num}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="font-mono text-lg font-bold text-gray-800">{contrato.sienge_contract_num}</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${sCfg.cls}`}>{sCfg.label}</span>
              {stats.vencidas > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                  <AlertTriangle size={10} /> {stats.vencidas} vencida{stats.vencidas > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{contrato.fornecedor || '—'}</h1>
            {contrato.descricao && (
              <p className="text-sm text-gray-500">{contrato.descricao}</p>
            )}
          </div>
          <div className="flex flex-col items-start md:items-end gap-1.5 text-sm text-gray-500 flex-shrink-0">
            {obra && (
              <Link to={`/obras/${obra.id}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <Building2 size={14} />
                <span className="font-medium">{obra.codigo} — {obra.nome}</span>
                <ExternalLink size={12} />
              </Link>
            )}
            {contrato.data_inicio && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(contrato.data_inicio).toLocaleDateString('pt-BR')}
                {contrato.data_fim && <> → {new Date(contrato.data_fim).toLocaleDateString('pt-BR')}</>}
              </span>
            )}
            {diasRestantes !== null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                diasRestantes < 0 ? 'bg-red-50 text-red-600' :
                diasRestantes < 30 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {diasRestantes < 0 ? `Venceu há ${Math.abs(diasRestantes)}d` :
                 diasRestantes === 0 ? 'Vence hoje' : `${diasRestantes}d restantes`}
              </span>
            )}
          </div>
        </div>

        {/* Barra de execução */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 font-medium">Execução financeira</span>
            <span className="text-sm font-bold" style={{ color: '#233772' }}>{(stats.percExec || 0).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${Math.min(stats.percExec || 0, 100)}%`,
                backgroundColor: (stats.percExec || 0) >= 100 ? '#16a34a' :
                                  (stats.percExec || 0) >= 80  ? '#f97316' : '#233772'
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatarMoeda(stats.totalMedido)} medido</span>
            <span>{formatarMoeda(stats.valorTotal)} contratado</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard titulo="Valor Contratado" valor={formatarMoeda(stats.valorTotal)} icone={DollarSign} cor="blue" />
        <KpiCard titulo="Valor Bruto Medido" valor={formatarMoeda(stats.totalBruto)} subtitulo="MO + Material" icone={TrendingUp} cor="blue" />
        <KpiCard titulo="Valor Líquido Medido" valor={formatarMoeda(stats.totalMedido)} subtitulo={`${(stats.percExec || 0).toFixed(1)}% executado`} icone={TrendingUp} cor="green" />
        <KpiCard titulo="Saldo a Medir" valor={formatarMoeda(stats.saldo || 0)} icone={Clock} cor={(stats.saldo || 0) < 0 ? 'red' : 'yellow'} />
        <KpiCard titulo="Medições" valor={medicoes.length.toString()} subtitulo={`${stats.finalizadas} finalizadas · ${stats.pendentes} pendentes`} icone={ClipboardCheck} cor="blue" />
      </div>

      {/* Gráfico evolução */}
      {evolucao.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Evolução das Medições por Mês</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={evolucao} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip formatter={v => [formatarMoeda(v)]} labelStyle={{ fontWeight: 600 }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="valor" name="Medido no Mês" fill="#FFC82D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de medições */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Boletins de Medição
            <span className="ml-2 text-sm font-normal text-gray-400">({medicoes.length})</span>
          </h2>
          {stats.pendentes > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
              {stats.pendentes} pendente{stats.pendentes > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {medicoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText size={32} className="text-gray-200" />
            <p className="text-sm text-gray-400">Nenhuma medição registrada para este contrato.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Nº Med.', 'Data Medição', 'Vencimento', 'MO', 'Material', 'Valor Bruto', 'Valor Líquido', 'Aprovação', 'Finalizada'].map(col => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {medicoesOrdenadas.map((m, i) => {
                  const vencida = m.data_vencimento && new Date(m.data_vencimento) < hoje && !m.finalizada
                  const apCfg = APROVACAO_CFG[m.aprovacao] || APROVACAO_CFG.pendente
                  return (
                    <tr key={i} className={`hover:bg-gray-50/50 transition-colors ${vencida ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3 font-bold text-center" style={{ color: '#233772' }}>
                        #{m.numero_medicao}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {m.data_medicao ? new Date(m.data_medicao).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={vencida ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {m.data_vencimento ? new Date(m.data_vencimento).toLocaleDateString('pt-BR') : '—'}
                        </span>
                        {vencida && <AlertTriangle size={11} className="inline ml-1 text-red-500" />}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600">
                        {formatarMoeda(parseFloat(m.valor_mao_obra) || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600">
                        {formatarMoeda(parseFloat(m.valor_material) || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-gray-700">
                        {formatarMoeda((parseFloat(m.valor_mao_obra) || 0) + (parseFloat(m.valor_material) || 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold" style={{ color: '#233772' }}>
                        {formatarMoeda(parseFloat(m.valor_liquido) || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${apCfg.cls}`}>
                          {apCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.finalizada
                          ? <CheckCircle2 size={15} className="text-green-500 inline" />
                          : <Clock size={15} className="text-gray-300 inline" />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-500 text-right">
                    TOTAL ({medicoes.length} medições)
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">
                    {formatarMoeda(medicoes.reduce((s, m) => s + (parseFloat(m.valor_material) || 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">
                    {formatarMoeda(stats.totalBruto || 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold" style={{ color: '#233772' }}>
                    {formatarMoeda(stats.totalMedido || 0)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
