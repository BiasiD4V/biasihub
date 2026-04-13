import React, { useState, useEffect } from 'react'
import {
  AlertCircle, TrendingUp, Clock, CheckCircle2, Activity
} from 'lucide-react'
import { planejamentoService } from '../../lib/supabase'

/**
 * ResumoCronograma - Resumo de métricas de planejamento para uma obra
 * Exibido no Dashboard quando uma obra específica está selecionada
 * Mostra: progresso físico, próximas atividades críticas, status geral
 */
export default function ResumoCronograma({ obraId }) {
  const [planejamento, setPlanejamento] = useState(null)
  const [eapItens, setEapItens] = useState([])
  const [atividades, setAtividades] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!obraId) return
    carregar()
  }, [obraId])

  async function carregar() {
    try {
      setCarregando(true)
      const { eap_itens, planejamento_metadata } = await planejamentoService.listarEapPorObra(obraId)
      setPlanejamento(planejamento_metadata)
      setEapItens(eap_itens || [])

      // Carregar atividades
      if (eap_itens && eap_itens.length > 0) {
        const allAtiv = []
        for (const eap of eap_itens) {
          const { atividades } = await planejamentoService.listarAtividadesPorEap(eap.id)
          allAtiv.push(...(atividades || []))
        }
        setAtividades(allAtiv)
      }
      setErro(null)
    } catch (err) {
      console.error('Erro ao carregar resumo cronograma:', err)
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  if (carregando) return null
  if (erro || !planejamento || atividades.length === 0) return null

  // Métricas de gestão
  const totalAtividades = atividades.length
  const atividadesConc = atividades.filter(a => a.status === 'concluida').length
  const atividadesEmAnd = atividades.filter(a => a.status === 'em_andamento').length
  const progressoMedio = atividades.length > 0
    ? (atividades.reduce((s, a) => s + (a.peso_realizado_perc || 0), 0) / atividades.length).toFixed(1)
    : 0

  // Próximas atividades críticas (não iniciadas ou em andamento)
  const atividadesProximas = atividades
    .filter(a => a.status === 'nao_iniciada' || a.status === 'em_andamento')
    .sort((a, b) => new Date(a.data_fim) - new Date(b.data_fim))
    .slice(0, 3)

  // Status geral
  const percentualConclusao = Math.round((atividadesConc / totalAtividades) * 100)
  const statusLabel = percentualConclusao === 100
    ? 'Concluído'
    : percentualConclusao >= 75
    ? 'Em conclusão'
    : percentualConclusao >= 50
    ? 'Meio do caminho'
    : 'Iniciado'

  const statusColor = percentualConclusao === 100
    ? 'bg-green-50 border-green-200'
    : percentualConclusao >= 75
    ? 'bg-blue-50 border-blue-200'
    : 'bg-yellow-50 border-yellow-200'

  return (
    <div className="space-y-4">
      {/* Grid de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Progresso Geral */}
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600 uppercase font-semibold">Progresso Geral</p>
            <Activity size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{progressoMedio}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {atividadesConc}/{totalAtividades} atividades
          </p>
        </div>

        {/* Status Conclusão */}
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600 uppercase font-semibold">Status</p>
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{percentualConclusao}%</p>
          <p className="text-xs text-slate-500 mt-1">{statusLabel}</p>
        </div>

        {/* Em Andamento */}
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600 uppercase font-semibold">Em Andamento</p>
            <TrendingUp size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{atividadesEmAnd}</p>
          <p className="text-xs text-slate-500 mt-1">Atividades ativas</p>
        </div>

        {/* Baseline */}
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600 uppercase font-semibold">Baseline</p>
            <Clock size={16} className="text-slate-600" />
          </div>
          <p className="text-sm font-semibold text-slate-900">
            V{planejamento.versao || 1}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {new Date(planejamento.data_base_assinada || planejamento.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Próximas atividades críticas */}
      {atividadesProximas.length > 0 && (
        <div className={`p-4 rounded-lg border ${statusColor}`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-slate-700" />
            <h3 className="font-semibold text-slate-900">Próximas Atividades ({atividadesProximas.length})</h3>
          </div>
          <div className="space-y-2">
            {atividadesProximas.map((ativ) => (
              <div key={ativ.id} className="flex items-start justify-between text-sm p-2 bg-white bg-opacity-60 rounded">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{ativ.nome}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fim: {new Date(ativ.data_fim).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${ativ.peso_realizado_perc || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 w-8 text-right">
                    {ativ.peso_realizado_perc?.toFixed(0) || 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
