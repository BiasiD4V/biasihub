import React, { useState } from 'react'
import {
  BookOpen, Sun, Cloud, CloudRain, Plus, Save,
  ChevronDown, Users, CheckSquare, AlertTriangle, Camera,
  Calendar, Building2
} from 'lucide-react'
import { obras } from '../lib/mockData'
import { useObra } from '../context/ObraContext'
import SearchableSelect, { obrasParaOptions } from '../components/ui/SearchableSelect'

const climaOpcoes = [
  { valor: 'sol', label: 'Sol', icone: Sun, cor: 'yellow' },
  { valor: 'nublado', label: 'Nublado', icone: Cloud, cor: 'gray' },
  { valor: 'chuva', label: 'Chuva', icone: CloudRain, cor: 'blue' },
  { valor: 'chuva_forte', label: 'Chuva Forte', icone: CloudRain, cor: 'indigo' },
]

const funcoesMock = [
  { funcao: 'Engenheiro Residente', previsto: 1, presente: 1 },
  { funcao: 'Mestre de Obras', previsto: 1, presente: 1 },
  { funcao: 'Eletricista', previsto: 4, presente: 3 },
  { funcao: 'Auxiliar de Eletricista', previsto: 6, presente: 6 },
  { funcao: 'Pedreiro', previsto: 3, presente: 2 },
  { funcao: 'Servente', previsto: 4, presente: 4 },
]

const atividadesMock = [
  { id: 'a1', descricao: 'Montagem de estrutura metálica do painel', concluida: false, percentual: 60 },
  { id: 'a2', descricao: 'Instalação de barramentos de cobre 300A', concluida: false, percentual: 40 },
  { id: 'a3', descricao: 'Concretagem de fundação do transformador T2', concluida: true, percentual: 100 },
  { id: 'a4', descricao: 'Cabeamento de média tensão — trecho A-B', concluida: false, percentual: 25 },
]

const diariosMock = [
  {
    id: 'd1',
    data: '2026-03-31',
    clima: 'sol',
    efetivo: 19,
    atividades: 3,
    ocorrencias: 'Sem ocorrências relevantes.',
  },
  {
    id: 'd2',
    data: '2026-03-28',
    clima: 'chuva',
    efetivo: 15,
    atividades: 2,
    ocorrencias: 'Chuva suspendeu trabalhos externos às 14h.',
  },
  {
    id: 'd3',
    data: '2026-03-27',
    clima: 'nublado',
    efetivo: 20,
    atividades: 4,
    ocorrencias: 'Entrega de material — 2 bobinas de cabo 150mm².',
  },
]

const climaLabel = { sol: 'Sol', nublado: 'Nublado', chuva: 'Chuva', chuva_forte: 'Chuva Forte' }
const climaCor = {
  sol: 'bg-yellow-100 text-yellow-700',
  nublado: 'bg-gray-100 text-gray-600',
  chuva: 'bg-blue-100 text-blue-700',
  chuva_forte: 'bg-indigo-100 text-indigo-700',
}

export default function DiarioObra() {
  const { obraAtual: obraGlobal } = useObra()
  const [obraSelecionada, setObraSelecionada] = useState(obras[0]?.id || '')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [clima, setClima] = useState('sol')
  const [efetivo, setEfetivo] = useState(funcoesMock)
  const [atividades, setAtividades] = useState(atividadesMock)
  const [ocorrencias, setOcorrencias] = useState('')
  const [salvo, setSalvo] = useState(false)

  const totalPrevisto = efetivo.reduce((s, e) => s + e.previsto, 0)
  const totalPresente = efetivo.reduce((s, e) => s + e.presente, 0)

  const handleSalvar = () => {
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  const handlePresenteChange = (idx, val) => {
    setEfetivo(prev => prev.map((e, i) => i === idx ? { ...e, presente: Math.max(0, Number(val)) } : e))
  }

  const handlePercentualChange = (id, val) => {
    setAtividades(prev => prev.map(a => a.id === id ? { ...a, percentual: Math.min(100, Math.max(0, Number(val))) } : a))
  }

  const handleConcluida = (id) => {
    setAtividades(prev => prev.map(a => a.id === id ? { ...a, concluida: !a.concluida, percentual: !a.concluida ? 100 : a.percentual } : a))
  }

  const obraAtual = obras.find(o => o.id === obraSelecionada)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diário de Obra</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro diário de atividades, efetivo e ocorrências</p>
        </div>
        <button
          onClick={handleSalvar}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Save size={16} />
          Salvar Diário
        </button>
      </div>

      {salvo && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2">
          <CheckSquare size={16} />
          Diário salvo com sucesso!
        </div>
      )}

      {/* Seleção Obra + Data */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Building2 size={14} className="inline mr-1 text-orange-500" />
              Obra
            </label>
            <div>
              {obraGlobal ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 w-full">
                  <Building2 size={14} className="flex-shrink-0" />
                  <span className="font-medium truncate">{obraGlobal.nome}</span>
                  <span className="text-[10px] text-blue-500 ml-auto whitespace-nowrap">filtro global</span>
                </div>
              ) : (
                <SearchableSelect
                  value={obraSelecionada}
                  onChange={setObraSelecionada}
                  options={obrasParaOptions(obras)}
                  placeholder="Selecione uma obra..."
                  className="w-full"
                />
              )}
            </div>
            {obraAtual && (
              <p className="text-xs text-gray-400 mt-1">{obraAtual.cliente} · {obraAtual.localizacao}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Calendar size={14} className="inline mr-1 text-orange-500" />
              Data do Registro
            </label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Condições Climáticas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Sun size={18} className="text-orange-500" />
          Condições Climáticas
        </h2>
        <div className="flex flex-wrap gap-3">
          {climaOpcoes.map(op => {
            const ativo = clima === op.valor
            return (
              <button
                key={op.valor}
                onClick={() => setClima(op.valor)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                  ativo
                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <op.icone size={16} className={ativo ? 'text-orange-500' : 'text-gray-400'} />
                {op.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Efetivo no Campo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Users size={18} className="text-orange-500" />
            Efetivo no Campo
          </h2>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-500">Previsto: <strong className="text-gray-800">{totalPrevisto}</strong></span>
            <span className="text-gray-500">Presente: <strong className="text-orange-500">{totalPresente}</strong></span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Função</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Previsto</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Presente</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ausências</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {efetivo.map((e, idx) => {
                const ausencias = e.previsto - e.presente
                return (
                  <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700">{e.funcao}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{e.previsto}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={e.previsto}
                        value={e.presente}
                        onChange={ev => handlePresenteChange(idx, ev.target.value)}
                        className="w-16 text-center px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ausencias > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {ausencias} ausente{ausencias > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ausencias > 0 ? (
                        <input
                          type="text"
                          placeholder="Motivo da ausência..."
                          className="w-full px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Atividades Executadas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CheckSquare size={18} className="text-orange-500" />
            Atividades Executadas Hoje
          </h2>
          <button className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 font-medium">
            <Plus size={14} />
            Adicionar
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {atividades.map(at => (
            <div key={at.id} className="px-5 py-4 flex items-center gap-4">
              <input
                type="checkbox"
                checked={at.concluida}
                onChange={() => handleConcluida(at.id)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${at.concluida ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {at.descricao}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${at.percentual}%` }}
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={at.percentual}
                    onChange={e => handlePercentualChange(at.id, e.target.value)}
                    className="w-14 text-center px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ocorrências */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className="text-orange-500" />
          Ocorrências e Observações
        </h2>
        <textarea
          value={ocorrencias}
          onChange={e => setOcorrencias(e.target.value)}
          rows={4}
          placeholder="Registre ocorrências, acidentes, impedimentos, entregas de material, visitas técnicas, decisões importantes..."
          className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Fotos (mock) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Camera size={18} className="text-orange-500" />
          Fotos do Dia
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-200 text-gray-400">
              <Camera size={24} className="mb-1" />
              <span className="text-xs">Foto {i}</span>
            </div>
          ))}
          <label className="aspect-video bg-orange-50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-orange-200 text-orange-400 cursor-pointer hover:bg-orange-100 transition-colors">
            <Plus size={24} className="mb-1" />
            <span className="text-xs font-medium">Adicionar</span>
            <input type="file" accept="image/*" disabled className="hidden" />
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-2">Upload de fotos em desenvolvimento. Máximo 10 fotos por diário.</p>
      </div>

      {/* Botão salvar */}
      <div className="flex justify-end">
        <button
          onClick={handleSalvar}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          <Save size={18} />
          Salvar Diário
        </button>
      </div>

      {/* Diários Anteriores */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Diários Anteriores</h2>
          <p className="text-xs text-gray-400 mt-0.5">Histórico de registros desta obra</p>
        </div>
        <div className="divide-y divide-gray-50">
          {diariosMock.map(d => (
            <div key={d.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <BookOpen size={18} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-gray-800">
                    {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${climaCor[d.clima]}`}>
                    {climaLabel[d.clima]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{d.ocorrencias}</p>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 flex-shrink-0">
                <span><strong className="text-gray-700">{d.efetivo}</strong> pessoas</span>
                <span><strong className="text-gray-700">{d.atividades}</strong> atividades</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
