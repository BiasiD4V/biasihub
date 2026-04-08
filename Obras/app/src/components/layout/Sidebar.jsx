import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Building2, ClipboardCheck,
  Users, DollarSign, TrendingUp, ChevronLeft, ChevronRight, LogOut, HelpCircle, Database,
  CheckSquare, Handshake, Calendar,
  BarChart2, Activity, FileText, GitBranch, Gauge, HardHat, ShoppingCart,
  Layers, Calculator, Target, ShieldCheck, Home
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const SEPARADOR = '__sep__'

const grupos = [
  {
    titulo: 'OBRAS',
    perfis: ['admin', 'master', 'diretor', 'gerente', 'planejamento', 'planejamento_obra', 'supervisor'],
    itens: [
      { path: '/dashboard',         icone: LayoutDashboard, label: 'Dashboard Obras',   perfis: ['admin','master','diretor','gerente'] },
      { path: '/obras',             icone: Building2,       label: 'Obras',             perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra','supervisor','visualizador'] },
      { path: '/contratos',         icone: Handshake,       label: 'Contratos',         perfis: ['admin','master','diretor','gerente'] },
      { path: '/medicoes-contrato', icone: ClipboardCheck,  label: 'Medições',          perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra','supervisor'] },
      { path: '/suprimentos',       icone: ShoppingCart,    label: 'Suprimentos',       perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra'] },
      { path: '/tarefas',           icone: CheckSquare,     label: 'Gestão de Tarefas', perfis: ['admin','master','diretor','gerente','planejamento_obra','supervisor'] },
    ]
  },
  {
    titulo: 'PLANEJAMENTO',
    perfis: ['admin', 'master', 'diretor', 'gerente', 'planejamento', 'planejamento_obra', 'supervisor', 'visualizador'],
    itens: [
      { path: '/planejamento',              icone: LayoutDashboard, label: 'Dashboard',         perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra','supervisor','visualizador'] },
      { path: '/planejamento/cronograma',   icone: Calendar,        label: 'Cronograma',        perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra','supervisor','visualizador'] },
      { path: '/planejamento/recursos',      icone: Users,           label: 'Recursos',          perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra'] },
      { path: '/planejamento/histograma-mo', icone: BarChart2,       label: 'Histograma MO',     perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra'] },
      { path: '/planejamento/progresso',    icone: Activity,        label: 'Progresso Semanal', perfis: ['admin','master','planejamento','planejamento_obra','supervisor'] },
      { path: '/planejamento/curva-s',      icone: BarChart2,       label: 'Curva S',           perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra','supervisor','visualizador'] },
      { path: '/planejamento/evm',          icone: Gauge,           label: 'Desempenho (EVM)',  perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra'] },
      { path: '/planejamento/reprogramacao',icone: GitBranch,       label: 'Reprogramação',     perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra','supervisor'] },
      { path: '/planejamento/relatorio',    icone: FileText,        label: 'Relatórios',        perfis: ['admin','master','diretor','gerente','planejamento','planejamento_obra'] },
    ]
  },
  {
    titulo: 'FINANCEIRO',
    perfis: ['admin', 'master', 'diretor', 'gerente'],
    itens: [
      { path: '/financeiro',         icone: DollarSign,  label: 'Financeiro',             perfis: ['admin','master','diretor','gerente'] },
      { path: '/previsto-realizado', icone: TrendingUp,  label: 'Previsto x Realizado',   perfis: ['admin','master','diretor','gerente'] },
      { path: '/custos-mo',          icone: HardHat,     label: 'Custos MO',              perfis: ['admin','master','diretor','gerente'] },
      { path: '/despesas-indiretas', icone: Layers,      label: 'Desp. Indiretas (DI)',   perfis: ['admin','master','diretor','gerente'] },
      { path: '/adm-central',        icone: Calculator,  label: 'ADM Central',            perfis: ['admin','master','diretor','gerente'] },
      { path: '/resultado',          icone: Target,      label: 'Resultado Operacional',  perfis: ['admin','master','diretor','gerente'] },
    ]
  },
  {
    titulo: 'ADMINISTRAÇÃO',
    perfis: ['admin', 'master'],
    itens: [
      { path: '/audit-log',   icone: ShieldCheck,  label: 'Auditoria',         perfis: ['admin','master'] },
      { path: '/sienge-sync', icone: Database,     label: 'Integração Sienge', perfis: ['admin','master'] },
    ]
  },
]

// URL do Hub para voltar ao portal
const IS_ELECTRON = navigator.userAgent.includes('Electron')
const HUB_URL = IS_ELECTRON ? 'app://hub.local/' : 'https://biasihub-portal.vercel.app'

export default function Sidebar() {
  const [recolhido, setRecolhido] = useState(false)
  const { usuario, logout } = useAuth()
  const location = useLocation()
  // Permite que master enxergue todos os menus de admin
  const perfil = usuario?.perfil === 'master' ? 'master' : usuario?.perfil || ''

  // Logout e volta ao Hub
  const handleLogout = async () => {
    await logout()
    window.location.href = HUB_URL
  }

  return (
    <aside
      className={`flex flex-col flex-shrink-0 h-screen transition-all duration-300 ${recolhido ? 'w-16' : 'w-64'}`}
      style={{ backgroundColor: '#233772' }}
    >
      {/* LOGO — FIXO NO TOPO */}
      <div className="flex items-center h-16 px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', justifyContent: recolhido ? 'center' : 'space-between' }}>
        {!recolhido ? (
          <img src="/logo-branco.svg" alt="Biasi" className="h-9 w-auto" />
        ) : (
          <img src="/logo-icone.svg" alt="Biasi" className="h-7 w-7" />
        )}
        <button onClick={() => setRecolhido(!recolhido)}
          className="p-1 rounded-md transition-colors flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.4)', marginLeft: recolhido ? '0' : '0' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          title={recolhido ? 'Expandir menu' : 'Recolher menu'}
        >
          {recolhido ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* NAVEGAÇÃO — SCROLLÁVEL NO MEIO */}
      <nav className="flex-1 overflow-y-auto py-3">
        {grupos.map(grupo => {
          return (
            <div key={grupo.titulo} className="mb-1">
              {!recolhido && (
                <p className="px-4 pt-3 pb-1 text-[9px] font-semibold tracking-widest uppercase"
                  style={{ color: 'rgba(255,200,45,0.6)' }}>
                  {grupo.titulo}
                </p>
              )}
              {recolhido && <div className="mx-3 my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />}

              {grupo.itens.map((item, idx) => {
                if (item.path === SEPARADOR) {
                  if (recolhido) return (
                    <div key={`sep-${idx}`} className="mx-3 my-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
                  )
                  return (
                    <p key={`sep-${idx}`} className="px-4 pt-2.5 pb-0.5 text-[8px] font-bold tracking-widest uppercase"
                      style={{ color: 'rgba(255,200,45,0.35)' }}>
                      — {item.label} —
                    </p>
                  )
                }

                const isAtivo = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname === item.path || location.pathname.startsWith(item.path + '/')

                return (
                  <NavLink key={item.path} to={item.path}
                    title={recolhido ? item.label : undefined}
                    className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${recolhido ? 'justify-center' : ''}`}
                    style={isAtivo
                      ? { backgroundColor: '#FFC82D', color: '#233772', fontWeight: 700, boxShadow: '0 4px 12px rgba(255,200,45,0.3)' }
                      : { color: 'rgba(255,255,255,0.75)', transform: 'translateX(0)' }
                    }
                    onMouseEnter={e => { if (!isAtivo) { e.currentTarget.style.backgroundColor = 'rgba(255,200,45,0.1)'; e.currentTarget.style.color = '#FFC82D'; e.currentTarget.style.transform = 'translateX(4px)' } }}
                    onMouseLeave={e => { if (!isAtivo) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.transform = 'translateX(0)' } }}
                  >
                    {item.icone && <item.icone size={16} className="flex-shrink-0" />}
                    {!recolhido && <span className="flex-1">{item.label}</span>}
                  </NavLink>
                )
              })}
            </div>
          )
        })}

        {/* Glossário */}
        <div className="mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <NavLink to="/glossario"
            className={`flex items-center gap-3 mx-2 mt-2 px-3 py-2.5 rounded-lg text-sm transition-all ${recolhido ? 'justify-center' : ''}`}
            style={{ color: 'rgba(255,255,255,0.5)' }}
            title={recolhido ? 'Glossário' : undefined}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,200,45,0.1)'; e.currentTarget.style.color = '#FFC82D' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            <HelpCircle size={16} />
            {!recolhido && <span>Glossário</span>}
          </NavLink>
        </div>
      </nav>

      {/* BOTÃO VOLTAR AO HUB */}
      <div className="px-3 pb-1 flex-shrink-0">
        {!recolhido ? (
          <button
            onClick={() => { window.location.href = HUB_URL }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ backgroundColor: 'rgba(255,200,45,0.12)', color: '#FFC82D' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFC82D'; e.currentTarget.style.color = '#233772' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,200,45,0.12)'; e.currentTarget.style.color = '#FFC82D' }}
          >
            <Home size={13} />
            <span>Voltar ao Hub</span>
          </button>
        ) : (
          <button
            onClick={() => { window.location.href = HUB_URL }}
            title="Voltar ao Hub"
            className="w-full flex items-center justify-center p-1.5 rounded-lg transition-all"
            style={{ backgroundColor: 'rgba(255,200,45,0.12)', color: '#FFC82D' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFC82D'; e.currentTarget.style.color = '#233772' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,200,45,0.12)'; e.currentTarget.style.color = '#FFC82D' }}
          >
            <Home size={13} />
          </button>
        )}
      </div>

      {/* USUÁRIO — FIXO NO FUNDO */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {!recolhido ? (
          <div className="flex items-center gap-2.5">
            {usuario?.foto_url ? (
              <img
                src={usuario.foto_url}
                alt={usuario?.nome || 'Avatar'}
                className="w-8 h-8 rounded-full object-cover border-2 border-yellow-300 flex-shrink-0"
                style={{ backgroundColor: '#FFC82D' }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: '#FFC82D', color: '#233772' }}>
                {usuario?.avatar || '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {usuario?.nome?.split(' ').slice(0,2).join(' ')}
              </p>
              <p className="text-[10px] capitalize" style={{ color: 'rgba(255,255,255,0.45)' }}>{usuario?.perfil}</p>
            </div>
            <button onClick={handleLogout} title="Sair"
              className="p-1.5 rounded transition-colors flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFC82D'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
            ><LogOut size={14} /></button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {usuario?.foto_url ? (
              <img
                src={usuario.foto_url}
                alt={usuario?.nome || 'Avatar'}
                className="w-8 h-8 rounded-full object-cover border-2 border-yellow-300"
                style={{ backgroundColor: '#FFC82D' }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: '#FFC82D', color: '#233772' }}>
                {usuario?.avatar || '?'}
              </div>
            )}
            <button onClick={handleLogout} title="Sair"
              className="p-1 rounded transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFC82D'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
            ><LogOut size={12} /></button>
          </div>
        )}
      </div>
    </aside>
  )
}
