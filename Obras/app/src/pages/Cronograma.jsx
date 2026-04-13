
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Calendar, ChevronDown, ChevronRight, Check, X, AlertCircle,
  Zap, Download, Plus, Lock, FileText, TrendingUp, Clock
} from 'lucide-react'
import { obrasService, planejamentoService } from '../lib/supabase'
import { useObra } from '../context/ObraContext'
import useObrasAcessiveis from '../hooks/useObrasAcessiveis';
import ObraSearchSelect from '../components/ui/ObraSearchSelect';
import { formatarMoeda } from '../lib/calculos'

export default function Cronograma() {

  const { id: obraIdParam } = useParams()
  const navigate = useNavigate()
  const { obras, obraSelecionadaId, setObraSelecionada } = useObra()
  const obrasAcessiveis = useObrasAcessiveis(obras)
  const obraId = obraIdParam || obraSelecionadaId

  const [obra, setObra] = useState(null)
  const [planejamento, setPlanejamento] = useState(null)
  const [eapItens, setEapItens] = useState([])
  const [atividades, setAtividades] = useState([])
  const [avancos, setAvancos] = useState([])
  const [reprogramacoes, setReprogramacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  // UI State
  const [expandidos, setExpandidos] = useState(new Set())
  const [filtroNivel, setFiltroNivel] = useState('all')
  const [exibirAtividades, setExibirAtividades] = useState(true)
  const [congelando, setCongelando] = useState(false)

  useEffect(() => {
    if (!obraId) return
    carregar()
  }, [obraId])

  async function carregar() {
    try {
      setCarregando(true)
      const obraData = await obrasService.buscarPorId(obraId)
      setObra(obraData)

      // Carregar planejamento + EAP
      const { eap_itens, planejamento_metadata } = await planejamentoService.listarEapPorObra(obraId)
      setPlanejamento(planejamento_metadata)
      setEapItens(eap_itens || [])

      // Carregar atividades por EAP item
      if (eap_itens && eap_itens.length > 0) {
        const allAtiv = []
        for (const eap of eap_itens) {
          const { atividades } = await planejamentoService.listarAtividadesPorEap(eap.id)
          allAtiv.push(...(atividades || []))
        }
        setAtividades(allAtiv)
      }

      // TODO: Carregarearem avanços e reprogramações quando planejamento existir
      if (planejamento_metadata) {
        const avancosData = await planejamentoService.listarAvancosSemanais(
          planejamento_metadata.id,
          new Date().toISOString().split('T')[0]
        )
        setAvancos(avancosData.avancos || [])
      }

      setErro(null)
    } catch (err) {
      console.error('Erro ao carregar cronograma:', err)
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  // Congelar baseline - marca planejamento como congelado
  async function handleCongelarBaseline() {
    if (!planejamento) return
    const ok = window.confirm(
      'Congelar baseline?\n\nAs datas atuais serão gravadas como referência permanente.\n' +
      'Após o congelamento, o cronograma só pode ser alterado por Reprogramação.\n\n' +
      'Esta ação é irreversível.'
    )
    if (!ok) return

    try {
      setCongelando(true)
      await planejamentoService.congelarBaseline(planejamento.id)
      await carregar()
    } catch (err) {
      console.error('Erro ao congelar baseline:', err)
      alert('Erro ao congelar: ' + err.message)
    } finally {
      setCongelando(false)
    }
  }

  // Criar nova tarefa - redireciona para módulo de planejamento
  function handleCriarTarefa() {
    if (!obraId) {
      alert('Selecione uma obra primeiro')
      return
    }
    // Redireciona para planejamento onde é o lugar apropriado para criar/editar tarefas
    navigate(`/planejamento/cronograma/${obraId}`)
  }

  const toggleExpandido = (eapId) => {
    const novo = new Set(expandidos)
    novo.has(eapId) ? novo.delete(eapId) : novo.add(eapId)
    setExpandidos(novo)
  }

  const eapFiltrado = useMemo(() => {
    if (filtroNivel === 'all') return eapItens
    return eapItens.filter(e => e.nivel === parseInt(filtroNivel))
  }, [eapItens, filtroNivel])

  const atividadesPorEap = useMemo(() => {
    const map = new Map()
    atividades.forEach(a => {
      if (!map.has(a.eap_item_id)) map.set(a.eap_item_id, [])
      map.get(a.eap_item_id).push(a)
    })
    return map
  }, [atividades])

  // Cálculo de datas mín/máx para escala
  const datasLimites = useMemo(() => {
    const datas = atividades
      .flatMap(a => [new Date(a.data_inicio), new Date(a.data_fim)])
      .filter(d => !isNaN(d))
    if (datas.length === 0) return { min: new Date(), max: new Date() }
    return {
      min: new Date(Math.min(...datas.map(d => d.getTime()))),
      max: new Date(Math.max(...datas.map(d => d.getTime())))
    }
  }, [atividades])

  // Função auxiliar: renderizar barra de progresso visual
  function BarraProgresso({ atividade }) {
    const duracao = Math.max(1, Math.ceil((new Date(atividade.data_fim).getTime() - new Date(atividade.data_inicio).getTime()) / 86400000))
    const percentualDias = Math.min((atividade.peso_realizado_perc || 0) * 100, 100)
    return (
      <div className="relative h-5 bg-slate-100 rounded overflow-hidden flex-1">
        <div
          className={`h-full transition-all ${
            atividade.status === 'concluida'
              ? 'bg-green-500'
              : atividade.status === 'em_andamento'
                ? 'bg-blue-500'
                : 'bg-gray-300'
          }`}
          style={{ width: `${percentualDias}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-700">
          {atividade.peso_realizado_perc?.toFixed(0) || 0}%
        </span>
      </div>
    )
  }

  if (carregando) {
    return <div className="p-8 text-center"><Zap className="animate-spin mx-auto" /> Carregando cronograma...</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{obra?.nome || 'Cronograma'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {planejamento ? (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-semibold">
                  <Lock size={12} /> Baseline V{planejamento.versao} · {new Date(planejamento.data_base_assinada || planejamento.created_at).toLocaleDateString('pt-BR')}
                </span>
              </>
            ) : (
              <span className="text-yellow-600 flex items-center gap-1">
                <AlertCircle size={14} /> Sem planejamento (baseline será criado do Sienge)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-2 min-w-[340px] max-w-[600px] w-full ml-2">
          <ObraSearchSelect
            value={obraSelecionadaId || ''}
            onChange={setObraSelecionada}
            allowTodas={true}
            className="mb-2"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {/* Criar nova tarefa */}
            <button
              onClick={handleCriarTarefa}
              className="px-3 py-2 rounded bg-green-50 text-green-700 hover:bg-green-100 text-sm font-semibold flex items-center gap-1"
              title="Ir para planejamento para criar/editar tarefas"
            >
              <Plus size={14} /> Nova Tarefa
            </button>

            {/* Congelar baseline */}
            {planejamento && (
              <button
                onClick={handleCongelarBaseline}
                disabled={congelando}
                className="px-3 py-2 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <Lock size={14} /> Congelar Baseline
              </button>
            )}

            <button className="px-3 py-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-semibold flex items-center gap-1">
              <Plus size={14} /> Nova Versão
            </button>
            <button className="px-3 py-2 rounded bg-slate-50 text-slate-700 hover:bg-slate-100 text-sm font-semibold flex items-center gap-1">
              <Download size={14} /> Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {erro && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>{erro}</div>
        </div>
      )}

      {/* FILTROS */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-slate-200">
        <label className="text-sm font-semibold text-slate-700">Nível EAP:</label>
        <select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos</option>
          <option value="1">L1 - Fases</option>
          <option value="2">L2 - Grupos</option>
          <option value="3">L3 - Serviços</option>
          <option value="4">L4 - Tarefas</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-slate-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={exibirAtividades}
              onChange={(e) => setExibirAtividades(e.target.checked)}
              className="rounded"
            />
            Exibir Atividades
          </label>
        </div>
      </div>

      {/* GRID GANTT */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 text-left font-semibold text-slate-700 w-48">WBS · Nome</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 w-20">Duração</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 w-28">Início</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 w-28">Fim</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 flex-1">Progresso</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700 w-24">Status</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700 w-16">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {eapFiltrado.map((eap) => (
                <React.Fragment key={eap.id}>
                  {/* LINHA EAP */}
                  <tr className={`${eap.nivel === 1 ? 'bg-blue-50' : eap.nivel === 2 ? 'bg-cyan-50' : 'bg-slate-50'} hover:bg-opacity-75`}>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        {exibirAtividades && (atividadesPorEap.get(eap.id)?.length || 0) > 0 && (
                          <button
                            onClick={() => toggleExpandido(eap.id)}
                            className="p-1 hover:bg-white rounded"
                          >
                            {expandidos.has(eap.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        )}
                        <span className="text-xs bg-blue-200 text-blue-900 px-2 py-1 rounded font-mono">{eap.codigo}</span>
                        <span className="text-slate-700">{eap.nome}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-xs">-</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">-</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">-</td>
                    <td className="px-3 py-2">
                      {eap.peso_percentual && (
                        <div className="relative h-5 bg-slate-200 rounded overflow-hidden flex-1">
                          <div
                            className="h-full bg-blue-400"
                            style={{ width: `${eap.peso_percentual}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <span className="inline-block px-2 py-1 rounded bg-slate-200 text-slate-700 font-semibold">
                        L{eap.nivel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <button className="p-1 hover:bg-slate-100 rounded" title="Detalhes">
                        <FileText size={14} className="text-slate-500" />
                      </button>
                    </td>
                  </tr>

                  {/* ATIVIDADES (se expandido) */}
                  {exibirAtividades && expandidos.has(eap.id) && (atividadesPorEap.get(eap.id) || []).map((ativ) => (
                    <tr key={ativ.id} className="bg-white hover:bg-slate-50 border-l-4 border-l-green-400">
                      <td className="px-3 py-2 pl-12">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono">A</span>
                          <span className="text-sm text-slate-700">{ativ.nome}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} /> {ativ.duracao_dias}d
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {new Date(ativ.data_inicio).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {new Date(ativ.data_fim).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-3 py-2 flex items-center gap-2">
                        <BarraProgresso atividade={ativ} />
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        <span className={`inline-block px-2 py-1 rounded font-semibold text-white ${
                          ativ.status === 'concluida' ? 'bg-green-600' :
                          ativ.status === 'em_andamento' ? 'bg-blue-600' :
                          ativ.status === 'suspensa' ? 'bg-red-600' :
                          'bg-slate-400'
                        }`}>
                          {ativ.status === 'nao_iniciada' ? 'Não iniciada' :
                           ativ.status === 'em_andamento' ? 'Em andamento' :
                           ativ.status === 'concluida' ? 'Concluída' :
                           'Suspensa'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        <button className="p-1 hover:bg-slate-100 rounded" title="Editar">
                          <FileText size={14} className="text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAINEL REPROGRAMAÇÕES (lateral) */}
      {reprogramacoes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-yellow-700" />
            <h3 className="font-semibold text-yellow-900">Reprogramações Pendentes ({reprogramacoes.filter(r => r.status === 'pendente').length})</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {reprogramacoes.map(reprog => (
              <div key={reprog.id} className="p-3 bg-white rounded border border-yellow-200 flex items-start justify-between gap-3">
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-slate-900">{reprog.atividade_id}</p>
                  <p className="text-xs text-slate-600">{reprog.motivo}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    De: {new Date(reprog.data_original).toLocaleDateString('pt-BR')} → Para: {new Date(reprog.data_nova).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {reprog.status === 'pendente' && (
                  <div className="flex items-center gap-1">
                    <button className="p-1 bg-green-100 hover:bg-green-200 text-green-700 rounded" title="Aprovar">
                      <Check size={14} />
                    </button>
                    <button className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded" title="Rejeitar">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

