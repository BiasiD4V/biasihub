import React, { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Check, X, Loader2, ToggleLeft, ToggleRight, UserCog, Users, Clock, Wifi } from 'lucide-react'
import { supabase, perfisService } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ─── Hierarquia numérica para validar quem pode gerenciar quem ───────────────
const HIERARQUIA = {
  master: 8, admin: 7, diretor: 6, gerente: 5,
  planejamento: 4, planejamento_obra: 3, supervisor: 2, visualizador: 1,
}

// ─── Mapeamento setor → perfis que ele contém ────────────────────────────────
const SETOR_PERFIS = {
  administracao:    ['master', 'admin'],
  diretoria:        ['diretor'],
  gestao:           ['gerente'],
  planejamento:     ['planejamento'],
  planejamento_obra:['planejamento_obra'],
  campo:            ['supervisor'],
  leitura:          ['visualizador'],
}

const SETOR_LABEL = {
  administracao:    'Administração',
  diretoria:        'Diretoria',
  gestao:           'Gestão de Obras',
  planejamento:     'Planejamento Global',
  planejamento_obra:'Planejamento por Obra',
  campo:            'Campo',
  leitura:          'Visualizadores',
}

// Perfis que o gestor pode conceder (abaixo do próprio nível)
function perfisDisponiveis(perfilGestor) {
  const nivel = HIERARQUIA[perfilGestor] ?? 0
  return Object.entries(HIERARQUIA)
    .filter(([, v]) => v < nivel)
    .map(([k]) => k)
    .sort((a, b) => HIERARQUIA[b] - HIERARQUIA[a])
}

const perfilBadge = {
  admin:             { bg: '#7c3aed', text: '#fff',    label: 'Admin' },
  diretor:           { bg: '#233772', text: '#fff',    label: 'Diretor' },
  gerente:           { bg: '#2d4494', text: '#fff',    label: 'Gerente' },
  planejamento:      { bg: '#0891b2', text: '#fff',    label: 'Planejamento' },
  planejamento_obra: { bg: '#06b6d4', text: '#fff',    label: 'Planej./Obra' },
  supervisor:        { bg: '#FFC82D', text: '#233772', label: 'Supervisor' },
  visualizador:      { bg: '#B3B3B3', text: '#fff',    label: 'Visualizador' },
  master:            { bg: '#111827', text: '#fff',    label: 'MASTER' },
}

function isOnline(u) {
  if (!u.ultimo_acesso) return false
  return Date.now() - new Date(u.ultimo_acesso).getTime() < 10 * 60 * 1000
}

function tempoRelativo(ts) {
  if (!ts) return '—'
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (min < 1)  return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24)   return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

export default function MinhaEquipe() {
  const { usuario: usuarioLogado, setUsuario } = useAuth()

  // Redireciona se não for gestor
  const gestorSetores = usuarioLogado?.gestor_setores || []
  if (gestorSetores.length === 0) return <Navigate to="/" replace />

  const [setorAtivo, setSetorAtivo] = useState(gestorSetores[0])
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  // Aprovação de pendentes
  const [aprovandoId, setAprovandoId] = useState(null)
  const [perfilAprovacao, setPerfilAprovacao] = useState('supervisor')
  const [salvandoAprovacao, setSalvandoAprovacao] = useState(null)
  const [salvandoToggle, setSalvandoToggle] = useState(null)

  const disponiveisPerfil = perfisDisponiveis(usuarioLogado?.perfil)

  // ─── Carrega usuários do setor ativo ─────────────────────────
  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const perfisDoSetor = SETOR_PERFIS[setorAtivo] || []
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .in('perfil', perfisDoSetor)
        .is('deletado_em', null)
        .order('nome')
      if (error) throw error
      setLista(data || [])
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [setorAtivo])

  useEffect(() => { carregar() }, [carregar])

  const ativos   = lista.filter(u => u.ativo)
  const pendentes = lista.filter(u => !u.ativo)
  const online   = ativos.filter(u => isOnline(u))

  // ─── Aprovar usuário pendente ─────────────────────────────────
  const aprovar = async (u) => {
    setSalvandoAprovacao(u.id)
    try {
      await perfisService.atualizar(u.id, { ativo: true, perfil: perfilAprovacao })
      setLista(l => l.map(x => x.id === u.id ? { ...x, ativo: true, perfil: perfilAprovacao } : x))
      setAprovandoId(null)
    } catch (e) {
      setErro('Erro ao aprovar: ' + e.message)
    } finally {
      setSalvandoAprovacao(null)
    }
  }

  // ─── Toggle ativo/inativo ─────────────────────────────────────
  const toggleAtivo = async (u) => {
    // Segurança: gestor só pode desativar quem está abaixo na hierarquia
    if ((HIERARQUIA[u.perfil] ?? 0) >= (HIERARQUIA[usuarioLogado?.perfil] ?? 0)) {
      setErro('Você não pode desativar usuários com perfil igual ou superior ao seu.')
      return
    }
    setSalvandoToggle(u.id)
    try {
      await perfisService.atualizar(u.id, { ativo: !u.ativo })
      setLista(l => l.map(x => x.id === u.id ? { ...x, ativo: !u.ativo } : x))
    } catch (e) {
      setErro('Erro ao atualizar: ' + e.message)
    } finally {
      setSalvandoToggle(null)
    }
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Cabeçalho ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCog size={20} style={{ color: '#233772' }} />
            <h1 className="text-xl font-bold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
              Minha Equipe
            </h1>
          </div>
          <p className="text-sm" style={{ color: '#B3B3B3' }}>
            Você gerencia {gestorSetores.length === 1
              ? `o setor "${SETOR_LABEL[gestorSetores[0]] || gestorSetores[0]}"`
              : `${gestorSetores.length} setores`
            }. Aprove acessos, ative ou desative membros da sua equipe.
          </p>
        </div>

        {/* Badge de perfil do gestor */}
        <div className="flex-shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#B3B3B3' }}>Seu perfil</p>
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: perfilBadge[usuarioLogado?.perfil]?.bg, color: perfilBadge[usuarioLogado?.perfil]?.text }}>
            {perfilBadge[usuarioLogado?.perfil]?.label || usuarioLogado?.perfil}
          </span>
        </div>
      </div>

      {/* ── Tabs de setores ──────────────────────────────────────── */}
      {gestorSetores.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {gestorSetores.map(s => (
            <button key={s}
              onClick={() => setSetorAtivo(s)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={setorAtivo === s
                ? { backgroundColor: '#233772', color: '#fff', boxShadow: '0 2px 8px #23377222' }
                : { backgroundColor: '#fff', color: '#233772', border: '1px solid #e5e7eb' }
              }>
              {SETOR_LABEL[s] || s}
            </button>
          ))}
        </div>
      )}

      {/* ── KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     valor: lista.length,     cor: '#233772', bg: '#eff2fc', icone: <Users size={16} /> },
          { label: 'Ativos',    valor: ativos.length,    cor: '#16a34a', bg: '#f0fdf4', icone: <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> },
          { label: 'Online',    valor: online.length,    cor: '#0891b2', bg: '#f0f9ff', icone: <Wifi size={16} /> },
          { label: 'Aguardando',valor: pendentes.length, cor: pendentes.length > 0 ? '#92400e' : '#9ca3af', bg: pendentes.length > 0 ? '#fffbeb' : '#f8fafc',
            icone: <Clock size={16} />,
            border: pendentes.length > 0 ? '1.5px solid #FFC82D' : '1px solid #e5e7eb' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 flex items-center gap-3"
            style={{ border: k.border || '1px solid #e5e7eb' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: k.bg, color: k.cor }}>
              {k.icone}
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: k.cor, fontFamily: 'Montserrat, sans-serif' }}>{k.valor}</p>
              <p className="text-xs" style={{ color: '#B3B3B3' }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {erro && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
          {erro}
          <button className="ml-auto" onClick={() => setErro(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Pendentes de aprovação ───────────────────────────────── */}
      {pendentes.length > 0 && (
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1.5px solid #FFC82D' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
            <Clock size={14} style={{ color: '#d97706' }} />
            <p className="text-sm font-bold" style={{ color: '#92400e', fontFamily: 'Montserrat, sans-serif' }}>
              Aguardando aprovação
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: '#FFC82D', color: '#233772' }}>{pendentes.length}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['Usuário', 'E-mail', 'Perfil a Conceder', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: '#B3B3B3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendentes.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < pendentes.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: '#fff7ed', color: '#ea580c', border: '1.5px solid #fed7aa' }}>
                        {u.avatar}
                      </div>
                      <p className="font-semibold text-sm" style={{ color: '#1e293b' }}>{u.nome}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#B3B3B3' }}>{u.email}</td>
                  <td className="px-4 py-3">
                    {aprovandoId === u.id ? (
                      <select
                        value={perfilAprovacao}
                        onChange={e => setPerfilAprovacao(e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={{ border: '1.5px solid #233772', fontFamily: 'Montserrat, sans-serif' }}
                      >
                        {disponiveisPerfil.map(p => (
                          <option key={p} value={p}>{perfilBadge[p]?.label || p}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs" style={{ color: '#B3B3B3' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {aprovandoId === u.id ? (
                        <>
                          <button
                            onClick={() => aprovar(u)}
                            disabled={salvandoAprovacao === u.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                            style={{ backgroundColor: salvandoAprovacao === u.id ? '#B3B3B3' : '#16a34a' }}
                          >
                            {salvandoAprovacao === u.id
                              ? <><Loader2 size={12} className="animate-spin" />Aprovando...</>
                              : <><Check size={12} />Confirmar</>}
                          </button>
                          <button
                            onClick={() => setAprovandoId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ border: '1px solid #e5e7eb', color: '#B3B3B3' }}
                          >Cancelar</button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setAprovandoId(u.id); setPerfilAprovacao(disponiveisPerfil[0] || 'supervisor') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{ backgroundColor: '#233772' }}
                        >
                          <Check size={12} />Aprovar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Membros ativos ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
          <Users size={14} style={{ color: '#233772' }} />
          <p className="text-sm font-bold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
            {SETOR_LABEL[setorAtivo] || setorAtivo}
          </p>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: '#eff2fc', color: '#233772' }}>
            {lista.length} {lista.length === 1 ? 'membro' : 'membros'}
          </span>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 size={22} className="animate-spin" style={{ color: '#233772' }} />
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <Users size={32} style={{ color: '#e5e7eb' }} />
            <p className="text-sm" style={{ color: '#B3B3B3' }}>Nenhum membro neste setor ainda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['Membro', 'E-mail', 'Perfil', 'Status', 'Último Acesso', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: '#B3B3B3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((u, i) => {
                const badge   = perfilBadge[u.perfil] || perfilBadge.visualizador
                const online  = isOnline(u)
                const ehVoce  = u.id === usuarioLogado?.id
                const podeMexer = (HIERARQUIA[u.perfil] ?? 0) < (HIERARQUIA[usuarioLogado?.perfil] ?? 0)

                return (
                  <tr key={u.id} style={{
                    borderBottom: i < lista.length - 1 ? '1px solid #f1f5f9' : 'none',
                    opacity: u.ativo ? 1 : 0.55,
                  }}>
                    {/* Avatar + nome */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          {u.foto_url ? (
                            <img src={u.foto_url} alt={u.nome}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ backgroundColor: badge.bg, color: badge.text }}>
                              {u.avatar}
                            </div>
                          )}
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                            style={{ backgroundColor: online ? '#22c55e' : u.ativo ? '#d1d5db' : '#ef4444' }} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight" style={{ color: '#1e293b' }}>
                            {u.nome}
                            {ehVoce && (
                              <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: '#eff2fc', color: '#233772' }}>você</span>
                            )}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: online ? '#16a34a' : '#B3B3B3' }}>
                            {online ? 'Online · agora' : tempoRelativo(u.ultimo_acesso)}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 text-xs" style={{ color: '#B3B3B3' }}>{u.email}</td>
                    {/* Perfil */}
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: badge.bg, color: badge.text }}>{badge.label}</span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                        style={{
                          backgroundColor: online ? '#dcfce7' : u.ativo ? '#f0fdf4' : '#f8fafc',
                          color: online ? '#16a34a' : u.ativo ? '#16a34a' : '#9ca3af',
                          border: `1px solid ${online ? '#86efac' : u.ativo ? '#bbf7d0' : '#e5e7eb'}`
                        }}>
                        {online ? '● Online' : u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {/* Último acesso */}
                    <td className="px-4 py-3 text-xs" style={{ color: '#B3B3B3' }}>
                      {u.ultimo_acesso
                        ? new Date(u.ultimo_acesso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    {/* Ações */}
                    <td className="px-4 py-3">
                      {podeMexer && !ehVoce ? (
                        <button
                          onClick={() => toggleAtivo(u)}
                          disabled={salvandoToggle === u.id}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: u.ativo ? '#16a34a' : '#B3B3B3' }}
                          title={u.ativo ? 'Desativar acesso' : 'Ativar acesso'}
                        >
                          {salvandoToggle === u.id
                            ? <Loader2 size={16} className="animate-spin" />
                            : u.ativo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />
                          }
                        </button>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded-full"
                          style={{ backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                          {ehVoce ? 'Você' : 'Restrito'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Nota de limitações ───────────────────────────────────── */}
      <p className="text-xs text-center" style={{ color: '#B3B3B3' }}>
        Como gestor, você pode aprovar acessos e ativar/desativar membros do seu setor.
        Para excluir usuários ou alterar permissões globais, contate o administrador.
      </p>

    </div>
  )
}
