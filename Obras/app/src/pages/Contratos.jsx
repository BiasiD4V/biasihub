import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSignature, DollarSign, TrendingUp, Clock, Filter, ChevronRight, Loader2 } from 'lucide-react'
import { contratosService, medicoesContratoService } from '../lib/supabase'
import { formatarMoeda } from '../lib/calculos'
import { useObra } from '../context/ObraContext'
import useObrasAcessiveis from '../hooks/useObrasAcessiveis';
import SearchableSelect, { obrasParaOptions } from '../components/ui/SearchableSelect'

const TIPO_LABEL = { material: 'Material', servico: 'Serviço', mao_de_obra: 'Mão de Obra' }
const TIPO_CLS   = {
  material:    'bg-blue-50 text-blue-700',
  servico:     'bg-orange-50 text-orange-700',
  mao_de_obra: 'bg-purple-50 text-purple-700',
}
const STATUS_CFG = {
  em_andamento: { label: 'Em Andamento', cls: 'bg-blue-50 text-blue-700' },
  concluido:    { label: 'Concluído',    cls: 'bg-green-50 text-green-700' },
  cancelado:    { label: 'Cancelado',    cls: 'bg-red-50 text-red-600' },
}

/** Papel da Biasi no contrato — usa o enum explícito do Sienge (contractType):
 *  CONTRACTED  → cliente externo contratou a Biasi → 'executa'
 *  CONTRACTOR  → Biasi está contratando um fornecedor → 'contrata'
 *  fallback    → verifica presença de fornecedor (dados antigos sem tipo_contrato)
 */
function roleBiasi(ct) {
  if (ct.tipo_contrato === 'CONTRACTED') return 'executa'
  if (ct.tipo_contrato === 'CONTRACTOR') return 'contrata'
  return ct.fornecedor ? 'contrata' : 'executa'
}

const ROLE_CFG = {
  executa:  { label: 'Biasi Executa',  cls: 'bg-green-50 text-green-700 border border-green-200' },
  contrata: { label: 'Biasi Contrata', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
}

export default function Contratos() {
  const navigate = useNavigate()
  const { obras, obraSelecionadaId } = useObra()
  const obrasAcessiveis = useObrasAcessiveis(obras)
  const [contratos, setContratos] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroObra,   setFiltroObra]   = useState(obraSelecionadaId || '')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo,   setFiltroTipo]   = useState('')
  const [filtroRole,   setFiltroRole]   = useState('')

  useEffect(() => {
    Promise.all([
      contratosService.listarTodos(),
      medicoesContratoService.listarTodos(),
    ]).then(([c, m]) => {
      setContratos(c || [])
      setMedicoes(m || [])
    }).catch(err => console.error('Erro ao carregar contratos:', err))
      .finally(() => setCarregando(false))
  }, [])

  // Mapa: sienge_contract_num → total medido
  const medicoMap = useMemo(() => {
    const map = {}
    medicoes.forEach(m => {
      const key = m.contrato_num
      if (key) map[key] = (map[key] || 0) + (parseFloat(m.valor_liquido) || 0)
    })
    return map
  }, [medicoes])

  const contratosFiltrados = useMemo(() => {
    return contratos.filter(ct => {
      if (filtroObra   && ct.obra_id !== filtroObra)             return false
      if (filtroStatus && ct.status  !== filtroStatus)           return false
      if (filtroTipo   && ct.tipo    !== filtroTipo)             return false
      if (filtroRole   && roleBiasi(ct) !== filtroRole) return false
      return true
    })
  }, [contratos, filtroObra, filtroStatus, filtroTipo, filtroRole])

  const kpis = useMemo(() => {
    const totalContratado = contratosFiltrados.reduce((s, ct) => s + (parseFloat(ct.valor_total) || 0), 0)
    const totalMedido     = contratosFiltrados.reduce((s, ct) => s + (medicoMap[ct.sienge_contract_num] || 0), 0)
    const emAndamento     = contratosFiltrados.filter(ct => ct.status === 'em_andamento').length
    return { total: contratosFiltrados.length, emAndamento, totalContratado, totalMedido }
  }, [contratosFiltrados, medicoMap])

  if (carregando) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="animate-spin" style={{ color: '#233772' }} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Contratos de Fornecedores</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {contratosFiltrados.length < contratos.length
            ? `${contratosFiltrados.length} de ${contratos.length} contratos`
            : `${contratos.length} contratos`} · dados Sienge
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icone={FileSignature} label="Total de Contratos"  valor={String(kpis.total)}
          sub={`${kpis.emAndamento} em andamento`} cor="#233772" />
        <KpiCard icone={DollarSign}    label="Valor Contratado"    valor={formatarMoeda(kpis.totalContratado)}
          sub="total contratos" cor="#233772" />
        <KpiCard icone={TrendingUp}    label="Medido Acumulado"    valor={formatarMoeda(kpis.totalMedido)}
          sub={kpis.totalContratado > 0
            ? `${((kpis.totalMedido / kpis.totalContratado) * 100).toFixed(1)}% do total`
            : '—'} cor="#22c55e" />
        <KpiCard icone={Clock}         label="Saldo a Medir"       valor={formatarMoeda(kpis.totalContratado - kpis.totalMedido)}
          sub="valor restante" cor="#f97316" />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
        {/* Linha 1: Papel Biasi */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Papel Biasi</span>
          {[
            { id: '',         label: 'Todos'       },
            { id: 'executa',  label: 'Contratada (Biasi Executa)'  },
            { id: 'contrata', label: 'Contratante (Biasi Contrata)' },
          ].map(r => (
            <button key={r.id} onClick={() => setFiltroRole(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border ${
                filtroRole === r.id
                  ? r.id === 'executa'  ? 'bg-green-600 text-white border-green-600'
                  : r.id === 'contrata' ? 'bg-purple-600 text-white border-purple-600'
                  : 'text-white border-transparent'
                  : 'bg-gray-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              style={filtroRole === r.id && r.id === '' ? { backgroundColor: '#233772', borderColor: '#233772' } : {}}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Linha 2: demais filtros */}
        <div className="flex flex-wrap gap-3 items-end">
          <Filter size={14} className="text-slate-400 mb-2 flex-shrink-0" />

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Obra</label>
            <SearchableSelect
              value={filtroObra}
              onChange={setFiltroObra}
              options={obrasParaOptions(obrasAcessiveis)}
              placeholder="Todas as obras"
              clearable
              className="min-w-[240px]"
              size="sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</label>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tipo</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos</option>
              <option value="material">Material</option>
              <option value="servico">Serviço</option>
              <option value="mao_de_obra">Mão de Obra</option>
            </select>
          </div>

          {(filtroObra || filtroStatus || filtroTipo || filtroRole) && (
            <button onClick={() => { setFiltroObra(''); setFiltroStatus(''); setFiltroTipo(''); setFiltroRole('') }}
              className="mb-0.5 text-xs text-slate-400 hover:text-slate-600 underline self-end">
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2">Nº Contrato</div>
            <div className="col-span-3">Empresa / Parte</div>
            <div className="col-span-2">Obra</div>
            <div className="col-span-1">Tipo</div>
            <div className="col-span-1 text-right">Valor</div>
            <div className="col-span-1 text-right">Medido</div>
            <div className="col-span-1 text-center">% Exec</div>
            <div className="col-span-1 text-center">Status</div>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {contratosFiltrados.length === 0 && (
            <p className="px-5 py-12 text-center text-sm text-slate-400">
              Nenhum contrato encontrado.
            </p>
          )}

          {contratosFiltrados.map(ct => {
            const valorTotal = parseFloat(ct.valor_total) || 0
            const medido     = medicoMap[ct.sienge_contract_num] || 0
            const percExec   = valorTotal > 0 ? (medido / valorTotal) * 100 : 0
            const sCfg       = STATUS_CFG[ct.status] || STATUS_CFG.em_andamento
            const obra       = obras.find(o => o.id === ct.obra_id)

            return (
              <div key={ct.id}
                onClick={() => navigate(`/contratos/${ct.id}`)}
                className="px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors group">
                <div className="grid grid-cols-12 gap-2 items-center">

                  {/* Número */}
                  <div className="col-span-2">
                    <span className="font-mono text-xs font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                      {ct.sienge_contract_num}
                    </span>
                  </div>

                  {/* Fornecedor / Cliente + papel Biasi */}
                  <div className="col-span-3">
                    {/* Biasi Executa: mostra quem contratou a Biasi */}
                    {roleBiasi(ct) === 'executa' ? (
                      <p className="text-xs font-semibold text-slate-700 leading-tight">
                        {ct.cliente_contrato || <span className="text-slate-300 italic">cliente não mapeado</span>}
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-slate-700 leading-tight">{ct.fornecedor}</p>
                    )}
                    <span className={`inline-block mt-0.5 px-1.5 py-0 rounded text-[9px] font-medium ${ROLE_CFG[roleBiasi(ct)].cls}`}>
                      {ROLE_CFG[roleBiasi(ct)].label}
                    </span>
                    {ct.descricao && (
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-1">{ct.descricao}</p>
                    )}
                  </div>

                  {/* Obra */}
                  <div className="col-span-2">
                    {obra ? (
                      <>
                        <p className="text-[10px] font-mono text-slate-500">{obra.codigo}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{obra.nome}</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-300">—</p>
                    )}
                  </div>

                  {/* Tipo */}
                  <div className="col-span-1">
                    {ct.tipo ? (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIPO_CLS[ct.tipo] || 'bg-slate-100 text-slate-500'}`}>
                        {TIPO_LABEL[ct.tipo] || ct.tipo}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                  </div>

                  {/* Valor */}
                  <div className="col-span-1 text-right">
                    <p className="text-xs font-semibold text-slate-700">{formatarMoeda(valorTotal)}</p>
                  </div>

                  {/* Medido */}
                  <div className="col-span-1 text-right">
                    <p className="text-xs font-semibold text-green-600">{formatarMoeda(medido)}</p>
                    <p className="text-[9px] text-slate-400">saldo: {formatarMoeda(valorTotal - medido)}</p>
                  </div>

                  {/* % Exec */}
                  <div className="col-span-1 flex flex-col items-center gap-1">
                    <span className={`text-xs font-bold ${percExec >= 100 ? 'text-slate-500' : percExec >= 80 ? 'text-orange-500' : 'text-blue-600'}`}>
                      {percExec.toFixed(1)}%
                    </span>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${percExec >= 100 ? 'bg-slate-400' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(percExec, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Status + seta */}
                  <div className="col-span-1 flex items-center justify-between">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sCfg.cls}`}>
                      {sCfg.label}
                    </span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Rodapé totalizador */}
        {contratosFiltrados.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <div className="grid grid-cols-12 gap-2 text-xs items-center">
              <div className="col-span-8 text-right text-slate-500 font-semibold">
                {contratosFiltrados.length} contrato{contratosFiltrados.length !== 1 ? 's' : ''} — Total:
              </div>
              <div className="col-span-1 text-right font-bold text-slate-700">
                {formatarMoeda(contratosFiltrados.reduce((s, ct) => s + (parseFloat(ct.valor_total) || 0), 0))}
              </div>
              <div className="col-span-1 text-right font-bold text-green-600">
                {formatarMoeda(contratosFiltrados.reduce((s, ct) => s + (medicoMap[ct.sienge_contract_num] || 0), 0))}
              </div>
              <div className="col-span-2" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ icone: Icone, label, valor, sub, cor }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${cor}18` }}>
          <Icone size={16} style={{ color: cor }} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{label}</p>
          <p className="text-base font-bold text-slate-800 mt-0.5 leading-tight truncate">{valor}</p>
          {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}
