import React, { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePermissoes } from '../hooks/usePermissoes'
import { Lock, Send, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Nomes amigáveis por rota
const NOMES_PAGINAS = {
  '/dashboard':               'Dashboard Obras',
  '/obras':                   'Obras',
  '/contratos':               'Contratos',
  '/medicoes':                'Medições',
  '/medicoes-contrato':       'Medições de Contrato',
  '/orcamento':               'Orçamento',
  '/cronograma':              'Cronograma',
  '/evm':                     'Desempenho (EVM)',
  '/reprogramacao':           'Reprogramação',
  '/diario-obra':             'Diário de Obra',
  '/relatorio-diario':        'Relatório Diário',
  '/tarefas':                 'Gestão de Tarefas',
  '/curva-abc':               'Curva ABC',
  '/financeiro':              'Financeiro',
  '/previsto-realizado':      'Previsto x Realizado',
  '/custos-mo':               'Custos Mão de Obra',
  '/suprimentos':             'Suprimentos',
  '/despesas-indiretas':      'Despesas Indiretas',
  '/adm-central':             'ADM Central',
  '/resultado':               'Resultado Operacional',
  '/usuarios':                'Gestão de Usuários',
  '/audit-log':               'Log de Auditoria',
  '/sienge-sync':             'Integração Sienge',
  '/planejamento':            'Planejamento',
  '/planejamento/cronograma': 'Cronograma (Planejamento)',
  '/planejamento/recursos':   'Recursos',
  '/planejamento/progresso':  'Progresso Semanal',
  '/planejamento/curva-s':    'Curva S',
  '/planejamento/evm':        'EVM (Planejamento)',
  '/planejamento/relatorio':  'Relatório Semanal',
}

/**
 * ProtectedRoute — Protege rotas por permissão específica
 * @param {string|string[]} permissao - Permissão exigida ou array (OR logic)
 * @param {ReactNode} children - Componente a renderizar se permitido
 */
export default function ProtectedRoute({ permissao, children }) {
  const { usuario, carregando } = useAuth()
  const permissoes = usePermissoes()
  const location = useLocation()

  // estados: idle | verificando | pendente | enviando | enviado | erro
  const [estado, setEstado] = useState('idle')
  const [mensagem, setMensagem] = useState('')

  const nomePagina  = NOMES_PAGINAS[location.pathname] ?? location.pathname
  const permissaoStr = Array.isArray(permissao) ? permissao.join(',') : permissao

  const temAcesso = Array.isArray(permissao)
    ? permissao.some(p => permissoes[p])
    : permissoes[permissao]

  // Verifica se já existe solicitação pendente para esta rota
  useEffect(() => {
    if (!usuario || carregando || temAcesso) return
    setEstado('verificando')
    supabase
      .from('solicitacoes_acesso')
      .select('id')
      .eq('usuario_id', usuario.id)
      .eq('pagina', location.pathname)
      .eq('status', 'pendente')
      .maybeSingle()
      .then(({ data }) => setEstado(data ? 'pendente' : 'idle'))
  }, [usuario?.id, location.pathname, carregando, temAcesso])

  // ── Loading ──────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: '#e5e7eb', borderTopColor: '#233772' }} />
          <p className="text-sm font-medium" style={{ color: '#233772' }}>
            Verificando acesso...
          </p>
        </div>
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace />
  if (temAcesso)  return children

  // ── Tela de Acesso Negado ────────────────────────────────
  const solicitarAcesso = async () => {
    setEstado('enviando')
    try {
      const { data: sol, error } = await supabase
        .from('solicitacoes_acesso')
        .insert({
          usuario_id: usuario.id,
          pagina:     location.pathname,
          permissao:  permissaoStr,
          mensagem:   mensagem.trim() || null,
        })
        .select('id')
        .single()

      if (error) {
        // código 23505 = violação de unique (já existe pedido pendente)
        if (error.code === '23505') { setEstado('pendente'); return }
        throw error
      }

      // Notificação no sino para admins/master/diretores
      await supabase.from('notificacoes').insert({
        tipo:            'alerta',
        titulo:          'Solicitação de Acesso',
        mensagem:        `${usuario.nome} solicitou acesso à página "${nomePagina}"`,
        referencia_tipo: 'solicitacao_acesso',
        referencia_id:   sol.id,
      })

      // Email para admins via Edge Function (Office 365)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
          {
            method:  'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token ?? ''}`,
              'Content-Type':  'application/json',
              'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ tipo: 'nova_solicitacao', solicitacao_id: sol.id }),
          }
        )
      } catch (emailErr) {
        // Email falhou mas a solicitação já foi criada — não bloqueia o fluxo
        console.warn('[ProtectedRoute] Email não enviado:', emailErr)
      }

      setEstado('enviado')
    } catch (e) {
      console.error('[ProtectedRoute] Erro ao solicitar acesso:', e)
      setEstado('erro')
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Cabeçalho */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#eef1f8' }}>
            <Lock size={24} style={{ color: '#233772' }} />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1"
            style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Acesso Restrito
          </h1>
          <p className="text-sm text-slate-500">
            Você não tem permissão para acessar{' '}
            <span className="font-semibold text-slate-700">{nomePagina}</span>.
          </p>
        </div>

        <div className="px-8 py-6 space-y-4">

          {/* Verificando */}
          {estado === 'verificando' && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-400">
              <RefreshCw size={14} className="animate-spin" />
              Verificando solicitações anteriores...
            </div>
          )}

          {/* Enviado com sucesso */}
          {estado === 'enviado' && (
            <div className="rounded-xl p-5 text-center"
              style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
              <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: '#16a34a' }} />
              <p className="text-sm font-semibold" style={{ color: '#166534' }}>
                Solicitação enviada!
              </p>
              <p className="text-xs mt-1" style={{ color: '#15803d' }}>
                O administrador foi notificado e irá revisar seu pedido em breve.
              </p>
            </div>
          )}

          {/* Já existe pedido pendente */}
          {estado === 'pendente' && (
            <div className="rounded-xl p-5 text-center"
              style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fde68a' }}>
              <Clock size={28} className="mx-auto mb-2" style={{ color: '#d97706' }} />
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                Solicitação em análise
              </p>
              <p className="text-xs mt-1" style={{ color: '#b45309' }}>
                Você já enviou um pedido para esta página.<br />
                Aguarde a resposta do administrador.
              </p>
            </div>
          )}

          {/* Formulário (idle ou após erro) */}
          {(estado === 'idle' || estado === 'erro') && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Justificativa <span className="font-normal normal-case text-slate-300">(opcional)</span>
                </label>
                <textarea
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  placeholder="Explique por que precisa acessar esta página..."
                  rows={3}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:border-blue-400 transition-colors"
                  style={{ '--tw-ring-color': '#c7d2fe' }}
                />
              </div>

              {estado === 'erro' && (
                <p className="text-xs bg-red-50 text-red-600 rounded-lg px-3 py-2">
                  Erro ao enviar. Tente novamente.
                </p>
              )}

              <button
                onClick={solicitarAcesso}
                disabled={estado === 'enviando'}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ backgroundColor: '#233772' }}>
                <Send size={14} />
                Solicitar Acesso
              </button>
            </>
          )}

          <a href="/boas-vindas"
            className="block text-center text-xs text-slate-400 hover:text-slate-600 transition-colors pt-1">
            ← Voltar à tela inicial
          </a>
        </div>
      </div>
    </div>
  )
}
