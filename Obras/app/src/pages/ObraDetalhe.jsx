import React, { useState, useEffect } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, DollarSign, FileText, ClipboardCheck, ShoppingCart,
  Calendar, Building2, MapPin, Loader2, ChevronDown, ChevronRight, AlertCircle,
  Pencil, Check, X as XIcon, Package, TrendingUp
} from 'lucide-react'
import { supabase, obrasService, contratosService, medicoesContratoService, pedidosCompraService } from '../lib/supabase'
import { formatarMoeda, calcularResumoFinanceiroObra, calcularEvolucaoMensal } from '../lib/calculos'
import KpiCard from '../components/ui/KpiCard'
import { useAuth } from '../context/AuthContext'
import { useObra } from '../context/ObraContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const ESTADOS_BR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

function roleBiasi(ct) {
  // contractType vem do Sienge como enum explícito
  if (ct.tipo_contrato === 'CONTRACTED') return 'executa'   // cliente externo contratou a Biasi
  if (ct.tipo_contrato === 'CONTRACTOR') return 'contrata'  // Biasi está contratando fornecedor
  // fallback para contratos antigos sem tipo_contrato
  return ct.fornecedor ? 'contrata' : 'executa'
}

const ROLE_CFG = {
  executa:  { label: 'Biasi Executa',  cls: 'bg-green-50 text-green-700 border border-green-200' },
  contrata: { label: 'Biasi Contrata', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
}

const TABS = [
  { id: 'resumo', label: 'Resumo', icone: Building2 },
  { id: 'contratos', label: 'Contratos', icone: FileText },
  { id: 'medicoes', label: 'Medições', icone: ClipboardCheck },
  { id: 'pedidos', label: 'Pedidos', icone: ShoppingCart },
]

function TabResumo({ obra, contratos, medicoes, pedidos, onClienteAtualizado }) {
  // Separar contratos por papel da Biasi
  const contratosContratada  = contratos.filter(c => roleBiasi(c) === 'executa')  // Biasi é contratada (receita)
  const contratosContratante = contratos.filter(c => roleBiasi(c) === 'contrata') // Biasi é contratante (custo)

  // Resumo financeiro baseado apenas nos contratos onde Biasi é contratada
  const fin = calcularResumoFinanceiroObra(contratosContratada, medicoes)
  const totalCustoFornecedores = contratosContratante.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)

  const evolucao = calcularEvolucaoMensal(medicoes)
  const pendentes = medicoes.filter(m => m.aprovacao === 'pendente').length
  const pedidosPend = pedidos.filter(p => !p.autorizado).length
  const totalPedidos = pedidos.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)
  const totalPedidosAut = pedidos.filter(p => p.autorizado).reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)

  // Usa cliente do contrato CONTRACTED (Biasi executa) como fallback
  const clienteContrato = contratosContratada.find(c => c.cliente_contrato)?.cliente_contrato || null
  const clienteDisplay = (obra.cliente && obra.cliente !== '-') ? obra.cliente : (clienteContrato || '—')

  // Edição de cliente inline
  const [editandoCliente, setEditandoCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState(() => (obra.cliente && obra.cliente !== '-') ? obra.cliente : (clienteContrato || ''))
  const [salvandoCliente, setSalvandoCliente] = useState(false)

  async function salvarCliente() {
    if (!novoCliente.trim()) return
    setSalvandoCliente(true)
    try {
      const { error } = await supabase.from('obras').update({ cliente: novoCliente.trim() }).eq('id', obra.id)
      if (!error) {
        onClienteAtualizado(novoCliente.trim())
        setEditandoCliente(false)
      }
    } finally {
      setSalvandoCliente(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          titulo="Contratado"
          valor={formatarMoeda(fin.totalContratado)}
          icone={DollarSign}
          cor="blue"
          subtitulo={`${contratosContratada.length} contrato${contratosContratada.length !== 1 ? 's' : ''} (contratada)`}
        />
        <KpiCard titulo="Medido" valor={formatarMoeda(fin.totalMedido)} icone={ClipboardCheck} cor="green" subtitulo={`${fin.percMedido.toFixed(1)}% executado`} />
        <KpiCard titulo="A Medir" valor={formatarMoeda(fin.totalPendente)} icone={AlertCircle} cor={fin.totalPendente > 0 ? 'yellow' : 'green'} subtitulo={`${pendentes} medições pendentes`} />
        <KpiCard titulo="Suprimentos" valor={formatarMoeda(totalPedidos)} icone={Package} cor={pedidosPend > 0 ? 'yellow' : 'gray'} subtitulo={`${pedidos.length} pedidos · ${pedidosPend} pend.`} />
      </div>

      {/* Detalhes da obra */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-xl p-5">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Building2 size={16} style={{ color: '#233772' }} /> Dados da Obra
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
              <span className="text-slate-500">Código</span>
              <span className="font-medium text-slate-700">{obra.codigo}</span>
            </div>

            {/* Cliente — editável */}
            <div className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-2">
              <span className="text-slate-500 flex-shrink-0">Cliente</span>
              {editandoCliente ? (
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <input
                    value={novoCliente}
                    onChange={e => setNovoCliente(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && salvarCliente()}
                    className="border border-slate-300 rounded px-2 py-0.5 text-sm text-slate-700 focus:outline-none focus:ring-2 flex-1 max-w-[200px]"
                    autoFocus
                  />
                  <button onClick={salvarCliente} disabled={salvandoCliente} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check size={14} />
                  </button>
                  <button onClick={() => { setEditandoCliente(false); setNovoCliente(obra.cliente || '') }} className="p-1 text-slate-400 hover:bg-slate-50 rounded">
                    <XIcon size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-700">{clienteDisplay}</span>
                  <button onClick={() => setEditandoCliente(true)} className="p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded">
                    <Pencil size={12} />
                  </button>
                </div>
              )}
            </div>

            {[
              { label: 'Endereço', valor: obra.endereco || '—' },
              { label: 'Cidade', valor: obra.cidade ? `${obra.cidade}${obra.estado ? ` - ${obra.estado}` : ''}` : (obra.estado || '—') },
              { label: 'Data Início', valor: obra.data_inicio ? new Date(obra.data_inicio).toLocaleDateString('pt-BR') : '—' },
              { label: 'Previsão Término', valor: obra.data_fim_prevista ? new Date(obra.data_fim_prevista).toLocaleDateString('pt-BR') : '—' },
              { label: 'Valor Contrato', valor: formatarMoeda(parseFloat(obra.valor_contrato) || 0) },
              { label: 'Status', valor: obra.status },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-medium text-slate-700">{item.valor}</span>
              </div>
            ))}
          </div>
          {obra.descricao && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">{obra.descricao}</p>
            </div>
          )}
        </div>

        {/* Resumo financeiro — 2 colunas: Faturamento + Suprimentos */}
        <div className="space-y-4">
          {/* Faturamento — contratos onde Biasi é CONTRATADA (receita) */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <h3 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <DollarSign size={16} style={{ color: '#233772' }} /> Faturamento
            </h3>
            <p className="text-[11px] text-green-600 font-medium mb-3">Biasi Executa · {contratosContratada.length} contrato{contratosContratada.length !== 1 ? 's' : ''}</p>
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'Mão de Obra', valor: formatarMoeda(fin.totalMaoObra) },
                { label: 'Material', valor: formatarMoeda(fin.totalMaterial) },
                { label: 'Total Contratado', valor: formatarMoeda(fin.totalContratado), bold: true },
                { label: 'Total Medido', valor: formatarMoeda(fin.totalMedido), bold: true },
                { label: 'Saldo a Medir', valor: formatarMoeda(fin.totalPendente), cor: fin.totalPendente > 0 ? 'amber' : 'green' },
                { label: '% Executado', valor: `${fin.percMedido.toFixed(1)}%`, bold: true },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-500">{item.label}</span>
                  <span className={`${item.bold ? 'font-bold' : 'font-medium'} ${item.cor === 'amber' ? 'text-amber-600' : item.cor === 'green' ? 'text-green-600' : 'text-slate-700'}`}>
                    {item.valor}
                  </span>
                </div>
              ))}
            </div>
            {/* Custos com fornecedores — contratos onde Biasi é CONTRATANTE */}
            {contratosContratante.length > 0 && (
              <div className="mt-4 pt-3 border-t border-purple-100">
                <p className="text-[11px] text-purple-600 font-medium mb-2">Biasi Contrata · {contratosContratante.length} contrato{contratosContratante.length !== 1 ? 's' : ''} de fornecedores</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Custo Comprometido</span>
                  <span className="font-semibold text-purple-700">{formatarMoeda(totalCustoFornecedores)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Suprimentos (pedidos de compra) */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Package size={16} className="text-orange-500" /> Suprimentos (Compras)
              <span className="text-xs text-slate-400 font-normal ml-auto">módulo independente</span>
            </h3>
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'Total Comprometido', valor: formatarMoeda(totalPedidos), bold: true },
                { label: 'Autorizado', valor: formatarMoeda(totalPedidosAut), cor: 'green' },
                { label: 'Pendente Autorização', valor: formatarMoeda(totalPedidos - totalPedidosAut), cor: pedidosPend > 0 ? 'amber' : 'green' },
                { label: 'Qtd. Pedidos', valor: `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''}` },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-500">{item.label}</span>
                  <span className={`${item.bold ? 'font-bold' : 'font-medium'} ${item.cor === 'amber' ? 'text-amber-600' : item.cor === 'green' ? 'text-green-600' : 'text-slate-700'}`}>
                    {item.valor}
                  </span>
                </div>
              ))}
            </div>
            {totalPedidos > 0 && fin.totalContratado > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Compras / Contrato</span>
                  <span className="font-semibold text-slate-700">{((totalPedidos / fin.totalContratado) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min((totalPedidos / fin.totalContratado) * 100, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evolução mensal */}
      {evolucao.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Evolução Mensal de Medições</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [formatarMoeda(value), 'Valor Medido']}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="valor" fill="#233772" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function TabContratos({ contratos, medicoesPorContrato }) {
  const [expandido, setExpandido] = useState(null)

  const statusCores = {
    em_andamento: 'bg-blue-100 text-blue-700',
    concluido: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{contratos.length} contrato{contratos.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="w-8"></th>
              {['Fornecedor', 'Objeto', 'Status', 'Mão de Obra', 'Material', 'Total', 'Período'].map(col => (
                <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {contratos.map(c => {
              const isOpen = expandido === c.id
              const meds = medicoesPorContrato[`${c.sienge_doc_id}_${c.sienge_contract_num}`] || []
              return (
                <React.Fragment key={c.id}>
                  <tr className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setExpandido(isOpen ? null : c.id)}>
                    <td className="pl-3">
                      {meds.length > 0 && (
                        isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-slate-700 font-medium truncate block">{c.fornecedor || '—'}</span>
                      <span className={`inline-block mt-0.5 px-1.5 py-0 rounded text-[9px] font-medium ${ROLE_CFG[roleBiasi(c)].cls}`}>
                        {ROLE_CFG[roleBiasi(c)].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <span className="text-slate-600 text-xs truncate block">{c.objeto || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCores[c.status] || 'bg-gray-100 text-gray-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatarMoeda(parseFloat(c.valor_mao_obra) || 0)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatarMoeda(parseFloat(c.valor_material) || 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">{formatarMoeda(parseFloat(c.valor_total) || 0)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' }) : '—'}
                      {c.data_fim ? ` → ${new Date(c.data_fim).toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' })}` : ''}
                    </td>
                  </tr>
                  {/* Medições expandidas */}
                  {isOpen && meds.length > 0 && (
                    <tr>
                      <td colSpan={8} className="bg-slate-50 px-8 py-3">
                        <p className="text-xs font-semibold text-slate-500 mb-2">{meds.length} medição(ões)</p>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400">
                              {['Nº', 'Data', 'Vencimento', 'Valor Líquido', 'Aprovação', 'Finalizada'].map(h => (
                                <th key={h} className="text-left py-1 px-2 font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {meds.map((m, i) => (
                              <tr key={i} className="border-t border-slate-100">
                                <td className="py-1.5 px-2 font-mono">{m.numero_medicao}</td>
                                <td className="py-1.5 px-2">{m.data_medicao ? new Date(m.data_medicao).toLocaleDateString('pt-BR') : '—'}</td>
                                <td className="py-1.5 px-2">{m.data_vencimento ? new Date(m.data_vencimento).toLocaleDateString('pt-BR') : '—'}</td>
                                <td className="py-1.5 px-2 font-medium">{formatarMoeda(parseFloat(m.valor_liquido) || 0)}</td>
                                <td className="py-1.5 px-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    m.aprovacao === 'aprovada' ? 'bg-green-100 text-green-700' :
                                    m.aprovacao === 'rejeitada' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>{m.aprovacao}</span>
                                </td>
                                <td className="py-1.5 px-2">{m.finalizada ? 'Sim' : 'Não'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabMedicoes({ medicoes }) {
  const evolucao = calcularEvolucaoMensal(medicoes)
  const pendentes = medicoes.filter(m => m.aprovacao === 'pendente')
  const vencidas = medicoes.filter(m => m.data_vencimento && new Date(m.data_vencimento) < new Date() && !m.finalizada)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: '#233772' }}>{medicoes.length}</p>
          <p className="text-xs text-slate-500">Total Medições</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{pendentes.length}</p>
          <p className="text-xs text-slate-500">Pendentes</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{vencidas.length}</p>
          <p className="text-xs text-slate-500">Vencidas</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{formatarMoeda(medicoes.reduce((s, m) => s + (parseFloat(m.valor_liquido) || 0), 0))}</p>
          <p className="text-xs text-slate-500">Total Medido</p>
        </div>
      </div>

      {evolucao.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Medições Acumuladas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => [formatarMoeda(value), 'Acumulado']} />
              <Line type="monotone" dataKey="acumulado" stroke="#233772" strokeWidth={2} dot={{ fill: '#233772', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Últimas medições */}
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Contrato', 'Nº', 'Data', 'Vencimento', 'Valor Líquido', 'Aprovação', 'Finalizada'].map(col => (
                <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {medicoes.slice(0, 50).map((m, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{m.contrato_num}</td>
                <td className="px-4 py-2.5 font-medium">{m.numero_medicao}</td>
                <td className="px-4 py-2.5 text-xs">{m.data_medicao ? new Date(m.data_medicao).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className={m.data_vencimento && new Date(m.data_vencimento) < new Date() && !m.finalizada ? 'text-red-600 font-semibold' : ''}>
                    {m.data_vencimento ? new Date(m.data_vencimento).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-medium">{formatarMoeda(parseFloat(m.valor_liquido) || 0)}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    m.aprovacao === 'aprovada' ? 'bg-green-100 text-green-700' :
                    m.aprovacao === 'rejeitada' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{m.aprovacao}</span>
                </td>
                <td className="px-4 py-2.5 text-xs">{m.finalizada ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {medicoes.length > 50 && (
          <p className="text-center text-xs text-slate-400 py-3">Mostrando 50 de {medicoes.length} medições</p>
        )}
      </div>
    </div>
  )
}

function TabPedidos({ pedidos }) {
  const navigate = useNavigate()
  const totalValor = pedidos.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)
  const pendentes = pedidos.filter(p => !p.autorizado).length

  const statusCores = {
    pendente: 'bg-yellow-100 text-yellow-700',
    em_andamento: 'bg-blue-100 text-blue-700',
    concluido: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-600',
  }

  function abrirPedido(p) {
    navigate(`/suprimentos?busca=${p.sienge_id}`)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: '#233772' }}>{pedidos.length}</p>
          <p className="text-xs text-slate-500">Total Pedidos</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{pendentes}</p>
          <p className="text-xs text-slate-500">Não Autorizados</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: '#233772' }}>{formatarMoeda(totalValor)}</p>
          <p className="text-xs text-slate-500">Valor Total</p>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['ID Sienge', 'Fornecedor', 'Data', 'Status', 'Valor Total', 'Cond. Pgto', 'Autorizado'].map(col => (
                <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pedidos.slice(0, 50).map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => abrirPedido(p)}
                    className="font-mono text-xs font-semibold hover:underline"
                    style={{ color: '#233772' }}
                    title="Ver em Suprimentos"
                  >
                    {p.sienge_id}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-700 max-w-[180px]">
                  <span className="truncate block">{p.empresa_faturamento || p.comprador || '—'}</span>
                </td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap">{p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCores[p.status] || 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">{formatarMoeda(parseFloat(p.valor_total) || 0)}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{p.condicao_pagamento || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.autorizado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.autorizado ? 'Sim' : 'Não'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pedidos.length > 50 && (
          <p className="text-center text-xs text-slate-400 py-3">Mostrando 50 de {pedidos.length} pedidos</p>
        )}
      </div>
    </div>
  )
}

export default function ObraDetalhe() {
  const { id } = useParams()
  const { podeVerObra } = useAuth()
  const { setObraSelecionada } = useObra()
  const [tabAtiva, setTabAtiva] = useState('resumo')
  const [obra, setObra] = useState(null)
  const [contratos, setContratos] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        const [obraData, contratosData, medicoesData, pedidosData] = await Promise.all([
          obrasService.buscarPorId(id),
          contratosService.listarPorObra(id),
          medicoesContratoService.listarPorObra(id),
          pedidosCompraService.listarPorObra(id),
        ])
        setObra(obraData)
        setContratos(contratosData || [])
        setMedicoes(medicoesData || [])
        setPedidos(pedidosData || [])
        // Sincroniza seletor global do cabeçalho com a obra visualizada
        setObraSelecionada(id)
      } catch (err) {
        console.error('Erro ao carregar obra:', err)
        setErro(err.message)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [id])

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin" style={{ color: '#233772' }} />
      </div>
    )
  }

  if (erro || !obra) return <Navigate to="/obras" replace />
  if (!podeVerObra(id)) return <Navigate to="/obras" replace />

  // Agrupa medições por contrato para drill-down
  const medicoesPorContrato = {}
  medicoes.forEach(m => {
    const key = `${m.contrato_doc_id}_${m.contrato_num}`
    if (!medicoesPorContrato[key]) medicoesPorContrato[key] = []
    medicoesPorContrato[key].push(m)
  })

  function handleClienteAtualizado(novoNome) {
    setObra(prev => ({ ...prev, cliente: novoNome }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/obras" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-2 transition-colors">
            <ArrowLeft size={14} /> Voltar para Obras
          </Link>
          <h1 className="text-xl font-bold text-slate-800">{obra.nome}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {[obra.codigo, obra.cliente || null, obra.cidade ? `${obra.cidade}${obra.estado ? ` - ${obra.estado}` : ''}` : obra.estado].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs text-slate-400">Contratado (Biasi executa)</p>
          <p className="text-lg font-bold" style={{ color: '#233772' }}>
            {formatarMoeda(contratos.filter(c => roleBiasi(c) === 'executa').reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0))}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabAtiva(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all duration-150 border-b-2 ${
                tabAtiva === tab.id
                  ? 'border-[#233772] bg-blue-50/30'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
              style={tabAtiva === tab.id ? { color: '#233772' } : undefined}
            >
              <tab.icone size={14} />
              {tab.label}
              {tab.id === 'contratos' && <span className="text-[10px] bg-slate-100 px-1.5 rounded-full">{contratos.length}</span>}
              {tab.id === 'medicoes' && <span className="text-[10px] bg-slate-100 px-1.5 rounded-full">{medicoes.length}</span>}
              {tab.id === 'pedidos' && <span className="text-[10px] bg-slate-100 px-1.5 rounded-full">{pedidos.length}</span>}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tabAtiva === 'resumo' && <TabResumo obra={obra} contratos={contratos} medicoes={medicoes} pedidos={pedidos} onClienteAtualizado={handleClienteAtualizado} />}
          {tabAtiva === 'contratos' && <TabContratos contratos={contratos} medicoesPorContrato={medicoesPorContrato} />}
          {tabAtiva === 'medicoes' && <TabMedicoes medicoes={medicoes} />}
          {tabAtiva === 'pedidos' && <TabPedidos pedidos={pedidos} />}
        </div>
      </div>
    </div>
  )
}
