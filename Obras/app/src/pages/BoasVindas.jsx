import React from 'react'
import {
  LayoutDashboard, CalendarDays, Building2, BarChart3,
  DollarSign, ClipboardList, FileText, Users,
  Megaphone, Sparkles, Info, ArrowRight, Clock,
  TrendingUp, Wrench
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Saudação baseada no horário
function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Data formatada em pt-BR
function dataHoje() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

// Atalhos rápidos por grupo
const ATALHOS = [
  {
    grupo: 'Obras',
    cor: '#233772',
    bg: '#eff2fc',
    itens: [
      { label: 'Dashboard Obras',  desc: 'Visão geral de todas as obras',       icon: LayoutDashboard, rota: '/dashboard' },
      { label: 'Obras',            desc: 'Lista e cadastro de obras',            icon: Building2,       rota: '/obras' },
      { label: 'Contratos',        desc: 'Contratos e medições',                 icon: ClipboardList,   rota: '/contratos' },
    ]
  },
  {
    grupo: 'Planejamento',
    cor: '#0891b2',
    bg: '#f0f9ff',
    itens: [
      { label: 'Dashboard',        desc: 'KPIs, Curva S e IDP/IDC',             icon: BarChart3,       rota: '/planejamento' },
      { label: 'Cronograma',       desc: 'EAP, CPM e baseline',                 icon: CalendarDays,    rota: '/planejamento/cronograma' },
      { label: 'Progresso',        desc: 'Avanço semanal por atividade',         icon: TrendingUp,      rota: '/planejamento/progresso' },
    ]
  },
  {
    grupo: 'Financeiro',
    cor: '#16a34a',
    bg: '#f0fdf4',
    itens: [
      { label: 'Financeiro',       desc: 'Receitas, despesas e fluxo',          icon: DollarSign,      rota: '/financeiro' },
      { label: 'Previsto × Real',  desc: 'Comparativo orçado vs. executado',    icon: BarChart3,       rota: '/previsto-realizado' },
      { label: 'Custos MO',        desc: 'Custo de mão de obra por obra',       icon: Wrench,          rota: '/custos-mo' },
    ]
  },
  {
    grupo: 'Relatórios',
    cor: '#7c3aed',
    bg: '#f5f3ff',
    itens: [
      { label: 'Relatório Semanal',desc: 'Relatório de progresso consolidado',  icon: FileText,        rota: '/planejamento/relatorio' },
      { label: 'Desempenho (EVM)', desc: 'Índices IDP, IDC, variações',         icon: TrendingUp,      rota: '/planejamento/evm' },
      { label: 'Usuários',         desc: 'Gestão de membros e permissões',      icon: Users,           rota: '/usuarios' },
    ]
  },
]

// Novidades e avisos
const AVISOS = [
  { tipo: 'aviso',    icone: Megaphone, cor: '#233772', bg: '#eff2fc', borda: '#233772', texto: 'Nova versão do módulo de planejamento disponível!' },
  { tipo: 'novidade', icone: Sparkles,  cor: '#16a34a', bg: '#f0fdf4', borda: '#16a34a', texto: 'Dashboard de desempenho com filtros por obra e permissões.' },
  { tipo: 'dica',     icone: Info,      cor: '#d97706', bg: '#fffbeb', borda: '#d97706', texto: 'Consulte o glossário para entender todos os termos do sistema.' },
]

const ATUALIZACOES = [
  { data: '04/04/2026', texto: 'Integração com Sienge em fase de testes.' },
  { data: '28/03/2026', texto: 'Novo módulo de reprogramação de atividades liberado.' },
  { data: '15/03/2026', texto: 'Melhorias de performance e segurança em todo o sistema.' },
  { data: '01/03/2026', texto: 'Módulo de Custos MO disponível para Diretoria e Gerência.' },
]

export default function BoasVindas() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const primeiroNome = usuario?.nome?.split(' ')[0] || 'Usuário'

  return (
    <div className="p-6 space-y-6">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #233772 0%, #2d4494 60%, #0891b2 100%)' }}>
        <div className="px-8 py-7 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#93c5fd' }}>
              {saudacao()},
            </p>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {primeiroNome} 👋
            </h1>
            <p className="text-sm mt-1 capitalize" style={{ color: '#bfdbfe' }}>
              {dataHoje()}
            </p>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#93c5fd' }}>ERP Obras</p>
              <p className="text-white font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Biasi Engenharia</p>
              <p className="text-[11px]" style={{ color: '#bfdbfe' }}>PCO — Planejamento e Controle de Obras</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Atalhos rápidos ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ATALHOS.map(grupo => (
          <div key={grupo.grupo} className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
            {/* Cabeçalho do grupo */}
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: grupo.bg, borderBottom: '1px solid #e5e7eb' }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: grupo.cor }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: grupo.cor }}>{grupo.grupo}</span>
            </div>
            {/* Itens */}
            <div className="divide-y divide-slate-50">
              {grupo.itens.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.rota}
                    onClick={() => navigate(item.rota)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 group"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ backgroundColor: grupo.bg }}>
                      <Icon size={15} style={{ color: grupo.cor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1e293b' }}>{item.label}</p>
                      <p className="text-[11px] truncate" style={{ color: '#B3B3B3' }}>{item.desc}</p>
                    </div>
                    <ArrowRight size={13} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: grupo.cor }} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Avisos + Atualizações ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Avisos */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <Megaphone size={15} style={{ color: '#233772' }} />
            <span className="text-sm font-bold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>Avisos & Novidades</span>
          </div>
          <div className="divide-y divide-slate-50">
            {AVISOS.map((a, i) => {
              const Icon = a.icone
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: a.bg }}>
                    <Icon size={14} style={{ color: a.cor }} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: a.cor }}>
                      {a.tipo}
                    </span>
                    <p className="text-sm mt-0.5" style={{ color: '#334155' }}>{a.texto}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Atualizações */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <Clock size={15} style={{ color: '#233772' }} />
            <span className="text-sm font-bold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>Histórico de Atualizações</span>
          </div>
          <div className="divide-y divide-slate-50">
            {ATUALIZACOES.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <span className="text-[11px] font-mono font-semibold flex-shrink-0 mt-0.5 px-2 py-0.5 rounded"
                  style={{ backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e5e7eb' }}>
                  {a.data}
                </span>
                <p className="text-sm" style={{ color: '#334155' }}>{a.texto}</p>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 text-center text-[11px]" style={{ color: '#B3B3B3', borderTop: '1px solid #f1f5f9' }}>
            © {new Date().getFullYear()} Biasi Engenharia e Instalações Ltda. · Versão 1.0.0
          </div>
        </div>

      </div>
    </div>
  )
}
