// ============================================================================
// pages/planejamento/ReprogramacaoPlanejamento.jsx
// Workflow de reprogramação: solicitar → aprovar/rejeitar → histórico
// SPEC-PLN-002-2026 — Etapa 12
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useObra } from '../../context/ObraContext'
import { usePermissoes } from '../../hooks/usePermissoes'
import { useAuth } from '../../context/AuthContext'
import {
  GitBranch, Plus, Check, X, Clock, AlertTriangle,
  ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react'

// ─── Badge de status ──────────────────────────────────────────────────────────
const STATUS_ESTILOS = {
  pendente:   { label: 'Pendente',  cor: 'text-amber-700 bg-amber-50 border-amber-200' },
  aprovada:   { label: 'Aprovada',  cor: 'text-green-700 bg-green-50 border-green-200' },
  rejeitada:  { label: 'Rejeitada', cor: 'text-red-700 bg-red-50 border-red-200' },
}

function BadgeStatus({ status }) {
  const e = STATUS_ESTILOS[status] || STATUS_ESTILOS.pendente
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${e.cor}`}>
      {status === 'pendente' && <Clock size={11} />}
      {status === 'aprovada' && <Check size={11} />}
      {status === 'rejeitada' && <X size={11} />}
      {e.label}
    </span>
  )
}

// ─── Modal solicitar reprogramação ───────────────────────────────────────────
function ModalSolicitar({ atividades, onSalvar, onFechar }) {
  const [atividadeId,  setAtividadeId]  = useState('')
  const [dataOriginal, setDataOriginal] = useState('')
  const [dataNova,     setDataNova]     = useState('')
  const [motivo,       setMotivo]       = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [salvando,     setSalvando]     = useState(false)
  const [erro,         setErro]         = useState(null)

  // Preenche data original ao selecionar atividade
  useEffect(() => {
    const atv = atividades.find(a => a.id === atividadeId)
    if (atv?.data_fim_prevista) setDataOriginal(atv.data_fim_prevista)
  }, [atividadeId, atividades])

  const handleSalvar = async () => {
    if (!atividadeId || !dataNova || !motivo.trim()) {
      setErro('Preencha atividade, nova data e motivo.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await onSalvar({ atividadeId, dataOriginal, dataNova, motivo, justificativa })
      onFechar()
    } catch (e) {
      setErro(e.message)
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <GitBranch size={18} className="text-blue-700" />
            Solicitar Reprogramação
          </h2>
          <button onClick={onFechar} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">
              <AlertTriangle size={15} />
              {erro}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Atividade *</label>
            <select
              value={atividadeId}
              onChange={e => setAtividadeId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma atividade…</option>
              {atividades.map(a => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Original (fim)</label>
              <input
                type="date"
                value={dataOriginal}
                readOnly
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nova Data * </label>
              <input
                type="date"
                value={dataNova}
                onChange={e => setDataNova(e.target.value)}
                min={dataOriginal || undefined}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo *</label>
            <select
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o motivo…</option>
              <option value="Chuva/intempérie">Chuva / intempérie</option>
              <option value="Falta de material">Falta de material</option>
              <option value="Mão de obra insuficiente">Mão de obra insuficiente</option>
              <option value="Alteração de projeto">Alteração de projeto</option>
              <option value="Interferência de terceiros">Interferência de terceiros</option>
              <option value="Problema técnico">Problema técnico</option>
              <option value="Solicitação do cliente">Solicitação do cliente</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Justificativa detalhada</label>
            <textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Descreva a situação com mais detalhes…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-5 py-2 text-sm bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Enviando…' : 'Enviar Solicitação'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal rejeitar ────────────────────────────────────────────────────────────
function ModalRejeitar({ solicitacao, onConfirmar, onFechar }) {
  const [motivo,    setMotivo]    = useState('')
  const [salvando,  setSalvando]  = useState(false)

  const handleConfirmar = async () => {
    setSalvando(true)
    try {
      await onConfirmar(solicitacao.id, motivo)
      onFechar()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">Rejeitar Solicitação</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Informe o motivo da rejeição da reprogramação da atividade
            <strong> {solicitacao.atividade_nome}</strong>.
          </p>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
            placeholder="Motivo da rejeição…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
          <button
            onClick={handleConfirmar}
            disabled={salvando || !motivo.trim()}
            className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {salvando ? 'Rejeitando…' : 'Confirmar Rejeição'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Linha de solicitação ──────────────────────────────────────────────────────
function LinhaSolicitacao({ sol, podeAprovar, onAprovar, onRejeitar }) {
  const [expandida, setExpandida] = useState(false)

  const diasDeslocados = useMemo(() => {
    if (!sol.data_original || !sol.data_nova) return null
    const diff = (new Date(sol.data_nova) - new Date(sol.data_original)) / 86400000
    return diff
  }, [sol.data_original, sol.data_nova])

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50">
        <td className="px-4 py-3">
          <button
            onClick={() => setExpandida(v => !v)}
            className="flex items-center gap-1 text-slate-700 hover:text-blue-700"
          >
            {expandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span className="font-medium text-sm">{sol.atividade_nome || '—'}</span>
          </button>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">
          {sol.data_original ? new Date(sol.data_original + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
          <span className="text-slate-400 mx-1">→</span>
          {sol.data_nova ? new Date(sol.data_nova + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
          {diasDeslocados !== null && (
            <span className={`ml-2 text-xs font-semibold ${diasDeslocados > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ({diasDeslocados > 0 ? '+' : ''}{diasDeslocados}d)
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{sol.motivo || '—'}</td>
        <td className="px-4 py-3 text-sm text-slate-500">
          {sol.solicitado_em ? new Date(sol.solicitado_em).toLocaleDateString('pt-BR') : '—'}
        </td>
        <td className="px-4 py-3">
          <BadgeStatus status={sol.status} />
        </td>
        <td className="px-4 py-3">
          {sol.status === 'pendente' && podeAprovar && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAprovar(sol.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg font-medium transition-colors"
              >
                <Check size={12} /> Aprovar
              </button>
              <button
                onClick={() => onRejeitar(sol)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-medium transition-colors"
              >
                <X size={12} /> Rejeitar
              </button>
            </div>
          )}
        </td>
      </tr>
      {expandida && sol.justificativa && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={6} className="px-8 py-3 text-sm text-slate-600 italic">
            <strong>Justificativa:</strong> {sol.justificativa}
          </td>
        </tr>
      )}
      {expandida && sol.motivo_rejeicao && (
        <tr className="bg-red-50 border-b border-slate-100">
          <td colSpan={6} className="px-8 py-3 text-sm text-red-700 italic">
            <strong>Motivo da rejeição:</strong> {sol.motivo_rejeicao}
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ReprogramacaoPlanejamento() {
  const { obraSelecionadaId, planejamentoId } = useObra()
  const perm = usePermissoes()
  const { usuario } = useAuth()

  const [solicitacoes,     setSolicitacoes]     = useState([])
  const [atividades,       setAtividades]       = useState([])
  const [loading,          setLoading]          = useState(true)
  const [erro,             setErro]             = useState(null)
  const [modalSolicitar,   setModalSolicitar]   = useState(false)
  const [modalRejeitar,    setModalRejeitar]    = useState(null)
  const [filtroStatus,     setFiltroStatus]     = useState('pendente')

  // ── Carregar dados ─────────────────────────────────────────────────────────
  const carregar = async () => {
    if (!planejamentoId) return
    setLoading(true)
    setErro(null)
    try {
      // Solicitações com nome da atividade
      const { data: sols, error: solsErr } = await supabase
        .from('reprogramacoes')
        .select(`
          id, atividade_id, data_original, data_nova,
          motivo, justificativa, motivo_rejeicao,
          status, solicitado_por, aprovado_por,
          solicitado_em:created_at,
          planejamento_atividades!inner(nome)
        `)
        .eq('planejamento_id', planejamentoId)
        .order('created_at', { ascending: false })

      if (solsErr) throw solsErr

      setSolicitacoes((sols || []).map(s => ({
        ...s,
        atividade_nome: s.planejamento_atividades?.nome || '—',
      })))

      // Atividades disponíveis para solicitar
      const { data: atvs } = await supabase
        .from('planejamento_atividades')
        .select('id, nome, data_fim_prevista')
        .eq('planejamento_id', planejamentoId)
        .order('nome')

      setAtividades(atvs || [])
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [planejamentoId])

  // ── Ações ──────────────────────────────────────────────────────────────────
  const handleSolicitarSalvar = async ({ atividadeId, dataOriginal, dataNova, motivo, justificativa }) => {
    const { error } = await supabase
      .from('reprogramacoes')
      .insert({
        planejamento_id: planejamentoId,
        atividade_id:    atividadeId,
        data_original:   dataOriginal,
        data_nova:       dataNova,
        motivo,
        justificativa,
        status:          'pendente',
        solicitado_por:  usuario?.id,
      })
    if (error) throw error
    await carregar()
  }

  const handleAprovar = async (id) => {
    const { error } = await supabase
      .from('reprogramacoes')
      .update({ status: 'aprovada', aprovado_por: usuario?.id })
      .eq('id', id)
    if (error) { setErro(error.message); return }

    // Ao aprovar, atualizar data_fim_prevista da atividade
    const sol = solicitacoes.find(s => s.id === id)
    if (sol) {
      await supabase
        .from('planejamento_atividades')
        .update({ data_fim_prevista: sol.data_nova })
        .eq('id', sol.atividade_id)
    }

    await carregar()
  }

  const handleRejeitar = async (id, motivoRejeicao) => {
    const { error } = await supabase
      .from('reprogramacoes')
      .update({ status: 'rejeitada', motivo_rejeicao: motivoRejeicao })
      .eq('id', id)
    if (error) throw error
    await carregar()
  }

  // ── Filtro ─────────────────────────────────────────────────────────────────
  const solsFiltradas = useMemo(() => {
    if (filtroStatus === 'todos') return solicitacoes
    return solicitacoes.filter(s => s.status === filtroStatus)
  }, [solicitacoes, filtroStatus])

  const contagens = useMemo(() => ({
    pendente:  solicitacoes.filter(s => s.status === 'pendente').length,
    aprovada:  solicitacoes.filter(s => s.status === 'aprovada').length,
    rejeitada: solicitacoes.filter(s => s.status === 'rejeitada').length,
  }), [solicitacoes])

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (!obraSelecionadaId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <GitBranch size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Selecione uma obra no cabeçalho</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reprogramações</h1>
          <p className="text-sm text-slate-500 mt-1">
            Solicitações de ajuste de prazo — workflow de aprovação
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={carregar}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>

          {perm.solicitarReprogramacao && (
            <button
              onClick={() => setModalSolicitar(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Nova Solicitação
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          <AlertTriangle size={18} />
          <span className="text-sm">{erro}</span>
        </div>
      )}

      {/* Tabs de filtro */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: 'pendente',  label: `Pendentes (${contagens.pendente})` },
          { key: 'aprovada',  label: `Aprovadas (${contagens.aprovada})` },
          { key: 'rejeitada', label: `Rejeitadas (${contagens.rejeitada})` },
          { key: 'todos',     label: 'Todas' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFiltroStatus(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              filtroStatus === tab.key
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
          </div>
        ) : solsFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <GitBranch size={36} className="opacity-30 mb-2" />
            <p className="text-sm">Nenhuma solicitação {filtroStatus === 'todos' ? '' : filtroStatus}</p>
            {perm.solicitarReprogramacao && filtroStatus === 'pendente' && (
              <button
                onClick={() => setModalSolicitar(true)}
                className="mt-3 text-sm text-blue-700 hover:underline"
              >
                Criar primeira solicitação
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Atividade</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Datas</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Motivo</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Solicitado em</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {solsFiltradas.map(sol => (
                  <LinhaSolicitacao
                    key={sol.id}
                    sol={sol}
                    podeAprovar={perm.aprovarReprogramacao}
                    onAprovar={handleAprovar}
                    onRejeitar={s => setModalRejeitar(s)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      {modalSolicitar && (
        <ModalSolicitar
          atividades={atividades}
          onSalvar={handleSolicitarSalvar}
          onFechar={() => setModalSolicitar(false)}
        />
      )}
      {modalRejeitar && (
        <ModalRejeitar
          solicitacao={modalRejeitar}
          onConfirmar={handleRejeitar}
          onFechar={() => setModalRejeitar(null)}
        />
      )}
    </div>
  )
}
