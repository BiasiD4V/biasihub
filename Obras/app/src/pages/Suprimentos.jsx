import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShoppingCart, DollarSign, AlertTriangle, CheckCircle, Loader2, Filter } from 'lucide-react'
import { obrasService, pedidosCompraService } from '../lib/supabase'
import { formatarMoeda } from '../lib/calculos'
import useObrasAcessiveis from '../hooks/useObrasAcessiveis'
import KpiCard from '../components/ui/KpiCard'
import SearchableSelect, { obrasParaOptions } from '../components/ui/SearchableSelect'

const STATUS_CFG = {
  pendente:     { label: 'Pendente',     cls: 'bg-yellow-100 text-yellow-700' },
  em_andamento: { label: 'Em Andamento', cls: 'bg-blue-100 text-blue-700'   },
  concluido:    { label: 'Concluído',    cls: 'bg-green-100 text-green-700' },
  cancelado:    { label: 'Cancelado',    cls: 'bg-red-100 text-red-600'     },
}

const FILTRO_AUTORIZACAO = [
  { id: '',     label: 'Todos'          },
  { id: 'sim',  label: 'Autorizados'   },
  { id: 'nao',  label: 'Não autorizados' },
]

export default function Suprimentos() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [todasObras, setTodasObras] = useState([])
  const [pedidos,    setPedidos]    = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroObra,     setFiltroObra]     = useState('')
  const [filtroStatus,   setFiltroStatus]   = useState('')
  const [filtroAut,      setFiltroAut]      = useState('')
  // Pré-preenche busca a partir do parâmetro ?busca= (ex: navegação via ObraDetalhe)
  const [filtroBusca,    setFiltroBusca]    = useState(() => searchParams.get('busca') || '')

  const obras = useObrasAcessiveis(todasObras)

  useEffect(() => {
    Promise.all([
      obrasService.listar(),
      pedidosCompraService.listarTodos(),
    ]).then(([o, p]) => {
      setTodasObras(o || [])
      setPedidos(p || [])
    }).catch(err => console.error('Erro ao carregar suprimentos:', err))
      .finally(() => setCarregando(false))
  }, [])

  // Mapa obraId → obra para lookup rápido
  const obrasMap = useMemo(() => {
    const map = {}
    obras.forEach(o => { map[o.id] = o })
    return map
  }, [obras])

  // IDs de obras acessíveis para filtrar pedidos
  const obrasAcessiveisIds = useMemo(() => new Set(obras.map(o => o.id)), [obras])

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      if (!obrasAcessiveisIds.has(p.obra_id))    return false
      if (filtroObra   && p.obra_id !== filtroObra)    return false
      if (filtroStatus && p.status  !== filtroStatus)  return false
      if (filtroAut === 'sim' && !p.autorizado)        return false
      if (filtroAut === 'nao' && p.autorizado)         return false
      if (filtroBusca) {
        const q = filtroBusca.toLowerCase()
        const obra = obrasMap[p.obra_id]
        return (
          (obra?.nome?.toLowerCase().includes(q)) ||
          (String(p.sienge_id || '').toLowerCase().includes(q)) ||
          (p.condicao_pagamento?.toLowerCase().includes(q)) ||
          (p.empresa_faturamento?.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [pedidos, obrasAcessiveisIds, filtroObra, filtroStatus, filtroAut, filtroBusca, obrasMap])

  const stats = useMemo(() => {
    const base = pedidos.filter(p => obrasAcessiveisIds.has(p.obra_id))
    const total      = base.length
    const pendentes  = base.filter(p => !p.autorizado).length
    const autorizado = base.filter(p => p.autorizado)
    const valorTotal = base.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)
    const valorAut   = autorizado.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)
    return { total, pendentes, valorTotal, valorAut }
  }, [pedidos, obrasAcessiveisIds])

  if (carregando) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="animate-spin" style={{ color: '#233772' }} />
    </div>
  )

  const opcoesObra = [
    { value: '', label: 'Todas as obras' },
    ...obrasParaOptions(obras),
  ]

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard titulo="Total Pedidos"        valor={stats.total.toString()}          icone={ShoppingCart}   cor="blue"   />
        <KpiCard titulo="Pendentes Autorização" valor={stats.pendentes.toString()}      icone={AlertTriangle}  cor={stats.pendentes > 0 ? 'yellow' : 'green'} />
        <KpiCard titulo="Valor Total"          valor={formatarMoeda(stats.valorTotal)} icone={DollarSign}     cor="blue"   />
        <KpiCard titulo="Valor Autorizado"     valor={formatarMoeda(stats.valorAut)}   icone={CheckCircle}    cor="green"  />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={14} style={{ color: '#B3B3B3' }} />

          {/* Obra */}
          <div className="min-w-[200px]">
            <SearchableSelect
              options={opcoesObra}
              value={filtroObra}
              onChange={setFiltroObra}
              placeholder="Todas as obras"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-1 flex-wrap">
            {[{ id: '', label: 'Todos status' }, ...Object.entries(STATUS_CFG).map(([id, { label }]) => ({ id, label }))].map(s => (
              <button
                key={s.id}
                onClick={() => setFiltroStatus(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filtroStatus === s.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={filtroStatus === s.id ? { backgroundColor: '#233772' } : {}}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Autorização */}
          <div className="flex items-center gap-1">
            {FILTRO_AUTORIZACAO.map(a => (
              <button
                key={a.id}
                onClick={() => setFiltroAut(a.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filtroAut === a.id ? 'font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={filtroAut === a.id ? { backgroundColor: '#FFC82D', color: '#1a1a1a' } : {}}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Busca livre */}
          <input
            type="text"
            placeholder="Buscar..."
            value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 ml-auto"
            style={{ '--tw-ring-color': '#233772', minWidth: 160 }}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
          <span className="text-sm font-semibold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
            Pedidos de Compra
          </span>
          <span className="text-xs text-gray-400">{pedidosFiltrados.length} resultado{pedidosFiltrados.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['ID Sienge', 'Obra', 'Data', 'Valor Total', 'Cond. Pgto', 'Status', 'Autorizado'].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    Nenhum pedido encontrado com os filtros aplicados
                  </td>
                </tr>
              ) : pedidosFiltrados.slice(0, 200).map(p => {
                const obra = obrasMap[p.obra_id]
                const stCfg = STATUS_CFG[p.status] || { label: p.status || '—', cls: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.sienge_id || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-slate-700">{obra?.nome || p.obra_id || '—'}</span>
                      {obra?.codigo && <span className="ml-1.5 text-[10px] text-slate-400">{obra.codigo}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                      {formatarMoeda(parseFloat(p.valor_total) || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{p.condicao_pagamento || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stCfg.cls}`}>
                        {stCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.autorizado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.autorizado ? 'Sim' : 'Não'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {pedidosFiltrados.length > 200 && (
            <p className="text-center text-xs text-slate-400 py-3 border-t border-slate-50">
              Mostrando 200 de {pedidosFiltrados.length} pedidos
            </p>
          )}
        </div>
      </div>

    </div>
  )
}
