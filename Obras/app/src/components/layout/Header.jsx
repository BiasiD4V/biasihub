import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, HelpCircle, User, LogOut, Settings, ChevronDown, X, Clock, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSidebar } from '../../context/SidebarContext'
import { supabase } from '../../lib/supabase'
import ObraChip from '../ui/ObraChip'

const rotulos = {
  // ── Obras ─────────────────────────────────────────────────
  '/':                          'Dashboard',
  '/dashboard':                 'Dashboard Obras',
  '/obras':                     'Gestão de Obras',
  '/contratos':                 'Contratos',
  '/medicoes':                  'Medição de Obra',
  '/medicoes-contrato':         'Medições de Contrato',
  '/suprimentos':               'Suprimentos — Pedidos de Compra',
  '/despesas-indiretas':        'Despesas Indiretas (DI)',
  '/adm-central':               'ADM Central — Rateio da Sede',
  '/resultado':                 'Resultado Operacional',
  '/orcamento':                 'Orçamento',
  '/diario-obra':               'Diário de Obra',
  '/relatorio-diario':          'Relatório Diário de Obras',
  '/tarefas':                   'Gestão de Tarefas',
  // ── Planejamento ──────────────────────────────────────────
  '/planejamento':              'Dashboard Planejamento',
  '/planejamento/cronograma':   'Cronograma',
  '/planejamento/recursos':     'Recursos',
  '/planejamento/progresso':    'Progresso Semanal',
  '/planejamento/curva-s':      'Curva S',
  '/planejamento/evm':          'Desempenho (EVM)',
  '/planejamento/reprogramacao':'Reprogramação',
  '/planejamento/relatorio':    'Relatório Semanal',
  '/cronograma':                'Cronograma',
  // ── Financeiro ────────────────────────────────────────────
  '/financeiro':                'Financeiro',
  '/previsto-realizado':        'Previsto x Realizado',
  '/custos-mo':                 'Custos Mão de Obra',
  '/curva-abc':                 'Curva ABC',
  // ── Administração ─────────────────────────────────────────
  '/usuarios':                  'Usuários e Permissões',
  '/perfil':                    'Meu Perfil',
  '/sienge-sync':               'Integração Sienge',
  '/glossario':                 'Glossário',
  '/minha-equipe':              'Minha Equipe',
}

const tipoCor = {
  alerta:  { bg: '#fef3c7', dot: '#d97706', text: '#92400e' },
  info:    { bg: '#eff6ff', dot: '#2563eb', text: '#1e40af' },
  sucesso: { bg: '#f0fdf4', dot: '#16a34a', text: '#166534' },
  erro:    { bg: '#fef2f2', dot: '#dc2626', text: '#991b1b' },
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (ref.current && !ref.current.contains(e.target)) handler() }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

export default function Header() {
  const { usuario, logout } = useAuth()
  const { toggleSidebar } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()

  const [abrirNotif, setAbrirNotif] = useState(false)
  const [abrirUser, setAbrirUser] = useState(false)
  const [notificacoes, setNotificacoes] = useState([])
  const [carregandoNotif, setCarregandoNotif] = useState(false)

  const refNotif = useRef(null)
  const refUser = useRef(null)
  useClickOutside(refNotif, () => setAbrirNotif(false))
  useClickOutside(refUser,  () => setAbrirUser(false))

  // Carrega notificações quando Header monta ou usuário muda
  useEffect(() => {
    if (!usuario?.id) return
    carregarNotificacoes()

    // Atualiza a cada 30s (opcional, remova se quiser apenas ao abrir painel)
    const intervalo = setInterval(carregarNotificacoes, 30000)
    return () => clearInterval(intervalo)
  }, [usuario?.id])

  /**
   * Busca notificações do usuário no Supabase
   * Filtra por acesso (obras, contratos, etc)
   */
  const carregarNotificacoes = async () => {
    if (!usuario?.id) return

    try {
      setCarregandoNotif(true)

      // Chama função RPC que retorna notificações filtradas por acesso
      const { data, error } = await supabase.rpc('obter_notificacoes_usuario', {
        p_usuario_id: usuario.id,
      })

      if (error) throw error

      // Mapeia resposta para formato de exibição
      const notif = (data || []).map(n => ({
        id: n.id,
        tipo: n.tipo,
        titulo: n.titulo,
        mensagem: n.mensagem,
        tempo: n.tempo,
        lida: n.lida,
        referencia_tipo: n.referencia_tipo,
        referencia_id: n.referencia_id,
      }))

      setNotificacoes(notif)
    } catch (err) {
      console.error('Erro ao carregar notificações:', err)
    } finally {
      setCarregandoNotif(false)
    }
  }

  /**
   * Marca uma notificação como lida
   * Insere registro em notificacoes_usuario_lida
   */
  const marcarLida = async (notificacao_id) => {
    if (!usuario?.id) return

    try {
      // Insere registro de leitura
      const { error } = await supabase
        .from('notificacoes_usuario_lida')
        .insert([ { usuario_id: usuario.id, notificacao_id } ])
        .select()

      if (error && error.code !== '23505') { // 23505 = UNIQUE violation (já foi marcada)
        throw error
      }

      // Atualiza estado local
      setNotificacoes(n => n.map(x => x.id === notificacao_id ? { ...x, lida: true } : x))
    } catch (err) {
      console.error('Erro ao marcar como lida:', err)
    }
  }

  /**
   * Marca todas as notificações não-lidas como lidas
   */
  const marcarTodasLidas = async () => {
    if (!usuario?.id) return

    const naolidas = notificacoes.filter(n => !n.lida)
    if (naolidas.length === 0) return

    try {
      const { error } = await supabase
        .from('notificacoes_usuario_lida')
        .insert(
          naolidas.map(n => ({ usuario_id: usuario.id, notificacao_id: n.id }))
        )

      if (error && error.code !== '23505') {
        throw error
      }

      // Atualiza estado local
      setNotificacoes(n => n.map(x => ({ ...x, lida: true })))
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err)
    }
  }

  /**
   * Abre a aba "Aguardando" em /usuarios para revisar a solicitação
   * Marca a notificação como lida e remove do painel
   */
  const revisarSolicitacao = async (notifId) => {
    await marcarLida(notifId)
    setNotificacoes(prev => prev.filter(n => n.id !== notifId))
    setAbrirNotif(false)
    navigate('/usuarios', { state: { aba: 'pendentes' } })
  }

  // Header especial para tela de boas-vindas
  let titulo = Object.entries(rotulos)
    .sort((a,b) => b[0].length - a[0].length)
    .find(([path]) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path)))?.[1]
    || 'ERP Biasi'
  if (location.pathname === '/' || location.pathname === '/boas-vindas') {
    titulo = 'Bem-vindo ao ERP Obras'
  }

  const naoLidas = notificacoes.filter(n => !n.lida).length

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center px-6 flex-shrink-0 transition-all duration-300"
      style={{
        height: '56px',
        background: 'linear-gradient(to right, #f8fafc 0%, #f1f5f9 100%)',
        borderBottom: '1px solid #e2e8f0',
        position: 'relative',
        zIndex: 40,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>

      {/* Logo e Branding */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: '#233772',
            boxShadow: '0 1px 3px rgba(35,55,114,0.1)'
          }}>
          <span className="text-sm font-bold" style={{ color: '#ffffff' }}>BI</span>
        </div>
        <div>
          <h1 className="text-sm font-bold" style={{ color: '#233772' }}>PCO</h1>
          <p className="text-[9px] leading-tight font-medium" style={{ color: '#475569' }}>Planejamento e Controle de Obras</p>
        </div>
      </div>

      {/* Separador visual */}
      <div className="hidden sm:block mx-4" style={{ width: '1px', height: '28px', backgroundColor: '#e2e8f0' }}></div>

      {/* Página atual (apenas em telas maiores) */}
      <div className="hidden sm:flex items-center flex-1">
        <p className="text-xs" style={{ color: '#64748b' }}>{titulo !== 'Bem-vindo ao ERP Obras' ? titulo : 'Bem-vindo'}</p>
      </div>

      {/* Seletor de obra — visível em desktop */}
      <ObraChip />

      <div className="flex items-center gap-2 ml-3">
        {/* Hamburger menu (mobile) */}
        <button onClick={toggleSidebar}
          className="md:hidden p-1.5 rounded-lg transition-all duration-200"
          style={{ color: '#64748b', backgroundColor: '#e2e8f0' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)' }}
          title="Menu">
          <Menu size={16} />
        </button>

        {/* Ajuda */}
        <button onClick={() => navigate('/glossario')}
          className="p-1.5 rounded-lg transition-all duration-200"
          style={{ color: '#64748b', backgroundColor: '#e2e8f0' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)' }}
          title="Glossário">
          <HelpCircle size={16} />
        </button>

        {/* ── NOTIFICAÇÕES ────────────────────────────── */}
        <div ref={refNotif} className="relative">
          <button onClick={() => { setAbrirNotif(v => !v); setAbrirUser(false) }}
            className="relative p-1.5 rounded-lg transition-all duration-200"
            style={{
              color: abrirNotif ? '#d97706' : '#64748b',
              backgroundColor: abrirNotif ? '#fef3c7' : '#e2e8f0',
              transform: 'translateY(0)'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = abrirNotif ? '#fef3c7' : '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)' }}>
            <Bell size={16} />
            {naoLidas > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse"
                style={{ backgroundColor: '#FFD700', color: '#233772' }}>{naoLidas}</span>
            )}
          </button>

          {abrirNotif && (
            <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-xl"
              style={{ width: 340, border: '1px solid #e5e7eb', top: '100%' }}>
              {/* Header painel */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #f1f5f9' }}>
                <span className="text-sm font-bold" style={{ color: '#233772' }}>
                  Notificações {naoLidas > 0 && <span className="text-xs font-normal text-slate-400">({naoLidas} novas)</span>}
                </span>
                <div className="flex items-center gap-2">
                  {naoLidas > 0 && (
                    <button onClick={marcarTodasLidas}
                      className="text-[10px] font-medium" style={{ color: '#2563eb' }}>
                      Marcar todas como lidas
                    </button>
                  )}
                  <button onClick={() => setAbrirNotif(false)} style={{ color: '#B3B3B3' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Lista */}
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {carregandoNotif ? (
                  <div className="py-8 text-center">
                    <Bell size={24} style={{ color: '#e5e7eb', margin: '0 auto 8px', animation: 'pulse 2s infinite' }} />
                    <p className="text-sm text-slate-400">Carregando...</p>
                  </div>
                ) : notificacoes.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell size={28} style={{ color: '#e5e7eb', margin: '0 auto 8px' }} />
                    <p className="text-sm text-slate-400">Sem notificações</p>
                  </div>
                ) : notificacoes.map(n => {
                  const cor = tipoCor[n.tipo] || tipoCor.info
                  // Só mostra botões em pedidos novos (título exato), não em respostas ("Acesso Aprovado"/"Solicitação Negada")
                  // Notificação de nova solicitação (para admin revisar)
                  const isSolicitacaoPendente = n.referencia_tipo === 'solicitacao_acesso'
                    && !n.lida
                    && n.titulo === 'Solicitação de Acesso'
                  return (
                    <div key={n.id}
                      onClick={() => { if (!isSolicitacaoPendente) { marcarLida(n.id) } }}
                      className="flex gap-3 px-4 py-3 transition-colors cursor-pointer"
                      style={{
                        borderBottom: '1px solid #f8fafc',
                        backgroundColor: n.lida ? '#fff' : cor.bg,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = n.lida ? '#fff' : cor.bg }}
                    >
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: n.lida ? '#e5e7eb' : cor.dot }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-tight" style={{ color: '#233772' }}>{n.titulo}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.mensagem}</p>
                        <div className="flex items-center gap-1 mt-1" style={{ color: '#B3B3B3' }}>
                          <Clock size={10} /><span className="text-[10px]">há {n.tempo}</span>
                        </div>

                        {/* ── Botão Revisar para solicitações pendentes ── */}
                        {isSolicitacaoPendente && (
                          <div className="mt-2">
                            <button
                              onClick={e => { e.stopPropagation(); revisarSolicitacao(n.id) }}
                              className="w-full text-[10px] font-bold py-1.5 px-3 rounded-lg text-white"
                              style={{ backgroundColor: '#233772' }}>
                              → Revisar Solicitação
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 text-center" style={{ borderTop: '1px solid #f1f5f9' }}>
                <span className="text-[11px]" style={{ color: '#B3B3B3' }}>
                  Notificações baseadas em acesso da obra
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── MENU USUÁRIO ────────────────────────────── */}
        <div ref={refUser} className="relative pl-2" style={{ borderLeft: '1px solid #e2e8f0' }}>
          <button
            onClick={() => { setAbrirUser(v => !v); setAbrirNotif(false) }}
            className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-all duration-200"
            style={{ backgroundColor: '#e2e8f0', transform: 'translateY(0)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = abrirUser ? '#cbd5e1' : '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)' }}>
            {usuario?.foto_url ? (
              <img
                src={usuario.foto_url}
                alt={usuario?.nome || 'Avatar'}
                className="w-7 h-7 rounded-full object-cover border-2 flex-shrink-0"
                style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
              />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: '#233772', color: '#ffffff' }}>
                {usuario?.avatar || '?'}
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold leading-tight" style={{ color: '#233772' }}>
                {usuario?.nome?.split(' ')[0]}
              </p>
              <p className="text-[9px] capitalize" style={{ color: '#94a3b8' }}>{usuario?.perfil}</p>
            </div>
            <ChevronDown size={13} style={{ color: '#94a3b8', transform: abrirUser ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {abrirUser && (
            <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-xl"
              style={{ width: 220, border: '1px solid #e5e7eb', top: '100%' }}>
              {/* Info usuário */}
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-2.5">
                  {usuario?.foto_url ? (
                    <img
                      src={usuario.foto_url}
                      alt={usuario?.nome || 'Avatar'}
                      className="w-10 h-10 rounded-full object-cover border-2 border-blue-900"
                      style={{ backgroundColor: '#233772' }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: '#233772', color: '#fff' }}>
                      {usuario?.avatar || '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold leading-tight" style={{ color: '#233772' }}>
                      {usuario?.nome?.split(' ').slice(0,2).join(' ')}
                    </p>
                    <p className="text-[10px] capitalize text-slate-400">{usuario?.perfil}</p>
                    <p className="text-[10px] text-slate-400 truncate" style={{ maxWidth: 120 }}>{usuario?.email}</p>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="py-1">
                <button
                  onClick={() => { navigate('/perfil'); setAbrirUser(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left hover:bg-slate-50"
                  style={{ color: '#333' }}>
                  <User size={14} style={{ color: '#233772' }} />
                  Meu Perfil
                </button>
                {(usuario?.perfil === 'admin' || usuario?.perfil === 'master') && (
                  <button
                    onClick={() => { navigate('/usuarios'); setAbrirUser(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left hover:bg-slate-50"
                    style={{ color: '#333' }}>
                    <Settings size={14} style={{ color: '#233772' }} />
                    Gerenciar Usuários
                  </button>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9' }} className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left hover:bg-red-50"
                  style={{ color: '#dc2626' }}>
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
