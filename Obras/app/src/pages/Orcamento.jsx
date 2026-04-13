import React, { useState, useEffect, useMemo } from 'react'
import { FileSpreadsheet, Download, Search, Building2, Loader2, Package } from 'lucide-react'
import { orcamentosSiengeService, obrasService, medicoesContratoService } from '../lib/supabase'
import { formatarMoeda } from '../lib/calculos'
import { useObra } from '../context/ObraContext'
import useObrasAcessiveis from '../hooks/useObrasAcessiveis';
import SearchableSelect, { obrasParaOptions } from '../components/ui/SearchableSelect'

function wbsNivel(code) {
  if (!code) return 1
  const parts = String(code).split('.')
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parseInt(parts[i]) !== 0) return i + 1
  }
  return 1
}

export default function Orcamento() {
  const { obraSelecionadaId, obraAtual: obraGlobal } = useObra()
  const [obras, setObras] = useState([])
  const obrasAcessiveis = useObrasAcessiveis(obras)
  const [obraId, setObraId] = useState(obraSelecionadaId || '')
  const [itens, setItens] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    obrasService.listar().then(o => setObras(o || [])).catch(console.error)
  }, [])

  useEffect(() => {
    if (obraSelecionadaId) setObraId(obraSelecionadaId)
  }, [obraSelecionadaId])

  useEffect(() => {
    if (!obraId) { setItens([]); setMedicoes([]); return }
    setCarregando(true)
    Promise.all([
      orcamentosSiengeService.listarPorObra(obraId),
      medicoesContratoService.listarPorObra(obraId),
    ]).then(([orcItens, meds]) => {
      setItens(orcItens || [])
      setMedicoes(meds || [])
    }).catch(console.error)
      .finally(() => setCarregando(false))
  }, [obraId])

  const obraAtual = useMemo(() => obrasAcessiveis.find(o => o.id === obraId), [obrasAcessiveis, obraId])

  const itensFiltrados = useMemo(() => {
    if (!busca) return itens
    const b = busca.toLowerCase()
    return itens.filter(i =>
      i.descricao?.toLowerCase().includes(b) || i.wbs_code?.toLowerCase().includes(b)
    )
  }, [itens, busca])

  const kpis = useMemo(() => {
    const orcTotal  = itens.reduce((s, i) => s + (parseFloat(i.valor_total)    || 0), 0)
    const orcMO     = itens.reduce((s, i) => s + (parseFloat(i.valor_mo)       || 0), 0)
    const orcMat    = itens.reduce((s, i) => s + (parseFloat(i.valor_material) || 0), 0)
    const orcEq     = itens.reduce((s, i) => s + (parseFloat(i.valor_equipamento) || 0), 0)
    const medMO     = medicoes.reduce((s, m) => s + (parseFloat(m.valor_mao_obra)  || 0), 0)
    const medMat    = medicoes.reduce((s, m) => s + (parseFloat(m.valor_material)  || 0), 0)
    const medTotal  = medicoes.reduce((s, m) => s + (parseFloat(m.valor_liquido)   || 0), 0)
    return { orcTotal, orcMO, orcMat, orcEq, medMO, medMat, medTotal }
  }, [itens, medicoes])

  const pct = (real, plann) => plann > 0 ? Math.min((real / plann) * 100, 999) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Orçamento / EAP</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            WBS de obra — dados Sienge
            {itens.length > 0 && ` · ${itens.length} itens`}
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors">
          <Download size={13} /> Exportar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        {obraGlobal ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex-1">
            <Building2 size={14} className="flex-shrink-0" />
            <span className="font-medium truncate">{obraGlobal.nome}</span>
            <span className="text-[10px] text-blue-500 ml-auto whitespace-nowrap">filtro global</span>
          </div>
        ) : (
          <SearchableSelect
            value={obraId}
            onChange={setObraId}
            options={obrasParaOptions(obrasAcessiveis)}
            placeholder="Selecione uma obra..."
            clearable
            className="flex-1"
          />
        )}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar item WBS..."
            value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
      </div>

      {/* KPIs — só mostra se tiver obra e dados */}
      {obraId && itens.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* BAC */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 col-span-2 lg:col-span-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Orçado (BAC)</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{formatarMoeda(kpis.orcTotal)}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 text-xs">
              <span className="text-slate-500">MO</span>
              <span className="text-right font-medium text-blue-600">{formatarMoeda(kpis.orcMO)}</span>
              <span className="text-slate-500">Material</span>
              <span className="text-right font-medium text-orange-600">{formatarMoeda(kpis.orcMat)}</span>
              {kpis.orcEq > 0 && <>
                <span className="text-slate-500">Equip.</span>
                <span className="text-right font-medium text-purple-600">{formatarMoeda(kpis.orcEq)}</span>
              </>}
            </div>
          </div>

          {/* MO Realizado */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">MO Medido</p>
            <p className="text-lg font-bold text-blue-700 mt-1">{formatarMoeda(kpis.medMO)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">de {formatarMoeda(kpis.orcMO)} orçado</p>
            <div className="mt-2 bg-slate-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(pct(kpis.medMO, kpis.orcMO), 100)}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 text-right">
              {kpis.orcMO > 0 ? `${pct(kpis.medMO, kpis.orcMO).toFixed(1)}%` : '—'}
            </p>
          </div>

          {/* Material Realizado */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Material Medido</p>
            <p className="text-lg font-bold text-orange-600 mt-1">{formatarMoeda(kpis.medMat)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">de {formatarMoeda(kpis.orcMat)} orçado</p>
            <div className="mt-2 bg-slate-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-orange-500 transition-all"
                style={{ width: `${Math.min(pct(kpis.medMat, kpis.orcMat), 100)}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 text-right">
              {kpis.orcMat > 0 ? `${pct(kpis.medMat, kpis.orcMat).toFixed(1)}%` : '—'}
            </p>
          </div>

          {/* Total Realizado */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Medido</p>
            <p className="text-lg font-bold mt-1" style={{ color: '#233772' }}>{formatarMoeda(kpis.medTotal)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">de {formatarMoeda(kpis.orcTotal)} orçado</p>
            <div className="mt-2 bg-slate-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all" style={{
                width: `${Math.min(pct(kpis.medTotal, kpis.orcTotal), 100)}%`,
                backgroundColor: '#233772'
              }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 text-right">
              {kpis.orcTotal > 0 ? `${pct(kpis.medTotal, kpis.orcTotal).toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Tabela WBS */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-orange-500" />
          <h2 className="font-semibold text-slate-700 text-sm">
            {obraAtual?.nome || 'Orçamento WBS'}
          </h2>
          {itensFiltrados.length > 0 && (
            <span className="text-xs text-slate-400 ml-1">— {itensFiltrados.length} itens</span>
          )}
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin" style={{ color: '#233772' }} />
          </div>
        ) : !obraId ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            Selecione uma obra para ver o orçamento.
          </p>
        ) : itens.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Package size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 font-medium">Orçamento não sincronizado</p>
            <p className="text-xs text-slate-400 mt-1">
              Acione o sync Sienge (Administração → Sienge Sync) para importar o WBS desta obra.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">WBS</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Descrição</th>
                  <th className="text-center px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Un</th>
                  <th className="text-right px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Qtd</th>
                  <th className="text-right px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">P.Unit</th>
                  <th className="text-right px-3 py-3 text-[10px] font-semibold text-blue-400 uppercase tracking-wider">MO</th>
                  <th className="text-right px-3 py-3 text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Material</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {itensFiltrados.map((item, idx) => {
                  const nivel = wbsNivel(item.wbs_code)
                  const indent = (nivel - 1) * 14
                  return (
                    <tr key={item.id || idx}
                      className={`hover:bg-slate-50/60 transition-colors
                        ${nivel === 1 ? 'bg-orange-50/30' : nivel === 2 ? 'bg-slate-50/20' : ''}`}>
                      <td className="px-4 py-2">
                        <span className="font-mono text-[10px] text-slate-400">{item.wbs_code}</span>
                      </td>
                      <td className="py-2" style={{ paddingLeft: `${16 + indent}px`, paddingRight: '16px' }}>
                        <span className={`
                          ${nivel === 1 ? 'uppercase text-[10px] font-bold text-blue-800' : ''}
                          ${nivel === 2 ? 'font-semibold text-xs text-slate-700' : ''}
                          ${nivel >= 3 ? 'text-xs text-slate-600' : ''}
                        `}>
                          {item.descricao}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-[10px] text-slate-400">{item.unidade || '—'}</td>
                      <td className="px-3 py-2 text-right text-[10px] text-slate-500">
                        {parseFloat(item.quantidade || 0) > 0 ? parseFloat(item.quantidade).toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-[10px] text-slate-500">
                        {parseFloat(item.preco_unitario || 0) > 0 ? formatarMoeda(item.preco_unitario) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-blue-600">
                        {parseFloat(item.valor_mo || 0) > 0 ? formatarMoeda(item.valor_mo) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-orange-600">
                        {parseFloat(item.valor_material || 0) > 0 ? formatarMoeda(item.valor_material) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-xs text-slate-700">
                        {formatarMoeda(item.valor_total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={5} className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                    {itensFiltrados.length} itens — Total:
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-blue-700">
                    {formatarMoeda(itensFiltrados.reduce((s, i) => s + (parseFloat(i.valor_mo) || 0), 0))}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-orange-600">
                    {formatarMoeda(itensFiltrados.reduce((s, i) => s + (parseFloat(i.valor_material) || 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-800">
                    {formatarMoeda(itensFiltrados.reduce((s, i) => s + (parseFloat(i.valor_total) || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
