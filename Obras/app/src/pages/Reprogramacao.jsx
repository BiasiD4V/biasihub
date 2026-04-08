import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, Check, X, Plus, Zap, Calendar, FileText, Loader2 } from 'lucide-react'
import { obrasService, planejamentoService } from '../lib/supabase'
import { useObra } from '../context/ObraContext'
import { useAuth } from '../context/AuthContext'

export default function Reprogramacao() {
  const { id: obraIdParam } = useParams()
  const { obraSelecionadaId } = useObra()
  const { usuario } = useAuth()
  const obraId = obraIdParam || obraSelecionadaId

  const [obra, setObra] = useState(null)
  const [planejamento, setPlanejamento] = useState(null)
  const [atividades, setAtividades] = useState([])
  const [reprogramacoes, setReprogramacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  // Form state
  const [solicitando, setSolicitando] = useState(false)
  const [atividadeSelecionada, setAtividadeSelecionada] = useState(null)
  const [dataNova, setDataNova] = useState('')
  const [motivo, setMotivo] = useState('')
  const [formularioAberto, setFormularioAberto] = useState(false)

  // Filter state
  const [filtroStatus, setFiltroStatus] = useState('pendente')

  useEffect(() => {
    if (!obraId) return
    carregar()
  }, [obraId])

  async function carregar() {
    try {
      setCarregando(true)
      const obraData = await obrasService.buscarPorId(obraId)
      setObra(obraData)

      // Carregar planejamento
      const { eap_itens, planejamento_metadata } = await planejamentoService.listarEapPorObra(obraId)
      setPlanejamento(planejamento_metadata)

      if (planejamento_metadata && eap_itens) {
        // Carregar atividades
        const allAtiv = []
        for (const eap of eap_itens) {
          const { atividades } = await planejamentoService.listarAtividadesPorEap(eap.id)
          allAtiv.push(...(atividades || []))
        }
        setAtividades(allAtiv)

        // TODO: Carregar reprogramações do banco
        // setReprogramacoes(reprogData)
      }

      setErro(null)
    } catch (err) {
      console.error('Erro ao carregar:', err)
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  async function solicitarReprogramacao(e) {
    e.preventDefault()
    if (!atividadeSelecionada || !dataNova || !motivo.trim()) {
      alert('Preencha todos os campos')
      return
    }

    try {
      setSolicitando(true)
      const result = await planejamentoService.solicitarReprogramacao(
        atividadeSelecionada,
        dataNova,
        motivo
      )

      // Recarregar
      const { data: reprogData } = await supabase
        .from('reprogramacoes')
        .select('*')
        .eq('planejamento_id', planejamento.id)
      setReprogramacoes(reprogData || [])

      // Resetar form
      setAtividadeSelecionada(null)
      setDataNova('')
      setMotivo('')
      setFormularioAberto(false)

      alert('✓ Reprogramação solicitada! Aguardando aprovação.')
    } catch (err) {
      console.error('Erro ao solicitar:', err)
      alert('Erro: ' + err.message)
    } finally {
      setSolicitando(false)
    }
  }

  async function aprovarReprogramacao(reprogramacaoId) {
    try {
      await planejamentoService.aprovarReprogramacao(reprogramacaoId)
      carregar() // Recarregar
      alert('✓ Reprogramação aprovada!')
    } catch (err) {
      console.error('Erro ao aprovar:', err)
      alert('Erro: ' + err.message)
    }
  }

  async function rejeitarReprogramacao(reprogramacaoId) {
    const motivo = prompt('Motivo da rejeição:')
    if (!motivo) return

    try {
      await planejamentoService.rejeitarReprogramacao(reprogramacaoId, motivo)
      carregar() // Recarregar
      alert('✓ Reprogramação rejeitada!')
    } catch (err) {
      console.error('Erro ao rejeitar:', err)
      alert('Erro: ' + err.message)
    }
  }

  const reprogramacoesFiltradas = useMemo(() => {
    if (filtroStatus === 'all') return reprogramacoes
    return reprogramacoes.filter(r => r.status === filtroStatus)
  }, [reprogramacoes, filtroStatus])

  const podeAprovar = usuario?.perfil && ['admin', 'diretor'].includes(usuario.perfil)
  const podeSolicitar = usuario?.perfil && ['admin', 'diretor', 'gerente', 'planejamento'].includes(usuario.perfil)

  if (carregando) {
    return <div className="p-8 text-center"><Zap className="animate-spin mx-auto" /> Carregando reprogramações...</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{obra?.nome || 'Reprogramação'}</h1>
          <p className="text-sm text-slate-500 mt-1">Workflow de mudança de datas com aprovação</p>
        </div>
        {podeSolicitar && (
          <button
            onClick={() => setFormularioAberto(!formularioAberto)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold flex items-center gap-2"
          >
            <Plus size={16} /> Nova Solicitação
          </button>
        )}
      </div>

      {erro && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>{erro}</div>
        </div>
      )}

      {/* FORMULÁRIO SOLICITAÇÃO */}
      {formularioAberto && podeSolicitar && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Plus size={16} /> Solicitar Reprogramação
          </h2>
          <form onSubmit={solicitarReprogramacao} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Atividade */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Atividade</label>
                <select
                  value={atividadeSelecionada || ''}
                  onChange={(e) => setAtividadeSelecionada(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Selecione uma atividade...</option>
                  {atividades
                    .filter(a => a.status !== 'concluida')
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nome} (atual: {new Date(a.data_inicio).toLocaleDateString('pt-BR')})
                      </option>
                    ))}
                </select>
              </div>

              {/* Data Nova */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Nova Data de Início</label>
                <input
                  type="date"
                  value={dataNova}
                  onChange={(e) => setDataNova(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Motivo da Mudança</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Descreva o motivo da reprogramação..."
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows="3"
              />
            </div>

            {/* Botões */}
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setFormularioAberto(false)
                  setAtividadeSelecionada(null)
                  setDataNova('')
                  setMotivo('')
                }}
                className="px-3 py-2 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={solicitando}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {solicitando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Solicitar Reprogramação
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTROS */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-slate-200">
        <label className="text-sm font-semibold text-slate-700">Filtro Status:</label>
        <div className="flex items-center gap-2">
          {['pendente', 'aprovada', 'rejeitada', 'all'].map(status => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                filtroStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? 'Todas' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto text-sm text-slate-600">
          Total: <span className="font-bold">{reprogramacoesFiltradas.length}</span>
        </div>
      </div>

      {/* TABELA REPROGRAMAÇÕES */}
      {reprogramacoesFiltradas.length === 0 ? (
        <div className="p-8 bg-slate-50 text-center text-slate-600 rounded-lg">
          <Calendar className="mx-auto mb-3 text-slate-400" size={32} />
          <p className="font-semibold">Nenhuma reprogramação {filtroStatus !== 'all' ? `com status "${filtroStatus}"` : ''}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Atividade</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Motivo</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700 w-32">Data Original</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700 w-32">Data Solicitada</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700 w-28">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700 w-16">Solicitado Por</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700 w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reprogramacoesFiltradas.map((reprog) => {
                const atividade = atividades.find(a => a.id === reprog.atividade_id)
                return (
                  <tr key={reprog.id} className={
                    reprog.status === 'pendente' ? 'bg-yellow-50 hover:bg-yellow-100' :
                    reprog.status === 'aprovada' ? 'bg-green-50 hover:bg-green-100' :
                    'bg-red-50 hover:bg-red-100'
                  }>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{atividade?.nome || 'Carregando...'}</div>
                      <div className="text-xs text-slate-500">Data atual: {new Date(reprog.data_original).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs max-w-xs truncate">
                      {reprog.motivo}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-900 font-semibold">
                      {new Date(reprog.data_original).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold text-xs">
                        <Calendar size={12} />
                        {new Date(reprog.data_nova).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded font-semibold text-xs text-white ${
                        reprog.status === 'pendente' ? 'bg-yellow-600' :
                        reprog.status === 'aprovada' ? 'bg-green-600' :
                        'bg-red-600'
                      }`}>
                        {reprog.status === 'pendente' ? 'Pendente' :
                         reprog.status === 'aprovada' ? 'Aprovada' :
                         'Rejeitada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 text-xs">
                      {reprog.solicitado_por ? reprog.solicitado_por.slice(0, 8) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {reprog.status === 'pendente' && podeAprovar && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => aprovarReprogramacao(reprog.id)}
                            className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded font-semibold text-xs flex items-center gap-1"
                            title="Aprovar"
                          >
                            <Check size={12} /> Aprovar
                          </button>
                          <button
                            onClick={() => rejeitarReprogramacao(reprog.id)}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded font-semibold text-xs flex items-center gap-1"
                            title="Rejeitar"
                          >
                            <X size={12} /> Rejeitar
                          </button>
                        </div>
                      )}
                      {reprog.status !== 'pendente' && (
                        <div className="text-xs text-slate-600">
                          {reprog.aprovado_por ? '✓ ' + new Date(reprog.data_aprovacao).toLocaleDateString('pt-BR') : '-'}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* INFO */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
        <p className="font-semibold mb-2">📋 Workflow de Reprogramação</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li><strong>Solicitar:</strong> Gerentes/Planejadores criam solicitação com data nova e motivo</li>
          <li><strong>Pendente:</strong> Reprogramação aguarda revisão (status = Pendente)</li>
          <li><strong>Diretor aprova:</strong> Diretor revisa motivo e aprova/rejeita</li>
          <li><strong>Atualizar Gantt:</strong> Se aprovada, datas do cronograma são atualizadas automaticamente</li>
          <li><strong>Histórico:</strong> Todas as mudanças são registradas com datas e responsáveis</li>
        </ol>
      </div>
    </div>
  )
}
