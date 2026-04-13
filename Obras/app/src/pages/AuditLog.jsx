// ============================================================================
// pages/AuditLog.jsx
// Dashboard de Auditoria de Acessos e Ações — visível apenas para admin/master
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import {
  ShieldCheck, Download, RefreshCw, Search, Filter, ChevronDown, ChevronRight,
  AlertCircle, Loader2, Clock, User, Activity
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MODULOS = ['', 'usuarios', 'medicoes', 'planejamento', 'financeiro', 'permissoes']
const ACOES_OPCOES = [
  '', 'login', 'logout', 'criar_usuario', 'editar_usuario', 'aprovar_usuario',
  'excluir_usuario', 'desativar_usuario', 'reativar_usuario',
  'override_permissao', 'remover_override', 'salvar_permissoes_perfil',
  'lancar_medicao', 'aprovar_medicao', 'rejeitar_medicao',
  'congelar_baseline', 'importar_eap', 'aprovar_reprogramacao',
]

// Cores por ação
function corAcao(acao) {
  if (!acao) return { bg: '#f8fafc', text: '#94a3b8', border: '#e5e7eb' }
  if (acao.includes('excluir') || acao.includes('rejeitar')) return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }
  if (acao.includes('aprovar') || acao.includes('criar') || acao.includes('login')) return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }
  if (acao.includes('override') || acao.includes('permiss')) return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' }
  if (acao.includes('editar') || acao.includes('atualizar')) return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' }
  return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' }
}

// Formata data/hora PT-BR
function fmtData(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

export default function AuditLog() {
  const { usuario } = useAuth()

  // Redireciona se não for admin/master
  if (!['admin', 'master'].includes(usuario?.perfil)) {
    return <Navigate to="/perfil" replace />
  }

  const [registros, setRegistros] = useState([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [expandido, setExpandido] = useState(null) // id do registro expandido

  // ─── Filtros ──────────────────────────────────────────────
  const [filtros, setFiltros] = useState({
    acao:        '',
    modulo:      '',
    usuario_nome: '',
    data_de:     '',
    data_ate:    '',
  })
  const [pagina, setPagina] = useState(0)
  const POR_PAGINA = 50

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      let q = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('criado_em', { ascending: false })
        .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)

      if (filtros.acao)         q = q.eq('acao', filtros.acao)
      if (filtros.modulo)       q = q.eq('modulo', filtros.modulo)
      if (filtros.usuario_nome) q = q.ilike('usuario_nome', `%${filtros.usuario_nome}%`)
      if (filtros.data_de)      q = q.gte('criado_em', new Date(filtros.data_de).toISOString())
      if (filtros.data_ate) {
        const ate = new Date(filtros.data_ate)
        ate.setHours(23, 59, 59, 999)
        q = q.lte('criado_em', ate.toISOString())
      }

      const { data, count, error } = await q
      if (error) throw error
      setRegistros(data || [])
      setTotal(count || 0)
    } catch (e) {
      setErro('Erro ao carregar audit log: ' + e.message)
    } finally {
      setCarregando(false)
    }
  }, [filtros, pagina])

  useEffect(() => { carregar() }, [carregar])

  // ─── Exportar CSV ─────────────────────────────────────────
  const exportarCSV = () => {
    const cols = ['Data/Hora', 'Usuário', 'Perfil', 'Ação', 'Módulo', 'Entidade', 'Detalhes']
    const linhas = registros.map(r => [
      fmtData(r.criado_em),
      r.usuario_nome || '—',
      r.usuario_perfil || '—',
      r.acao,
      r.modulo || '—',
      r.entidade_nome || r.entidade_id || '—',
      r.detalhes || '—',
    ])
    const csv = [cols, ...linhas]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPaginas = Math.ceil(total / POR_PAGINA)

  return (
    <div className="p-6 space-y-5">

      {/* ── Cabeçalho ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#233772' }}>
            <ShieldCheck size={20} color="#fff" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
              Auditoria de Acessos
            </h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              {total.toLocaleString('pt-BR')} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ border: '1px solid #e5e7eb', color: '#475569' }}>
            <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#233772' }}>
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* ── KPIs rápidos ───────────────────────────────────────── */}
      {!carregando && registros.length > 0 && (() => {
        const hoje = registros.filter(r => {
          const d = new Date(r.criado_em)
          const now = new Date()
          return d.toDateString() === now.toDateString()
        })
        const uniqUsuarios = new Set(registros.map(r => r.usuario_id).filter(Boolean))
        const acoesSensiveis = registros.filter(r =>
          ['override_permissao','excluir_usuario','aprovar_usuario'].includes(r.acao)
        )
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total (filtro)', valor: total, cor: '#233772', bg: '#eff2fc', icone: <Activity size={16} /> },
              { label: 'Hoje', valor: hoje.length, cor: '#0891b2', bg: '#f0f9ff', icone: <Clock size={16} /> },
              { label: 'Usuários distintos', valor: uniqUsuarios.size, cor: '#16a34a', bg: '#f0fdf4', icone: <User size={16} /> },
              { label: 'Ações sensíveis', valor: acoesSensiveis.length, cor: '#dc2626', bg: '#fef2f2', icone: <AlertCircle size={16} /> },
            ].map(({ label, valor, cor, bg, icone }) => (
              <div key={label} className="bg-white rounded-xl p-4 flex items-center gap-3"
                style={{ border: '1px solid #e5e7eb' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: bg, color: cor }}>{icone}</div>
                <div>
                  <p className="text-xl font-bold" style={{ color: cor, fontFamily: 'Montserrat, sans-serif' }}>{valor}</p>
                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Filtros ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #e5e7eb' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} style={{ color: '#94a3b8' }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Busca por usuário */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Usuário..."
              value={filtros.usuario_nome}
              onChange={e => { setFiltros(f => ({ ...f, usuario_nome: e.target.value })); setPagina(0) }}
              className="w-full pl-7 pr-3 py-2 rounded-lg text-xs outline-none"
              style={{ border: '1px solid #e5e7eb' }}
            />
          </div>
          {/* Ação */}
          <select value={filtros.acao}
            onChange={e => { setFiltros(f => ({ ...f, acao: e.target.value })); setPagina(0) }}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none"
            style={{ border: '1px solid #e5e7eb' }}>
            <option value="">Todas as ações</option>
            {ACOES_OPCOES.filter(Boolean).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {/* Módulo */}
          <select value={filtros.modulo}
            onChange={e => { setFiltros(f => ({ ...f, modulo: e.target.value })); setPagina(0) }}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none"
            style={{ border: '1px solid #e5e7eb' }}>
            <option value="">Todos os módulos</option>
            {MODULOS.filter(Boolean).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {/* Data de */}
          <input type="date" value={filtros.data_de}
            onChange={e => { setFiltros(f => ({ ...f, data_de: e.target.value })); setPagina(0) }}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none"
            style={{ border: '1px solid #e5e7eb' }}
            title="Data inicial" />
          {/* Data até */}
          <input type="date" value={filtros.data_ate}
            onChange={e => { setFiltros(f => ({ ...f, data_ate: e.target.value })); setPagina(0) }}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none"
            style={{ border: '1px solid #e5e7eb' }}
            title="Data final" />
        </div>
        {/* Limpar filtros */}
        {Object.values(filtros).some(Boolean) && (
          <button
            onClick={() => { setFiltros({ acao: '', modulo: '', usuario_nome: '', data_de: '', data_ate: '' }); setPagina(0) }}
            className="mt-2 text-[11px] font-medium"
            style={{ color: '#94a3b8' }}>
            ✕ Limpar filtros
          </button>
        )}
      </div>

      {/* ── Tabela ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: '#233772' }} />
          </div>
        ) : erro ? (
          <div className="flex items-center gap-2 p-4" style={{ color: '#dc2626' }}>
            <AlertCircle size={16} /><span className="text-sm">{erro}</span>
          </div>
        ) : registros.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <ShieldCheck size={32} style={{ color: '#e5e7eb' }} />
            <p className="text-sm" style={{ color: '#94a3b8' }}>Nenhum registro encontrado.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  {['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Entidade', 'Detalhes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.map((r, i) => {
                  const cor = corAcao(r.acao)
                  const temDetalhes = r.dados_antes || r.dados_apos || r.detalhes
                  const aberto = expandido === r.id

                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => setExpandido(aberto ? null : r.id)}
                        className={`transition-colors ${temDetalhes ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                        style={{ borderBottom: '1px solid #f1f5f9', opacity: 1 }}
                      >
                        {/* Data/Hora */}
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#475569' }}>
                          <div className="flex items-center gap-1">
                            {temDetalhes && (
                              aberto
                                ? <ChevronDown size={11} style={{ color: '#94a3b8' }} />
                                : <ChevronRight size={11} style={{ color: '#94a3b8' }} />
                            )}
                            {fmtData(r.criado_em)}
                          </div>
                        </td>
                        {/* Usuário */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-xs font-medium" style={{ color: '#1e293b' }}>{r.usuario_nome || '—'}</p>
                            <p className="text-[10px]" style={{ color: '#94a3b8' }}>{r.usuario_perfil || ''}</p>
                          </div>
                        </td>
                        {/* Ação */}
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{ backgroundColor: cor.bg, color: cor.text, border: `1px solid ${cor.border}` }}>
                            {r.acao}
                          </span>
                        </td>
                        {/* Módulo */}
                        <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>{r.modulo || '—'}</td>
                        {/* Entidade */}
                        <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>
                          {r.entidade_nome || r.entidade_id || '—'}
                        </td>
                        {/* Detalhes resumo */}
                        <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: '#94a3b8' }}>
                          {r.detalhes || '—'}
                        </td>
                      </tr>
                      {/* Linha expandida com dados antes/depois */}
                      {aberto && temDetalhes && (
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                          <td colSpan={6} className="px-6 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {r.dados_antes && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Antes</p>
                                  <pre className="text-[11px] p-2 rounded-lg overflow-auto max-h-32"
                                    style={{ backgroundColor: '#fff', border: '1px solid #fecaca', color: '#dc2626', fontFamily: 'monospace' }}>
                                    {JSON.stringify(r.dados_antes, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {r.dados_apos && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Depois</p>
                                  <pre className="text-[11px] p-2 rounded-lg overflow-auto max-h-32"
                                    style={{ backgroundColor: '#fff', border: '1px solid #bbf7d0', color: '#16a34a', fontFamily: 'monospace' }}>
                                    {JSON.stringify(r.dados_apos, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {r.detalhes && !r.dados_antes && !r.dados_apos && (
                                <div className="col-span-2">
                                  <p className="text-xs" style={{ color: '#475569' }}>{r.detalhes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  Página {pagina + 1} de {totalPaginas} · {total.toLocaleString('pt-BR')} registros
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ border: '1px solid #e5e7eb', color: pagina === 0 ? '#d1d5db' : '#233772' }}>
                    ← Anterior
                  </button>
                  <button onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ border: '1px solid #e5e7eb', color: pagina >= totalPaginas - 1 ? '#d1d5db' : '#233772' }}>
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
