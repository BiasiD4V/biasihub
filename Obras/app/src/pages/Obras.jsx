import React, { useState, useEffect, useMemo } from 'react'
import useObrasAcessiveis from '../hooks/useObrasAcessiveis'
import { Link } from 'react-router-dom'
import {
  MapPin, Calendar, DollarSign, Search, Filter, ExternalLink,
  Building2, FileText, Loader2, X, ChevronDown, ChevronRight, FolderOpen,
} from 'lucide-react'
import { obrasService, contratosService, medicoesContratoService, pedidosCompraService } from '../lib/supabase'
import { formatarMoeda } from '../lib/calculos'

const ESTADOS_BR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const LOGRADOURO = /^(RUA|AV\.?|AVENIDA|ALAMEDA|AL\.?\s|RODOV|ROD\.?|ESTRADA|EST\.?|TRAVESSA|PRAÇA|LARGO|PARQUE|CAMINHO|VIELA|ACESSO)\b/i

function extrairCidade(valor) {
  if (!valor) return null
  const s = valor.trim()
  if (!s.includes(' - ')) {
    if (LOGRADOURO.test(s) || ESTADOS_BR.includes(s.toUpperCase())) return null
    return s
  }
  const partes = s.split(' - ').map(p => p.trim())
  for (let i = 1; i < partes.length; i++) {
    if (ESTADOS_BR.includes(partes[i].toUpperCase())) {
      const candidato = partes[i - 1]
      if (LOGRADOURO.test(candidato)) return null
      return candidato
    }
  }
  return null
}

function BarraExecucao({ contratado, medido }) {
  const perc = contratado > 0 ? Math.min((medido / contratado) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Executado</span>
        <span className="font-semibold text-gray-700">{perc.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${perc}%`,
            backgroundColor: perc >= 80 ? '#16a34a' : perc >= 40 ? '#FFC82D' : '#233772',
          }}
        />
      </div>
    </div>
  )
}

const statusLabel = {
  planejamento: 'Planejamento',
  ativa: 'Ativa',
  suspensa: 'Suspensa',
  concluida: 'Encerrada',
  cancelada: 'Cancelada',
}

const statusCores = {
  planejamento: 'bg-purple-100 text-purple-700 border-purple-200',
  ativa:        'bg-green-100 text-green-700 border-green-200',
  suspensa:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  concluida:    'bg-blue-100 text-blue-700 border-blue-200',
  cancelada:    'bg-red-100 text-red-700 border-red-200',
}

function ObraCard({ obra, resumo }) {
  const r = resumo || { qtd: 0, qtdContratada: 0, qtdContratante: 0, valorContratada: 0, valorContratante: 0, valorMedido: 0 }
  // Valor principal = contratos onde Biasi é CONTRATADA (receita da obra)
  const valorContratada = r.valorContratada || parseFloat(obra.valor_contrato) || 0
  const valorContratante = r.valorContratante || 0
  const qtdContratada = r.qtdContratada ?? r.qtd ?? 0
  const qtdContratante = r.qtdContratante ?? 0

  // Cliente: prioridade para registro da obra, fallback para cliente_contrato dos contratos CONTRACTED
  const clienteExibido = (obra.cliente && obra.cliente !== '-') ? obra.cliente : (r.clienteContrato || null)

  // Endereço: prioridade para endereço completo, fallback para cidade extraída
  const enderecoExibido = obra.endereco || null
  const cidadeExtraida = extrairCidade(obra.cidade)
  const localizacaoExibida = enderecoExibido || (cidadeExtraida ? `${cidadeExtraida}${obra.estado ? ` - ${obra.estado}` : ''}` : null)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-150 flex flex-col">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400 font-mono">{obra.codigo}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCores[obra.status] || 'bg-gray-100 text-gray-600'}`}>
                {statusLabel[obra.status] || obra.status}
              </span>
            </div>
            <h3 className="font-semibold text-gray-800 text-sm leading-snug">{obra.nome}</h3>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-gray-500">
          {clienteExibido && (
            <div className="flex items-center gap-1.5">
              <Building2 size={12} className="flex-shrink-0" style={{ color: '#233772' }} />
              <span className="truncate">{clienteExibido}</span>
            </div>
          )}
          {localizacaoExibida && (
            <div className="flex items-start gap-1.5">
              <MapPin size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#233772' }} />
              <span className="line-clamp-2 leading-snug">{localizacaoExibida}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="flex-shrink-0" style={{ color: '#233772' }} />
            <span>
              {obra.data_inicio ? new Date(obra.data_inicio).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'}
              {' → '}
              {obra.data_fim_prevista ? new Date(obra.data_fim_prevista).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'}
            </span>
          </div>
          {/* Contratos: Biasi Contratada (receita) */}
          <div className="flex items-center gap-1.5">
            <DollarSign size={12} className="flex-shrink-0" style={{ color: '#233772' }} />
            <span className="font-semibold text-gray-700">{formatarMoeda(valorContratada)}</span>
            {qtdContratada > 0 && (
              <span className="text-gray-400 ml-0.5">
                · {qtdContratada} contrato{qtdContratada !== 1 ? 's' : ''} <span className="text-green-600 font-medium">(contratada)</span>
              </span>
            )}
          </div>
          {/* Contratos: Biasi Contratante (custos com fornecedores) */}
          {qtdContratante > 0 && (
            <div className="flex items-center gap-1.5 pl-4 border-l-2 border-purple-100">
              <FileText size={11} className="flex-shrink-0 text-purple-400" />
              <span className="text-purple-600">
                {formatarMoeda(valorContratante)} · {qtdContratante} contrato{qtdContratante !== 1 ? 's' : ''} <span className="font-medium">(contratante)</span>
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-4 flex-1">
        <BarraExecucao contratado={valorContratada} medido={r.valorMedido} />
      </div>
      <div className="px-5 py-3 border-t border-gray-100">
        <Link
          to={`/obras/${obra.id}`}
          className="flex items-center justify-center gap-1.5 w-full text-xs font-medium py-1.5 rounded-md hover:bg-blue-50 transition-colors"
          style={{ color: '#233772' }}
        >
          Ver detalhes <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  )
}

function GrupoCentroCusto({ nome, obrasGrupo, resumos, defaultOpen }) {
  const [aberto, setAberto] = useState(defaultOpen ?? true)

  const totais = useMemo(() => ({
    obras: obrasGrupo.length,
    contratado: obrasGrupo.reduce((s, o) => s + (resumos[o.id]?.valorContratado || parseFloat(o.valor_contrato) || 0), 0),
    medido: obrasGrupo.reduce((s, o) => s + (resumos[o.id]?.valorMedido || 0), 0),
    contratos: obrasGrupo.reduce((s, o) => s + (resumos[o.id]?.qtd || 0), 0),
    ativas: obrasGrupo.filter(o => o.status === 'ativa').length,
  }), [obrasGrupo, resumos])

  const percTotal = totais.contratado > 0 ? (totais.medido / totais.contratado) * 100 : 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header do grupo */}
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FolderOpen size={18} style={{ color: '#FFC82D' }} className="flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="font-bold text-gray-800 text-sm truncate">{nome}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {totais.obras} obra{totais.obras !== 1 ? 's' : ''}
              {totais.ativas > 0 && ` · ${totais.ativas} ativa${totais.ativas !== 1 ? 's' : ''}`}
              {' · '}{totais.contratos} contrato{totais.contratos !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* KPIs compactos */}
        <div className="hidden md:flex items-center gap-6 text-right flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400">Contratado</p>
            <p className="text-sm font-bold text-gray-700">{formatarMoeda(totais.contratado)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Medido</p>
            <p className="text-sm font-bold" style={{ color: '#233772' }}>{formatarMoeda(totais.medido)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Execução</p>
            <p className="text-sm font-bold" style={{ color: percTotal >= 80 ? '#16a34a' : percTotal >= 40 ? '#d97706' : '#233772' }}>
              {percTotal.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 ml-2">
          {aberto
            ? <ChevronDown size={16} className="text-gray-400" />
            : <ChevronRight size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* Barra de progresso do grupo */}
      {totais.contratado > 0 && (
        <div className="px-5 pb-1">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(percTotal, 100)}%`,
                backgroundColor: percTotal >= 80 ? '#16a34a' : percTotal >= 40 ? '#FFC82D' : '#233772',
              }}
            />
          </div>
        </div>
      )}

      {/* Grid de obras */}
      {aberto && (
        <div className="p-5 pt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 border-t border-gray-50">
          {obrasGrupo.map(obra => (
            <ObraCard key={obra.id} obra={obra} resumo={resumos[obra.id]} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Obras() {
  const [obras, setObras] = useState([])
  const [resumos, setResumos] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('ativa')
  const [filtroCidade, setFiltroCidade] = useState('')
  const [filtroCC, setFiltroCC] = useState('')

  useEffect(() => {
    async function carregar() {
      try {
        const [data, allContratos, allMedicoes, allPedidos] = await Promise.all([
          obrasService.listar(),
          contratosService.listarTodos(),
          medicoesContratoService.listarTodos(),
          pedidosCompraService.listarTodos(),
        ])
        setObras(data || [])
        // Determina o papel da Biasi no contrato: CONTRACTED = Biasi executa, CONTRACTOR = Biasi contrata
        function roleBiasi(c) {
          if (c.tipo_contrato === 'CONTRACTED') return 'executa'
          if (c.tipo_contrato === 'CONTRACTOR') return 'contrata'
          return c.fornecedor ? 'contrata' : 'executa' // fallback para dados sem tipo_contrato
        }

        const map = {}
        for (const obra of (data || [])) {
          const cObra = allContratos.filter(c => c.obra_id === obra.id)
          const mObra = allMedicoes.filter(m => m.obra_id === obra.id)
          const pObra = allPedidos.filter(p => p.obra_id === obra.id)

          // Separar contratos por papel da Biasi
          const cContratada  = cObra.filter(c => roleBiasi(c) === 'executa')  // cliente contratou a Biasi
          const cContratante = cObra.filter(c => roleBiasi(c) === 'contrata') // Biasi contratou fornecedor

          const valorContratada  = cContratada.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
          const valorContratante = cContratante.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
          const valorMedido      = mObra.reduce((s, m) => s + (parseFloat(m.valor_liquido) || 0), 0)
          const valorPedidos     = pObra.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)

          // Cliente vem dos contratos onde Biasi é contratada (campo cliente_contrato)
          const clienteContrato = cContratada.find(c => c.cliente_contrato)?.cliente_contrato || null

          map[obra.id] = {
            qtd: cObra.length,
            qtdContratada: cContratada.length,
            qtdContratante: cContratante.length,
            valorContratado: valorContratada, // compat com GrupoCentroCusto (totais do grupo)
            valorContratada,
            valorContratante,
            valorMedido,
            valorPedidos,
            qtdPedidos: pObra.length,
            clienteContrato,
          }
        }
        setResumos(map)
      } catch (err) {
        console.error('Erro ao carregar obras:', err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  // Filtra obras acessíveis ao usuário (admin/master veem todas)
  const obrasAcessiveis = useObrasAcessiveis(obras)
  const obrasComMovimentos = useMemo(() => {
    if (Object.keys(resumos).length === 0) return []
    return obrasAcessiveis.filter(o => {
      const r = resumos[o.id]
      return r && (r.qtd > 0 || r.valorContratado > 0 || r.valorMedido > 0 || r.qtdPedidos > 0)
    })
  }, [obrasAcessiveis, resumos])

  const cidades = useMemo(() => {
    const set = new Set(obrasComMovimentos.map(o => extrairCidade(o.cidade)).filter(Boolean))
    return [...set].sort()
  }, [obrasComMovimentos])

  // Centros de custo únicos
  const centrosCusto = useMemo(() => {
    const set = new Set(obrasComMovimentos.map(o => o.centro_custo_nome).filter(Boolean))
    return [...set].sort()
  }, [obrasComMovimentos])

  const temHierarquia = centrosCusto.length > 0

  const obrasFiltradas = useMemo(() => {
    return obrasComMovimentos.filter(obra => {
      const matchBusca = !busca ||
        (obra.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (obra.cliente || '').toLowerCase().includes(busca.toLowerCase()) ||
        (obra.codigo || '').toLowerCase().includes(busca.toLowerCase())
      const matchStatus = !filtroStatus || obra.status === filtroStatus
      const cidadeObra = extrairCidade(obra.cidade)
      const matchCidade = !filtroCidade || cidadeObra === filtroCidade
      const matchCC = !filtroCC || obra.centro_custo_nome === filtroCC
      return matchBusca && matchStatus && matchCidade && matchCC
    })
  }, [obrasComMovimentos, busca, filtroStatus, filtroCidade, filtroCC])

  // Agrupa obras filtradas por centro de custo
  const grupos = useMemo(() => {
    if (!temHierarquia) return null
    const map = new Map()
    for (const obra of obrasFiltradas) {
      const cc = obra.centro_custo_nome || 'Sem Centro de Custo'
      if (!map.has(cc)) map.set(cc, [])
      map.get(cc).push(obra)
    }
    // Ordena grupos pelo nome
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [obrasFiltradas, temHierarquia])

  const filtrosAtivos = [filtroStatus !== 'ativa' ? filtroStatus : '', filtroCidade, filtroCC, busca].filter(Boolean).length

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin" style={{ color: '#233772' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Obras</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {temHierarquia
              ? `${grupos?.length ?? 0} centros de custo · ${obrasFiltradas.length} obras com movimentos`
              : `${obrasFiltradas.length} obras com movimentos`}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar obra, cliente ou código..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#233772' }}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={15} className="text-gray-400 flex-shrink-0" />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none text-gray-700 bg-white">
                <option value="">Todos os status</option>
                <option value="planejamento">Planejamento</option>
                <option value="ativa">Ativa</option>
                <option value="suspensa">Suspensa</option>
                <option value="concluida">Encerrada</option>
                <option value="cancelada">Cancelada</option>
              </select>
              {cidades.length > 1 && (
                <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none text-gray-700 bg-white">
                  <option value="">Todas as cidades</option>
                  {cidades.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {temHierarquia && centrosCusto.length > 1 && (
                <select value={filtroCC} onChange={e => setFiltroCC(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none text-gray-700 bg-white max-w-[220px]">
                  <option value="">Todos os centros</option>
                  {centrosCusto.map(cc => <option key={cc} value={cc}>{cc}</option>)}
                </select>
              )}
            </div>
          </div>
          {filtrosAtivos > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">{obrasFiltradas.length} de {obrasComMovimentos.length} obras</span>
              <button
                onClick={() => { setFiltroStatus('ativa'); setFiltroCidade(''); setFiltroCC(''); setBusca('') }}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium"
              >
                <X size={12} /> Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {obrasFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma obra encontrada</p>
          <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros de busca</p>
        </div>
      ) : temHierarquia ? (
        // Vista hierárquica: Centro de Custo → Obras
        <div className="space-y-4">
          {grupos.map(([nome, obrasGrupo], idx) => (
            <GrupoCentroCusto
              key={nome}
              nome={nome}
              obrasGrupo={obrasGrupo}
              resumos={resumos}
              defaultOpen={idx === 0 || grupos.length <= 3}
            />
          ))}
        </div>
      ) : (
        // Vista plana (fallback enquanto centros de custo não foram sincronizados)
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {obrasFiltradas.map(obra => (
            <ObraCard key={obra.id} obra={obra} resumo={resumos[obra.id]} />
          ))}
        </div>
      )}

      {/* Aviso quando não tem hierarquia */}
      {!temHierarquia && obrasComMovimentos.length > 0 && (
        <p className="text-xs text-center text-gray-400">
          Centros de custo serão carregados no próximo sync com o Sienge
        </p>
      )}
    </div>
  )
}
