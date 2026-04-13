import React, { useState, useMemo } from 'react'
import { FileText, Filter, Download, Sun, Cloud, CloudRain, ChevronDown, Calendar, Building2 } from 'lucide-react'
import { obras } from '../lib/mockData'
import useObrasAcessiveis from '../hooks/useObrasAcessiveis';
import { useObra } from '../context/ObraContext'
import SearchableSelect, { obrasParaOptions } from '../components/ui/SearchableSelect'

const relatoriosMock = [
  { data: '2026-04-01', obraId: 'obra1', clima: 'sol', efetivo: 21, atividades: 'Montagem painel; Cabeamento MT; Fundação T2', ocorrencias: 'Visita do fiscal da Enel às 10h.' },
  { data: '2026-03-31', obraId: 'obra1', clima: 'sol', efetivo: 19, atividades: 'Concretagem fundação T2; Instalação barramentos', ocorrencias: 'Sem ocorrências relevantes.' },
  { data: '2026-03-28', obraId: 'obra1', clima: 'chuva', efetivo: 15, atividades: 'Serviços internos; Montagem quadros elétricos', ocorrencias: 'Chuva suspendeu trabalhos externos às 14h.' },
  { data: '2026-03-27', obraId: 'obra1', clima: 'nublado', efetivo: 20, atividades: 'Cabeamento MT trecho A-B; Aterramento', ocorrencias: 'Entrega de 2 bobinas de cabo 150mm².' },
  { data: '2026-03-26', obraId: 'obra1', clima: 'sol', efetivo: 22, atividades: 'Estrutura metálica; Barramentos; Aterramento', ocorrencias: 'Sem ocorrências.' },
  { data: '2026-03-25', obraId: 'obra2', clima: 'sol', efetivo: 14, atividades: 'Concretagem de piso; Instalação de dutos', ocorrencias: 'Falta de material — aguardando entrega.' },
  { data: '2026-03-24', obraId: 'obra2', clima: 'nublado', efetivo: 16, atividades: 'Escavação de valas; Instalação de cabos', ocorrencias: 'Sem ocorrências.' },
  { data: '2026-03-21', obraId: 'obra3', clima: 'sol', efetivo: 18, atividades: 'Montagem de torres; Içamento de condutores', ocorrencias: 'Inspeção de segurança realizada.' },
]

const climaLabel = { sol: 'Sol', nublado: 'Nublado', chuva: 'Chuva', chuva_forte: 'Chuva Forte' }
const climaIcone = { sol: Sun, nublado: Cloud, chuva: CloudRain, chuva_forte: CloudRain }
const climaCor = {
  sol: 'bg-yellow-100 text-yellow-700',
  nublado: 'bg-gray-100 text-gray-600',
  chuva: 'bg-blue-100 text-blue-700',
  chuva_forte: 'bg-indigo-100 text-indigo-700',
}

export default function RelatorioDiario() {
  const { obraAtual: obraGlobal } = useObra()
  const obrasAcessiveis = useObrasAcessiveis(obras)
  const [obraFiltro, setObraFiltro] = useState('')
  const [dataInicio, setDataInicio] = useState('2026-03-01')
  const [dataFim, setDataFim] = useState('2026-04-01')

  const dadosFiltrados = useMemo(() => {
    return relatoriosMock.filter(r => {
      const dentroObra = !obraFiltro || r.obraId === obraFiltro
      const dentroData = r.data >= dataInicio && r.data <= dataFim
      return dentroObra && dentroData
    })
  }, [obraFiltro, dataInicio, dataFim])

  const totalEfetivo = dadosFiltrados.reduce((s, r) => s + r.efetivo, 0)
  const mediaDiaria = dadosFiltrados.length > 0 ? Math.round(totalEfetivo / dadosFiltrados.length) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório Diário de Obras</h1>
          <p className="text-sm text-gray-500 mt-0.5">Consolidado dos registros diários por obra e período</p>
        </div>
        <button className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm">
          <Download size={16} />
          Exportar PDF
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-orange-500" />
          <h2 className="font-semibold text-gray-700 text-sm">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Obra</label>
            <div>
              {obraGlobal ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 w-full">
                  <Building2 size={14} className="flex-shrink-0" />
                  <span className="font-medium truncate">{obraGlobal.nome}</span>
                  <span className="text-[10px] text-blue-500 ml-auto whitespace-nowrap">filtro global</span>
                </div>
              ) : (
                <SearchableSelect
                  value={obraFiltro}
                  onChange={setObraFiltro}
                  options={obrasParaOptions(obrasAcessiveis)}
                  placeholder="Todas as obras"
                  clearable
                  className="w-full"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              <Calendar size={12} className="inline mr-1" />
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              <Calendar size={12} className="inline mr-1" />
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* KPIs do período */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Registros no Período</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{dadosFiltrados.length}</p>
          <p className="text-xs text-gray-400 mt-1">diários registrados</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Homem-Dia</p>
          <p className="text-2xl font-bold text-orange-500 mt-2">{totalEfetivo}</p>
          <p className="text-xs text-gray-400 mt-1">homens × dias</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Média Diária</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{mediaDiaria}</p>
          <p className="text-xs text-gray-400 mt-1">pessoas/dia</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Registros Encontrados
            <span className="ml-2 text-xs font-normal text-gray-400">({dadosFiltrados.length} itens)</span>
          </h2>
        </div>

        {dadosFiltrados.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Nenhum registro encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Obra</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clima</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Efetivo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Atividades</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ocorrências</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dadosFiltrados.map((r, idx) => {
                  const obra = obras.find(o => o.id === r.obraId)
                  const ClimIcone = climaIcone[r.clima] || Sun
                  return (
                    <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-700 truncate max-w-xs block">
                          {obra?.nome || r.obraId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${climaCor[r.clima]}`}>
                          <ClimIcone size={12} />
                          {climaLabel[r.clima]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-gray-800">{r.efetivo}</span>
                        <span className="text-xs text-gray-400 ml-1">pess.</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 line-clamp-2">{r.atividades}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${r.ocorrencias !== 'Sem ocorrências.' && r.ocorrencias !== 'Sem ocorrências relevantes.' ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                          {r.ocorrencias}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
