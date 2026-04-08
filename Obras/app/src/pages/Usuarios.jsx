import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight, Trash2, X, Check, Shield, Loader2, AlertTriangle, ChevronDown, ChevronRight, Building2, Save, Lock, Users, Wifi, UserX, Sliders, UserCog, Crown, KeyRound, ExternalLink } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase, perfisService, gestoresService } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useAuditLog, ACOES } from '../hooks/useAuditLog'
import SearchableSelect, { obrasParaOptions } from '../components/ui/SearchableSelect'


const ADMIN_MASTER_EMAIL = 'biasi-admin@biasiengenharia.com.br'
const PERFIS = ['admin','diretor','gerente','planejamento','planejamento_obra','supervisor','visualizador']

// Hierarquia numérica — usada para validar quem pode ser gestor de quem
const HIERARQUIA = {
  master: 8, admin: 7, diretor: 6, gerente: 5,
  planejamento: 4, planejamento_obra: 3, supervisor: 2, visualizador: 1,
}

// Cores dos badges na faixa de hierarquia (fundo escuro #1e293b)
const HIER_COR = {
  master:             { bg: 'rgba(241,245,249,0.12)', border: 'rgba(241,245,249,0.25)', text: '#e2e8f0' },
  admin:              { bg: 'rgba(124,58,237,0.22)',  border: 'rgba(167,139,250,0.5)',  text: '#c4b5fd' },
  diretor:            { bg: 'rgba(59,130,246,0.18)',  border: 'rgba(147,197,253,0.4)',  text: '#93c5fd' },
  gerente:            { bg: 'rgba(99,143,219,0.18)',  border: 'rgba(147,197,253,0.35)', text: '#bfdbfe' },
  planejamento:       { bg: 'rgba(8,145,178,0.18)',   border: 'rgba(103,232,249,0.4)',  text: '#67e8f9' },
  planejamento_obra:  { bg: 'rgba(6,182,212,0.15)',   border: 'rgba(103,232,249,0.3)',  text: '#a5f3fc' },
  supervisor:         { bg: 'rgba(255,200,45,0.15)',  border: 'rgba(253,224,71,0.4)',   text: '#fde047' },
  visualizador:       { bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)', text: '#94a3b8' },
}

// Agrupamento visual de perfis em setores/departamentos
const SETORES = [
  { id: 'administracao',      label: 'Administração',       perfis: ['master', 'admin'],                 cor: '#7c3aed' },
  { id: 'diretoria',          label: 'Diretoria',            perfis: ['diretor'],                         cor: '#233772' },
  { id: 'gestao',             label: 'Gestão de Obras',      perfis: ['gerente'],                         cor: '#2d4494' },
  { id: 'planejamento',       label: 'Planejamento Global',  perfis: ['planejamento'],                    cor: '#0891b2' },
  { id: 'planejamento_obra',  label: 'Planejamento por Obra',perfis: ['planejamento_obra'],               cor: '#06b6d4' },
  { id: 'campo',              label: 'Campo',                perfis: ['supervisor'],                      cor: '#D97706' },
  { id: 'leitura',            label: 'Visualizadores',       perfis: ['visualizador'],                    cor: '#6b7280' },
]

// Usuário é considerado "online" se acessou nos últimos 10 minutos
function isOnline(u) {
  if (!u.ultimo_acesso) return false
  return Date.now() - new Date(u.ultimo_acesso).getTime() < 10 * 60 * 1000
}

// Ex.: "há 3min", "há 2h", "há 4d"
function tempoRelativo(ts) {
  if (!ts) return '—'
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (min < 1)  return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24)   return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
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

// ──────────────────────────────────────────────────────────────────────────────
// Matriz de permissões exibida na aba "Permissões" e no modal de overrides.
// Cada linha = uma permissão canônica definida em src/lib/acesso.js.
// Os valores booleanos por coluna representam o DEFAULT de cada perfil.
//
// ATENÇÃO: "admin" é sempre true e não pode ser editado (bloqueado).
// "ver_todas_obras" dá acesso global (todas as obras sem vínculo).
// "ver_obras_proprias" dá acesso somente às obras vinculadas via usuario_obra.
// Supervisores/planejamento_obra NÃO precisam de "ver_todas_obras".
// ──────────────────────────────────────────────────────────────────────────────
const matrizPermissoes = [
  // ── PÁGINA OBRAS (/obras e /obras/:id) ──────────────────────────────────────
  // "Acesso Global" = enxerga todas as obras sem vínculo
  { grupo: 'Página Obras',  rota: '/obras',                  acao: 'Ver Todas as Obras (global)',        key: 'ver_todas_obras',        admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: false, supervisor: false, visualizador: false },
  // "Acesso por Vínculo" = enxerga somente obras vinculadas em usuario_obra
  { grupo: 'Página Obras',  rota: '/obras',                  acao: 'Ver Obras Vinculadas (próprias)',    key: 'ver_obras_proprias',     admin: false, diretor: false, gerente: false, planejamento: false, planejamento_obra: true,  supervisor: true,  visualizador: true  },
  { grupo: 'Página Obras',  rota: '/dashboard',              acao: 'Dashboard Geral',                   key: 'ver_dashboard',          admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: true  },
  { grupo: 'Página Obras',  rota: '/obras (cadastro)',       acao: 'Cadastrar / Editar Obras',          key: 'cadastrar_obras',        admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  // ── CONTRATOS & MEDIÇÕES ─────────────────────────────────────────────────────
  { grupo: 'Contratos & Medições', rota: '/contratos',       acao: 'Ver Contratos',                     key: 'ver_contratos',          admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Contratos & Medições', rota: '/medicoes',        acao: 'Ver Medições',                      key: 'ver_medicoes',           admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: false },
  { grupo: 'Contratos & Medições', rota: '/medicoes',        acao: 'Lançar Boletim de Medição',         key: 'lancar_medicao',         admin: true, diretor: false, gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: false },
  { grupo: 'Contratos & Medições', rota: '/medicoes',        acao: 'Aprovar / Rejeitar Medições',       key: 'aprovar_medicoes',       admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Contratos & Medições', rota: '/orcamento',       acao: 'Orçamento',                         key: 'ver_orcamento',          admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: false },
  // ── CAMPO ────────────────────────────────────────────────────────────────────
  { grupo: 'Campo',         rota: '/diario-obra',            acao: 'Diário de Obra (lançar)',            key: 'diario_obra',            admin: true, diretor: false, gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: false },
  { grupo: 'Campo',         rota: '/relatorio-diario',       acao: 'Relatório Diário (visualizar)',      key: 'ver_relatorio_diario',   admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: false },
  { grupo: 'Campo',         rota: '/tarefas',                acao: 'Gestão de Tarefas',                  key: 'gestao_tarefas',         admin: true, diretor: false, gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: false },
  // ── SUPRIMENTOS ──────────────────────────────────────────────────────────────
  { grupo: 'Suprimentos',   rota: '/suprimentos',            acao: 'Ver Suprimentos',                    key: 'ver_suprimentos',        admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: false, visualizador: false },
  { grupo: 'Suprimentos',   rota: '/suprimentos',            acao: 'Gerenciar Suprimentos (criar/editar)',key: 'gerenciar_suprimentos',  admin: true, diretor: false, gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  // ── PLANEJAMENTO ─────────────────────────────────────────────────────────────
  { grupo: 'Planejamento',  rota: '/planejamento',           acao: 'Dashboard Planejamento',             key: 'ver_planejamento',       admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: true  },
  { grupo: 'Planejamento',  rota: '/planejamento/cronograma',acao: 'Cronograma (visualizar)',            key: 'ver_cronograma',         admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: true  },
  { grupo: 'Planejamento',  rota: '/planejamento/cronograma',acao: 'Cronograma (editar atividades)',     key: 'editar_cronograma',      admin: true, diretor: false, gerente: false, planejamento: true,  planejamento_obra: true,  supervisor: false, visualizador: false },
  { grupo: 'Planejamento',  rota: '/planejamento/cronograma',acao: 'Planej. Global (editar baseline)',   key: 'editar_planejamento',    admin: true, diretor: false, gerente: false, planejamento: true,  planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Planejamento',  rota: '/planejamento/recursos',  acao: 'Recursos',                           key: 'ver_recursos',           admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: false, visualizador: false },
  { grupo: 'Planejamento',  rota: '/planejamento/progresso', acao: 'Progresso Semanal (visualizar)',     key: 'ver_progresso',          admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: false },
  { grupo: 'Planejamento',  rota: '/planejamento/progresso', acao: 'Registrar Avanço Físico',            key: 'registrar_avanco',       admin: true, diretor: false, gerente: false, planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: false },
  { grupo: 'Planejamento',  rota: '/planejamento/curva-s',   acao: 'Curva S',                            key: 'ver_curva_s',            admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: true  },
  { grupo: 'Planejamento',  rota: '/planejamento/evm',       acao: 'Desempenho — EVM (IDP/IDC)',         key: 'ver_evm',                admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: false, visualizador: false },
  { grupo: 'Planejamento',  rota: '/planejamento/reprogramacao', acao: 'Solicitar Reprogramação',       key: 'solicitar_reprogramacao',admin: true, diretor: false, gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: true,  visualizador: false },
  { grupo: 'Planejamento',  rota: '/planejamento/reprogramacao', acao: 'Aprovar Reprogramação',         key: 'aprovar_reprogramacao',  admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Planejamento',  rota: '/planejamento/relatorio',  acao: 'Relatório Semanal',                key: 'ver_relatorio',          admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: false, visualizador: false },
  { grupo: 'Planejamento',  rota: '—',                        acao: 'Importar EAP (Excel)',             key: 'importar_eap',           admin: true, diretor: false, gerente: false, planejamento: true,  planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Planejamento',  rota: '—',                        acao: 'Exportar Relatório (PDF)',         key: 'exportar_relatorio',     admin: true, diretor: true,  gerente: true,  planejamento: true,  planejamento_obra: true,  supervisor: false, visualizador: false },
  { grupo: 'Planejamento',  rota: '—',                        acao: 'Congelar Baseline',               key: 'congelar_baseline',      admin: true, diretor: false, gerente: false, planejamento: true,  planejamento_obra: false, supervisor: false, visualizador: false },
  // ── FINANCEIRO ───────────────────────────────────────────────────────────────
  { grupo: 'Financeiro',    rota: '/financeiro',              acao: 'Ver Financeiro',                   key: 'ver_financeiro',         admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Financeiro',    rota: '/previsto-realizado',      acao: 'Previsto x Realizado',             key: 'ver_previsto_realizado', admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Financeiro',    rota: '/custos-mo',               acao: 'Custos Mão de Obra',               key: 'ver_custos_mo',          admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Financeiro',    rota: '/curva-abc',               acao: 'Curva ABC',                        key: 'ver_curva_abc',          admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  // ── RESULTADO OPERACIONAL ────────────────────────────────────────────────────
  { grupo: 'Resultado Operacional', rota: '/despesas-indiretas', acao: 'Ver Despesas Indiretas (DI)',   key: 'ver_di',                 admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Resultado Operacional', rota: '/despesas-indiretas', acao: 'Gerenciar DI (criar/editar)',   key: 'gerenciar_di',           admin: true, diretor: false, gerente: false, planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Resultado Operacional', rota: '/adm-central',     acao: 'Ver ADM Central',                  key: 'ver_adm_central',        admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Resultado Operacional', rota: '/adm-central',     acao: 'Gerenciar ADM Central',            key: 'gerenciar_adm_central',  admin: true, diretor: false, gerente: false, planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Resultado Operacional', rota: '/resultado',       acao: 'Ver Resultado Operacional',        key: 'ver_resultado',          admin: true, diretor: true,  gerente: true,  planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  // ── ADMINISTRAÇÃO ────────────────────────────────────────────────────────────
  { grupo: 'Administração', rota: '/usuarios',                acao: 'Gerenciar Usuários',               key: 'gerenciar_usuarios',     admin: true, diretor: false, gerente: false, planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
  { grupo: 'Administração', rota: '/sienge-sync',             acao: 'Integração Sienge',                key: 'sienge_sync',            admin: true, diretor: false, gerente: false, planejamento: false, planejamento_obra: false, supervisor: false, visualizador: false },
];

function formatarAcesso(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function gerarSenha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Usuarios() {
  const { usuario: usuarioLogado, permissoesConfig, salvarPermissoes } = useAuth()
  const { registrar } = useAuditLog()
  const location = useLocation()
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroGlobal, setErroGlobal] = useState(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'supervisor' })
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState(null)
  const [senhaCriada, setSenhaCriada] = useState(null)
  // Estado para upload da foto do usuário
  const [uploadingFoto, setUploadingFoto] = useState(false)

  const [confirmarExclusao, setConfirmarExclusao] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  const [abaAtiva, setAbaAtiva] = useState(location.state?.aba || 'usuarios')

  // Sincroniza aba quando admin chega via notificação (ex: "Revisar Solicitação")
  useEffect(() => {
    if (location.state?.aba) setAbaAtiva(location.state.aba)
  }, [location.state])

  // ─── Estado: Acessos por Obra ──────────────────────────────
  const [obras, setObras] = useState([])
  const [acessos, setAcessos] = useState([])
  const [carregandoAcessos, setCarregandoAcessos] = useState(false)
  const [expandedUser, setExpandedUser] = useState(null)
  const [formAcessoAberto, setFormAcessoAberto] = useState(false)
  const [novoAcesso, setNovoAcesso] = useState({ usuario_id: '', obra_ids: [] })
  const [salvandoAcesso, setSalvandoAcesso] = useState(false)

  // Aprovação de pendentes
  const [aprovandoId, setAprovandoId] = useState(null)
  const [perfilAprovacao, setPerfilAprovacao] = useState('supervisor')
  const [salvandoAprovacao, setSalvandoAprovacao] = useState(null)

  // ─── Estado: Setores expandidos (todos abertos por padrão) ──
  const [expandedSetores, setExpandedSetores] = useState({})

  // ─── Estado: Gestores por setor ───────────────────────────────
  const [gestores, setGestores] = useState([])
  const [modalGestor, setModalGestor] = useState(null)   // { setorId, setorLabel }
  const [candidatoGestor, setCandidatoGestor] = useState('')
  const [salvandoGestor, setSalvandoGestor] = useState(false)

  // ─── Estado: Matriz de Permissões Editável ─────────────────
  const [modoEdicaoMatriz, setModoEdicaoMatriz] = useState(false)
  const [matrizEditavel, setMatrizEditavel] = useState(null) // null = usa dados do contexto
  const [salvandoMatriz, setSalvandoMatriz] = useState(false)
  const [msgPermissoes, setMsgPermissoes] = useState(null)

  // ─── Estado: Fila de Emails ────────────────────────────────
  const [processandoFila, setProcessandoFila] = useState(false)

  // ─── Estado: Solicitações de Acesso ────────────────────────
  const [solicitacoesAcesso, setSolicitacoesAcesso] = useState([])
  const [carregandoSolicitacoes, setCarregandoSolicitacoesAcesso] = useState(false)
  const [respondendoSolicitacao, setRespondendoSolicitacao] = useState(null) // id em processamento

  // ─── Estado: Overrides de Permissão por Usuário ────────────
  const [overridesUsuario, setOverridesUsuario] = useState([])   // overrides do usuário em edição
  const [carregandoOverrides, setCarregandoOverrides] = useState(false)
  const [mostrarOverrides, setMostrarOverrides] = useState(false)
  const [salvandoOverride, setSalvandoOverride] = useState(null) // key da permissão sendo salva

  // ─── Carrega overrides de permissão de um usuário ──────────
  const carregarOverridesDoUsuario = useCallback(async (usuarioId) => {
    setCarregandoOverrides(true)
    try {
      const agora = new Date().toISOString()
      const { data } = await supabase
        .from('usuario_permissoes_override')
        .select('*')
        .eq('usuario_id', usuarioId)
        .or(`validade_em.is.null,validade_em.gt.${agora}`)
        .order('permissao')
      setOverridesUsuario(data || [])
    } catch {
      setOverridesUsuario([])
    } finally {
      setCarregandoOverrides(false)
    }
  }, [])

  // ─── Salva (upsert) um override de permissão ───────────────
  const salvarOverride = useCallback(async (usuarioId, permissao, concedida, motivo = '') => {
    setSalvandoOverride(permissao)
    try {
      await supabase
        .from('usuario_permissoes_override')
        .upsert({
          usuario_id: usuarioId,
          permissao,
          concedida,
          motivo: motivo || null,
          criado_por: usuarioLogado?.id,
        }, { onConflict: 'usuario_id,permissao' })
      // Atualiza lista local
      setOverridesUsuario(prev => {
        const sem = prev.filter(o => o.permissao !== permissao)
        return [...sem, { usuario_id: usuarioId, permissao, concedida, motivo }]
      })
      await registrar({
        acao: ACOES.OVERRIDE_PERMISSAO, modulo: 'usuarios',
        entidade_id: usuarioId, entidade_nome: editando?.nome,
        dados_apos: { permissao, concedida, motivo },
      })
    } finally {
      setSalvandoOverride(null)
    }
  }, [usuarioLogado])

  // ─── Remove um override (restaura comportamento do perfil) ──
  const removerOverride = useCallback(async (usuarioId, permissao) => {
    setSalvandoOverride(permissao)
    try {
      await supabase
        .from('usuario_permissoes_override')
        .delete()
        .eq('usuario_id', usuarioId)
        .eq('permissao', permissao)
      setOverridesUsuario(prev => prev.filter(o => o.permissao !== permissao))
    } finally {
      setSalvandoOverride(null)
    }
  }, [])

  // ─── Carrega usuários do Supabase ─────────────────────────
  const carregarUsuarios = useCallback(async () => {
    setCarregando(true)
    setErroGlobal(null)
    try {
      const data = await perfisService.listar()
      // Inclui usuários deletados (soft delete) — ficam visíveis na aba "Aguardando"
      // para que o admin possa reativá-los ou excluí-los permanentemente
      setLista(data)
    } catch (e) {
      setErroGlobal('Erro ao carregar usuários: ' + e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregarUsuarios() }, [carregarUsuarios])

  // ─── Carrega gestores designados ──────────────────────────────
  const carregarGestores = useCallback(async () => {
    try {
      const data = await gestoresService.listar()
      setGestores(data)
    } catch { /* tabela pode não existir ainda */ }
  }, [])
  useEffect(() => { carregarGestores() }, [carregarGestores])

  // ─── Designar gestor de setor ─────────────────────────────────
  const designarGestor = async () => {
    if (!candidatoGestor || !modalGestor) return
    setSalvandoGestor(true)
    try {
      await gestoresService.designar(candidatoGestor, modalGestor.setorId, usuarioLogado?.id)
      await carregarGestores()
      setModalGestor(null)
      setCandidatoGestor('')
    } catch (e) {
      setErroGlobal('Erro ao designar gestor: ' + e.message)
    } finally {
      setSalvandoGestor(false)
    }
  }

  // ─── Remover gestor de setor ──────────────────────────────────
  const removerGestor = async (gestorId, setorId) => {
    if (!window.confirm('Remover gestor deste setor?')) return
    try {
      await gestoresService.removerPorUsuarioSetor(gestorId, setorId)
      await carregarGestores()
    } catch (e) {
      setErroGlobal('Erro ao remover gestor: ' + e.message)
    }
  }

  // ─── Solicitações de Acesso: carrega na montagem (para o badge) e ao entrar na aba ──
  useEffect(() => {
    setCarregandoSolicitacoesAcesso(true)
    supabase
      .from('solicitacoes_acesso')
      .select('*')
      .eq('status', 'pendente')
      .order('criada_em', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[Usuarios] Erro ao carregar solicitações:', error)
        setSolicitacoesAcesso(data || [])
        setCarregandoSolicitacoesAcesso(false)
      })
  }, [abaAtiva])

  const responderSolicitacao = async (solId, acao) => {
    // acao: 'aprovado' | 'negado'
    setRespondendoSolicitacao(solId)
    try {
      await supabase
        .from('solicitacoes_acesso')
        .update({
          status:        acao,
          respondida_em: new Date().toISOString(),
          respondido_por: usuarioLogado.id,
        })
        .eq('id', solId)
      // Notificação no sino para o solicitante
      const sol = solicitacoesAcesso.find(s => s.id === solId)
      if (sol) {
        // Se aprovado → concede permissão(ões) como override personalizado automaticamente
        if (acao === 'aprovado' && sol.permissao && sol.usuario_id) {
          const permissoes = sol.permissao.split(',').map(p => p.trim()).filter(Boolean)
          for (const p of permissoes) {
            await supabase
              .from('usuario_permissoes_override')
              .upsert({
                usuario_id: sol.usuario_id,
                permissao:  p,
                concedida:  true,
                motivo:     `Aprovado via solicitação de acesso à página "${sol.pagina}"`,
                criado_por: usuarioLogado.id,
              }, { onConflict: 'usuario_id,permissao' })
          }
        }

        // Notificação direcionada apenas ao solicitante (não ao admin/master)
        await supabase.from('notificacoes').insert({
          usuario_id: sol.usuario_id,
          tipo:    acao === 'aprovado' ? 'sucesso' : 'alerta',
          titulo:  acao === 'aprovado' ? 'Acesso Aprovado' : 'Solicitação Negada',
          mensagem: acao === 'aprovado'
            ? `Seu pedido de acesso à página "${sol.pagina}" foi aprovado.`
            : `Seu pedido de acesso à página "${sol.pagina}" não foi aprovado.`,
          referencia_tipo: 'solicitacao_acesso',
          referencia_id:   sol.id,
        })

        // Email de resposta via Edge Function (Office 365)
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
              body: JSON.stringify({ tipo: 'resposta_solicitacao', solicitacao_id: solId }),
            }
          )
        } catch (emailErr) {
          console.warn('[Usuarios] Email de resposta não enviado:', emailErr)
        }
      }
      setSolicitacoesAcesso(prev => prev.filter(s => s.id !== solId))
    } catch (e) {
      console.error('[Usuarios] Erro ao responder solicitação:', e)
    } finally {
      setRespondendoSolicitacao(null)
    }
  }

  // ─── Acessos: carrega ao trocar para aba acessos ───────────
  useEffect(() => {
    if (abaAtiva !== 'acessos') return
    setCarregandoAcessos(true)
    Promise.all([
      supabase.from('obras').select('id, codigo, nome').order('nome'),
      supabase.from('usuario_obra').select('*'),
    ]).then(([obrasRes, acessosRes]) => {
      setObras(obrasRes.data || [])
      setAcessos(acessosRes.data || [])
    }).finally(() => setCarregandoAcessos(false))
  }, [abaAtiva])

  const adicionarAcesso = async () => {
    const { usuario_id, obra_ids } = novoAcesso
    if (!usuario_id || obra_ids.length === 0) return

    // Remove obras que já estão vinculadas ao usuário
    const novas = obra_ids.filter(obra_id =>
      !acessos.some(a => a.usuario_id === usuario_id && a.obra_id === obra_id)
    )
    if (novas.length === 0) return

    setSalvandoAcesso(true)
    const registros = novas.map(obra_id => ({ usuario_id, obra_id }))
    const { data, error } = await supabase.from('usuario_obra').insert(registros).select()
    if (!error) {
      setAcessos(prev => [...prev, ...data])
      setNovoAcesso({ usuario_id: '', obra_ids: [] })
      setFormAcessoAberto(false)
    }
    setSalvandoAcesso(false)
  }

  const removerAcesso = async (id) => {
    await supabase.from('usuario_obra').delete().eq('id', id)
    setAcessos(prev => prev.filter(a => a.id !== id))
  }

  // ─── Processar fila de emails ──────────────────────────────
  const processarFila = async () => {
    setProcessandoFila(true)
    try {
      const { data, error } = await supabase.rpc('process_email_queue_manual')
      if (error) {
        setErroGlobal('Erro ao processar fila de emails: ' + error.message)
      } else {
        setErroGlobal(null)
        alert(`✅ Fila processada! ${data.enviados} email(s) enviado(s).`)
      }
    } catch (e) {
      setErroGlobal('Erro: ' + e.message)
    } finally {
      setProcessandoFila(false)
    }
  }

    if (usuarioLogado?.perfil !== 'admin' && usuarioLogado?.perfil !== 'master') {
      return <Navigate to="/perfil" replace />
    }

  // ─── Novo usuário ──────────────────────────────────────────
  const abrirNovo = () => {
    setEditando(null)
    const senha = gerarSenha()
    setForm({ nome: '', email: '', senha, perfil: 'supervisor' })
    setSenhaCriada(null)
    setErroModal(null)
    setModalAberto(true)
  }

  // ─── Editar ────────────────────────────────────────────────
  const abrirEdicao = (u) => {
    setEditando(u)
    setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil })
    setSenhaCriada(null)
    setErroModal(null)
    setMostrarOverrides(false)
    setOverridesUsuario([])
    carregarOverridesDoUsuario(u.id)
    setModalAberto(true)
  }

  // ─── Toggle ativo/inativo ─────────────────────────────────
  const toggleAtivo = async (u) => {
    try {
      await perfisService.atualizar(u.id, { ativo: !u.ativo })
      setLista(l => l.map(x => x.id === u.id ? { ...x, ativo: !u.ativo } : x))
    } catch (e) {
      setErroGlobal('Erro ao atualizar status: ' + e.message)
    }
  }

  // ─── Salvar (criar ou editar) ──────────────────────────────
  const salvar = async () => {
    if (!form.nome || !form.email) { setErroModal('Nome e e-mail são obrigatórios.'); return }
    setSalvando(true)
    setErroModal(null)

    try {
      let fotoUrl = form.foto && form.foto instanceof File ? null : form.foto;
      // Se for um novo arquivo, faz upload para Supabase Storage
      if (form.foto && form.foto instanceof File) {
        setUploadingFoto(true)
        const fileExt = form.foto.name.split('.').pop();
        const fileName = `${(editando ? editando.id : form.email)}_${Date.now()}.${fileExt}`;

        // Tenta upload; se bucket não existir, cria e tenta novamente
        let uploadError = null
        const { error: err1 } = await supabase.storage.from('usuarios').upload(fileName, form.foto, { upsert: true })
        if (err1) {
          if (err1.message?.toLowerCase().includes('bucket') || err1.error === 'Bucket not found') {
            // Cria o bucket como público e tenta novamente
            await supabase.storage.createBucket('usuarios', { public: true })
            const { error: err2 } = await supabase.storage.from('usuarios').upload(fileName, form.foto, { upsert: true })
            uploadError = err2
          } else {
            uploadError = err1
          }
        }
        if (uploadError) throw new Error('Erro ao enviar foto: ' + uploadError.message)

        // Pega a URL pública
        const { data: publicUrlData } = supabase.storage.from('usuarios').getPublicUrl(fileName);
        fotoUrl = publicUrlData.publicUrl;
        setUploadingFoto(false)
      }

      if (editando) {
        // Edição — atualiza campos do perfil, incluindo foto se houver
        const atualizados = { nome: form.nome, perfil: form.perfil };
        if (fotoUrl) atualizados.foto = fotoUrl;
        await perfisService.atualizar(editando.id, atualizados)
        setLista(l => l.map(x => x.id === editando.id ? { ...x, ...atualizados, foto: fotoUrl || x.foto } : x))
        await registrar({
          acao: ACOES.EDITAR_USUARIO, modulo: 'usuarios',
          entidade_id: editando.id, entidade_nome: editando.nome,
          dados_antes: { nome: editando.nome, perfil: editando.perfil },
          dados_apos: atualizados,
        })
        setModalAberto(false)
      } else {
        // Criação — via Edge Function (requer service role)
        const json = await chamarManageUser({
          action: 'create',
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          perfilAcesso: form.perfil,
          foto: fotoUrl || undefined,
        })
        setLista(l => [...l, json.usuario])
        await registrar({
          acao: ACOES.CRIAR_USUARIO, modulo: 'usuarios',
          entidade_id: json.usuario?.id, entidade_nome: form.nome,
          dados_apos: { nome: form.nome, email: form.email, perfil: form.perfil },
        })
        setSenhaCriada(form.senha)
      }
    } catch (e) {
      setErroModal(e.message)
    } finally {
      setSalvando(false)
      setUploadingFoto(false)
    }
  }

  // ─── Helper: chama manage-user Edge Function ─────────────
  const chamarManageUser = async (body) => {
    const { data, error } = await supabase.functions.invoke('manage-user', { body })
    if (error) {
      // FunctionsHttpError: o body real está em error.context (Response object)
      let msg = error.message || 'Erro na operação'
      try {
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json()
          msg = errBody?.error || errBody?.message || msg
        }
      } catch { /* ignora falha ao ler body */ }
      throw new Error(msg)
    }
    return data;
  }

  // ─── Aprovar usuário pendente ──────────────────────────────
  const aprovarUsuario = async (u, perfil) => {
    setSalvandoAprovacao(u.id)
    try {
      await perfisService.atualizar(u.id, { ativo: true, perfil })
      // Nota: Email é enviado automaticamente via trigger na tabela perfis
      setLista(l => l.map(x => x.id === u.id ? { ...x, ativo: true, perfil } : x))
      await registrar({
        acao: ACOES.APROVAR_USUARIO, modulo: 'usuarios',
        entidade_id: u.id, entidade_nome: u.nome,
        dados_apos: { perfil, ativo: true },
      })
      setAprovandoId(null)
    } catch (e) {
      setErroGlobal('Erro ao aprovar usuário: ' + e.message)
    } finally {
      setSalvandoAprovacao(null)
    }
  }

  // ─── Recusar (excluir) usuário pendente ───────────────────
  // Usuários SSO pendentes podem não existir no auth ainda → tentar Edge Function,
  // com fallback para deletar apenas o perfil (apenas dados locais)
  const recusarUsuario = async (u) => {
    if (!window.confirm(`Recusar e excluir "${u.nome}"?\n\nO usuário não poderá fazer login.`)) return
    setExcluindo(true)
    try {
      try {
        // Tenta deletar via Edge Function (remove auth + perfil)
        await chamarManageUser({ action: 'delete', userId: u.id })
      } catch {
        // Fallback: remove apenas o perfil e vínculos (útil para SSO pré-auth)
        await supabase.from('usuario_obra').delete().eq('usuario_id', u.id)
        const { error: delErr } = await supabase.from('perfis').delete().eq('id', u.id)
        if (delErr) throw delErr
      }
      setLista(l => l.filter(x => x.id !== u.id))
    } catch (e) {
      setErroGlobal('Erro ao recusar usuário: ' + e.message)
    } finally {
      setExcluindo(false)
    }
  }

  // ─── Reativar usuário suspenso (limpa deletado_em e ativa) ──────────────────
  const reativarUsuario = async (u) => {
    if (!window.confirm(`Reativar "${u.nome}"?\n\nO usuário voltará a ter acesso com o perfil "${u.perfil}".`)) return
    setSalvandoAprovacao(u.id)
    try {
      await perfisService.atualizar(u.id, { deletado_em: null, deletado_por: null, ativo: true })
      setLista(l => l.map(x => x.id === u.id ? { ...x, deletado_em: null, deletado_por: null, ativo: true } : x))
    } catch (e) {
      setErroGlobal('Erro ao reativar usuário: ' + e.message)
    } finally {
      setSalvandoAprovacao(null)
    }
  }

  // ─── Excluir permanentemente usuário suspenso ────────────────────────────────
  const excluirPermanente = async (u) => {
    if (!window.confirm(`⚠️ EXCLUIR PERMANENTEMENTE "${u.nome}"?\n\nEsta ação é irreversível. O usuário será removido do sistema de autenticação e todos os seus dados serão apagados.`)) return
    setExcluindo(true)
    try {
      await chamarManageUser({ action: 'delete', userId: u.id })
      setLista(l => l.filter(x => x.id !== u.id))
    } catch {
      // Fallback: remove apenas perfil e vínculos se edge function falhar
      try {
        await supabase.from('usuario_obra').delete().eq('usuario_id', u.id)
        const { error: delErr } = await supabase.from('perfis').delete().eq('id', u.id)
        if (delErr) throw delErr
        setLista(l => l.filter(x => x.id !== u.id))
      } catch (e2) {
        setErroGlobal('Erro ao excluir permanentemente: ' + e2.message)
      }
    } finally {
      setExcluindo(false)
    }
  }

  // ─── Função para excluir usuário ativo (chamada pelo modal de confirmação) ───
  // Usa soft delete: marca como deletado_em em vez de remover do banco
  const excluir = async () => {
    if (!confirmarExclusao) return
    setExcluindo(true)
    try {
      // Soft delete: marca como deletado com timestamp e admin que deletou
      const agora = new Date().toISOString()
      await perfisService.atualizar(confirmarExclusao.id, {
        deletado_em: agora,
        deletado_por: usuarioLogado?.id || null,
        ativo: false // Garante que fica inativo também
      })
      // Remove de lista local
      setLista(l => l.filter(x => x.id !== confirmarExclusao.id))
      setConfirmarExclusao(null)
    } catch (e) {
      setErroGlobal('Erro ao excluir usuário: ' + e.message)
    } finally {
      setExcluindo(false)
    }
  }

  // Usuários ativos (não deletados) — exibidos na tabela principal
  const listaAtivos = lista.filter(u => !u.deletado_em)
  // Pendentes de aprovação: sem acesso mas não deletados
  const pendentesAprovacao = lista.filter(u => !u.ativo && !u.deletado_em)
  // Suspensos: soft-deleted
  const suspensos = lista.filter(u => !!u.deletado_em)
  // Total da aba "Aguardando" = pendentes + suspensos
  const pendentes = [...pendentesAprovacao, ...suspensos]
  const cols = ['admin','diretor','gerente','planejamento','planejamento_obra','supervisor','visualizador']

  return (
    <div className="p-6">
      {/* Menu de Abas */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setAbaAtiva('usuarios')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${abaAtiva === 'usuarios' ? 'bg-[#233772] text-white' : 'bg-white text-[#233772] border'} `}
          style={abaAtiva === 'usuarios' ? { boxShadow: '0 2px 8px #23377222' } : {}}
        >Usuários</button>
        <button
          onClick={() => setAbaAtiva('pendentes')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${abaAtiva === 'pendentes' ? 'bg-[#FFC82D] text-[#233772]' : 'bg-white text-[#B3B3B3] border'}`}
          style={abaAtiva === 'pendentes' ? { boxShadow: '0 2px 8px #FFC82D33' } : {}}
        >
          Aguardando
          {(pendentes.length + solicitacoesAcesso.length) > 0 && (
            <span
              className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center leading-none"
              style={{
                backgroundColor: abaAtiva === 'pendentes' ? '#233772' : '#FFC82D',
                color:           abaAtiva === 'pendentes' ? '#FFC82D'  : '#233772',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {pendentes.length + solicitacoesAcesso.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setAbaAtiva('permissoes')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${abaAtiva === 'permissoes' ? 'bg-[#10b981] text-white' : 'bg-white text-[#10b981] border'}`}
          style={abaAtiva === 'permissoes' ? { boxShadow: '0 2px 8px #10b98133' } : {}}
        >Permissões</button>
        <button
          onClick={() => setAbaAtiva('acessos')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${abaAtiva === 'acessos' ? 'bg-[#0891b2] text-white' : 'bg-white text-[#0891b2] border'}`}
          style={abaAtiva === 'acessos' ? { boxShadow: '0 2px 8px #0891b233' } : {}}
        >Acesso Obra</button>
      </div>

      {abaAtiva === 'usuarios' && (
        <div className="space-y-4">

          {/* ── KPIs ──────────────────────────────────────────────── */}
          {(() => {
            const ativos   = listaAtivos.filter(u => u.ativo)
            const inativos = listaAtivos.filter(u => !u.ativo)
            const online   = listaAtivos.filter(u => isOnline(u))
            const cards = [
              { label: 'Total',    valor: listaAtivos.length, icone: <Users size={18} style={{ color: '#233772' }} />, bg: '#eff2fc', cor: '#233772' },
              { label: 'Ativos',   valor: ativos.length,      icone: <div className="w-3 h-3 rounded-full bg-green-500" />, bg: '#f0fdf4', cor: '#16a34a' },
              { label: 'Online',   valor: online.length,      icone: <Wifi  size={18} style={{ color: '#0891b2' }} />, bg: '#f0f9ff', cor: '#0891b2' },
              { label: 'Inativos', valor: inativos.length,    icone: <UserX size={18} style={{ color: '#9ca3af' }} />, bg: '#f8fafc', cor: '#9ca3af' },
            ]
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {cards.map(({ label, valor, icone, bg, cor }) => (
                  <div key={label} className="bg-white rounded-xl p-4 flex items-center gap-3" style={{ border: '1px solid #e5e7eb' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                      {icone}
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: cor, fontFamily: 'Montserrat, sans-serif' }}>{valor}</p>
                      <p className="text-xs" style={{ color: '#B3B3B3' }}>{label}</p>
                    </div>
                  </div>
                ))}

                {/* Card Aguardando Aprovação — destaque amarelo quando há pendentes */}
                <button
                  onClick={() => setAbaAtiva('pendentes')}
                  className="rounded-xl p-4 flex items-center gap-3 transition-all hover:scale-[1.02] text-left"
                  style={{
                    border: (pendentes.length + solicitacoesAcesso.length) > 0 ? '1.5px solid #FFC82D' : '1px solid #e5e7eb',
                    backgroundColor: (pendentes.length + solicitacoesAcesso.length) > 0 ? '#fffbeb' : '#fff',
                    boxShadow: (pendentes.length + solicitacoesAcesso.length) > 0 ? '0 2px 12px #FFC82D33' : 'none',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative"
                    style={{ backgroundColor: (pendentes.length + solicitacoesAcesso.length) > 0 ? '#FFF3C0' : '#f8fafc' }}
                  >
                    <Users size={18} style={{ color: (pendentes.length + solicitacoesAcesso.length) > 0 ? '#92400e' : '#d1d5db' }} />
                    {(pendentes.length + solicitacoesAcesso.length) > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none"
                        style={{ backgroundColor: '#FFC82D', color: '#233772', fontFamily: 'Montserrat, sans-serif' }}
                      >
                        {pendentes.length + solicitacoesAcesso.length}
                      </span>
                    )}
                  </div>
                  <div>
                    <p
                      className="text-2xl font-bold"
                      style={{
                        color: (pendentes.length + solicitacoesAcesso.length) > 0 ? '#92400e' : '#d1d5db',
                        fontFamily: 'Montserrat, sans-serif',
                      }}
                    >
                      {pendentes.length + solicitacoesAcesso.length}
                    </p>
                    <p className="text-xs" style={{ color: (pendentes.length + solicitacoesAcesso.length) > 0 ? '#b45309' : '#B3B3B3' }}>
                      Aguardando
                    </p>
                  </div>
                </button>
              </div>
            )
          })()}

          {/* ── Hierarquia de acesso ──────────────────────────────── */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#1e293b' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#64748b' }}>Hierarquia de Acesso</p>
            <div className="flex gap-2 flex-wrap">
              {['master','admin','diretor','gerente','planejamento','planejamento_obra','supervisor','visualizador'].map(p => {
                const b = perfilBadge[p]
                const h = HIER_COR[p]
                return (
                  <span key={p} className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: h.bg, color: h.text, border: `1px solid ${h.border}` }}>
                    {b.label}
                  </span>
                )
              })}
            </div>
            <p className="text-[10px] mt-2" style={{ color: '#94a3b8' }}>
              Admin e Master têm acesso total · Diretor / Gerente / Planejamento têm acesso global a todas as obras · Planej./Obra / Supervisor / Visualizador são vinculados por obra
            </p>
          </div>

          {/* ── Botão Adicionar ───────────────────────────────────── */}
          <div className="flex justify-end">
            <button onClick={abrirNovo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#233772' }}>
              <Plus size={15} /> Adicionar Usuário
            </button>
          </div>

          {/* ── Grupos por setor ──────────────────────────────────── */}
          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin" style={{ color: '#233772' }} />
            </div>
          ) : (
            SETORES.map(setor => {
              const membros           = listaAtivos.filter(u => setor.perfis.includes(u.perfil))
              if (membros.length === 0) return null
              const onlineMembros     = membros.filter(u => isOnline(u))
              const expanded          = expandedSetores[setor.id] !== false
              const gestoresDoSetor   = gestores.filter(g => g.setor === setor.id)
              const nivelMaxSetor     = Math.max(...setor.perfis.map(p => HIERARQUIA[p] ?? 0))
              const candidatosElegiveis = listaAtivos.filter(u =>
                (HIERARQUIA[u.perfil] ?? 0) > nivelMaxSetor &&
                !gestoresDoSetor.some(g => g.usuario_id === u.id)
              )

              return (
                <div key={setor.id} className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>

                  {/* Cabeçalho do setor */}
                  <div
                    onClick={() => setExpandedSetores(prev => ({ ...prev, [setor.id]: !expanded }))}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                    style={{ borderBottom: expanded ? '1px solid #f1f5f9' : 'none' }}
                  >
                    <div className="flex items-center gap-3 flex-wrap flex-1">
                      {expanded
                        ? <ChevronDown  size={14} style={{ color: '#B3B3B3' }} />
                        : <ChevronRight size={14} style={{ color: '#B3B3B3' }} />}
                      <Building2 size={15} style={{ color: setor.cor }} />
                      <span className="font-semibold text-sm" style={{ color: '#1e293b' }}>{setor.label}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#f8fafc', color: '#B3B3B3', border: '1px solid #e5e7eb' }}>
                        {membros.length} {membros.length === 1 ? 'membro' : 'membros'}
                      </span>
                      {onlineMembros.length > 0 && (
                        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#16a34a' }}>
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          {onlineMembros.length} online
                        </span>
                      )}
                      {/* Badge de gestores designados */}
                      {gestoresDoSetor.map(g => (
                        <span key={g.id} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#eff2fc', color: '#233772', border: '1px solid #c7d2fe' }}>
                          <Crown size={10} />
                          {g.usuario?.nome?.split(' ')[0] || '—'}
                          <button
                            onClick={e => { e.stopPropagation(); removerGestor(g.usuario_id, setor.id) }}
                            className="ml-0.5 transition-colors hover:text-red-500"
                            title="Remover gestor"
                          ><X size={9} /></button>
                        </span>
                      ))}
                    </div>
                    {/* Botão Designar Gestor */}
                    {candidatosElegiveis.length > 0 && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setModalGestor({ setorId: setor.id, setorLabel: setor.label, candidatos: candidatosElegiveis })
                          setCandidatoGestor(candidatosElegiveis[0]?.id || '')
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors hover:opacity-80 ml-2"
                        style={{ backgroundColor: '#eff2fc', color: '#233772', border: '1px solid #c7d2fe' }}
                        title="Designar gestor para este setor"
                      >
                        <UserCog size={13} /> Gestor
                      </button>
                    )}
                  </div>

                  {/* Tabela de membros */}
                  {expanded && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                          {['Membro', 'E-mail', 'Papel', 'Status', 'Último Acesso', 'Ações'].map(h => (
                            <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#B3B3B3' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {membros.map((u, i) => {
                          const isMaster    = u.email === ADMIN_MASTER_EMAIL
                          const badge       = isMaster ? perfilBadge.master : (perfilBadge[u.perfil] || perfilBadge.visualizador)
                          const ehVoceMesmo = u.id === usuarioLogado?.id
                          const online      = isOnline(u)

                          return (
                            <tr key={u.id} style={{
                              borderBottom: i < membros.length - 1 ? '1px solid #f1f5f9' : 'none',
                              opacity: u.ativo ? 1 : 0.55
                            }}>
                              {/* Avatar + nome */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative flex-shrink-0">
                                    {u.foto ? (
                                      <img src={u.foto} alt={u.nome} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{
                                          backgroundColor: isMaster ? '#111827' : setor.cor,
                                          color: setor.cor === '#D97706' ? '#fff' : '#fff'
                                        }}>
                                        {u.avatar}
                                      </div>
                                    )}
                                    {/* Indicador de presença */}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                                      style={{ backgroundColor: online ? '#22c55e' : u.ativo ? '#d1d5db' : '#ef4444' }} />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm leading-tight" style={{ color: '#1e293b' }}>
                                      {u.nome}
                                      {ehVoceMesmo && (
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
                              {/* Papel */}
                              <td className="px-4 py-3">
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                                  style={{ backgroundColor: badge.bg, color: badge.text }}>{badge.label}</span>
                              </td>
                              {/* Status */}
                              <td className="px-4 py-3">
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                                  style={{
                                    backgroundColor: online ? '#dcfce7' : u.ativo ? '#f0fdf4' : '#f8fafc',
                                    color:           online ? '#16a34a' : u.ativo ? '#16a34a' : '#9ca3af',
                                    border: `1px solid ${online ? '#86efac' : u.ativo ? '#bbf7d0' : '#e5e7eb'}`
                                  }}>
                                  {online ? '● Online' : u.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              {/* Último acesso */}
                              <td className="px-4 py-3 text-xs" style={{ color: '#B3B3B3' }}>
                                {formatarAcesso(u.ultimo_acesso)}
                              </td>
                              {/* Ações */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  {isMaster ? (
                                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                                      style={{ backgroundColor: '#f3f4f6', color: '#111827' }}>Protegido</span>
                                  ) : (
                                    <>
                                      <button onClick={() => abrirEdicao(u)}
                                        className="p-1.5 rounded-lg transition-colors hover:bg-blue-50"
                                        style={{ color: '#233772' }} title="Editar">
                                        <Edit2 size={14} />
                                      </button>
                                      <button onClick={() => toggleAtivo(u)}
                                        className="p-1.5 rounded-lg transition-colors"
                                        style={{ color: u.ativo ? '#16a34a' : '#B3B3B3' }}
                                        title={u.ativo ? 'Desativar' : 'Ativar'}>
                                        {u.ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                      </button>
                                      {!ehVoceMesmo && (
                                        <button onClick={() => setConfirmarExclusao(u)}
                                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                                          style={{ color: '#dc2626' }} title="Excluir usuário">
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {abaAtiva === 'pendentes' && (
        <div className="space-y-4">
          {pendentes.length === 0 && solicitacoesAcesso.length === 0 && !carregandoSolicitacoes ? (
            <div className="bg-white rounded-xl flex flex-col items-center justify-center py-16 gap-3" style={{ border: '1px solid #e5e7eb' }}>
              <Check size={36} style={{ color: '#bbf7d0' }} />
              <p className="text-sm font-medium" style={{ color: '#B3B3B3' }}>Nenhum acesso aguardando aprovação.</p>
            </div>
          ) : (
            <>
              {/* ── Bloco 1: Aguardando Aprovação (novos via SSO) ─────────── */}
              {pendentesAprovacao.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #fed7aa' }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <p className="text-sm font-bold" style={{ color: '#92400e', fontFamily: 'Montserrat, sans-serif' }}>
                      Aguardando Aprovação
                    </p>
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: '#FFC82D', color: '#233772' }}>
                      {pendentesAprovacao.length}
                    </span>
                    <p className="text-xs ml-2" style={{ color: '#b45309' }}>
                      Usuários que se cadastraram via SSO e aguardam liberação de acesso.
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                        {['Usuário','E-mail','Registrado em','Perfil a Conceder','Ações'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#B3B3B3' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendentesAprovacao.map((u, i) => (
                        <tr key={u.id} style={{ borderBottom: i < pendentesAprovacao.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{ backgroundColor: '#fff7ed', color: '#ea580c', border: '1.5px solid #fed7aa' }}>{u.avatar}</div>
                              <p className="font-semibold text-sm" style={{ color: '#333' }}>{u.nome}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: '#B3B3B3' }}>{u.email}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: '#B3B3B3' }}>{formatarAcesso(u.created_at || u.ultimo_acesso)}</td>
                          <td className="px-4 py-3">
                            {aprovandoId === u.id ? (
                              <select
                                value={perfilAprovacao}
                                onChange={e => setPerfilAprovacao(e.target.value)}
                                className="px-2 py-1.5 rounded-lg text-xs outline-none"
                                style={{ border: '1.5px solid #233772', fontFamily: 'Montserrat, sans-serif' }}
                              >
                                {PERFIS.map(p => (
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
                                    onClick={() => aprovarUsuario(u, perfilAprovacao)}
                                    disabled={salvandoAprovacao === u.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
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
                                <>
                                  <button
                                    onClick={() => { setAprovandoId(u.id); setPerfilAprovacao('supervisor') }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                                    style={{ backgroundColor: '#233772' }}
                                  >
                                    <Check size={12} />Aprovar
                                  </button>
                                  <button
                                    onClick={() => recusarUsuario(u)}
                                    disabled={excluindo}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                                    style={{ backgroundColor: '#dc2626' }}
                                  >
                                    <X size={12} />Recusar
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Bloco 2: Suspensos (soft-deleted) ────────────────────── */}
              {suspensos.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #fecaca' }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-sm font-bold" style={{ color: '#991b1b', fontFamily: 'Montserrat, sans-serif' }}>
                      Suspensos
                    </p>
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                      {suspensos.length}
                    </span>
                    <p className="text-xs ml-2" style={{ color: '#b91c1c' }}>
                      Acesso removido por um administrador. Reative para restaurar ou exclua permanentemente.
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                        {['Usuário','E-mail','Perfil','Suspenso em','Ações'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#B3B3B3' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {suspensos.map((u, i) => {
                        const badge = perfilBadge[u.perfil] || perfilBadge.visualizador
                        return (
                          <tr key={u.id} style={{ borderBottom: i < suspensos.length - 1 ? '1px solid #f1f5f9' : 'none', opacity: 0.8 }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                  style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1.5px solid #fecaca' }}>
                                  {u.avatar}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm" style={{ color: '#333' }}>{u.nome}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                                    style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>Suspenso</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: '#B3B3B3' }}>{u.email}</td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                                style={{ backgroundColor: badge.bg, color: badge.text }}>{badge.label}</span>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: '#B3B3B3' }}>
                              {formatarAcesso(u.deletado_em)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => reativarUsuario(u)}
                                  disabled={salvandoAprovacao === u.id || excluindo}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                  style={{ backgroundColor: salvandoAprovacao === u.id ? '#B3B3B3' : '#16a34a' }}
                                >
                                  {salvandoAprovacao === u.id
                                    ? <><Loader2 size={12} className="animate-spin" />Reativando...</>
                                    : <><Check size={12} />Reativar</>}
                                </button>
                                <button
                                  onClick={() => excluirPermanente(u)}
                                  disabled={excluindo || salvandoAprovacao === u.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                  style={{ backgroundColor: excluindo ? '#B3B3B3' : '#dc2626' }}
                                >
                                  {excluindo
                                    ? <><Loader2 size={12} className="animate-spin" />Excluindo...</>
                                    : <><Trash2 size={12} />Excluir</>}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Bloco 3: Solicitações de Acesso a Páginas ─────────── */}
              {(solicitacoesAcesso.length > 0 || carregandoSolicitacoes) && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #c7d2fe' }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#eef2ff', borderBottom: '1px solid #c7d2fe' }}>
                    <KeyRound size={14} style={{ color: '#4338ca', flexShrink: 0 }} />
                    <p className="text-sm font-bold" style={{ color: '#3730a3', fontFamily: 'Montserrat, sans-serif' }}>
                      Solicitações de Acesso a Páginas
                    </p>
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: '#4338ca', color: '#fff' }}>
                      {solicitacoesAcesso.length}
                    </span>
                    <p className="text-xs ml-2" style={{ color: '#4338ca' }}>
                      Usuários que clicaram em "Solicitar Acesso" em páginas restritas.
                    </p>
                  </div>

                  {carregandoSolicitacoes ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-sm text-slate-400">
                      <Loader2 size={16} className="animate-spin" /> Carregando...
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                          {['Usuário', 'Página Solicitada', 'Permissão', 'Mensagem', 'Enviado em', 'Ações'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#B3B3B3' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {solicitacoesAcesso.map((s, i) => (
                          <tr key={s.id} style={{ borderBottom: i < solicitacoesAcesso.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            {/* Usuário */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                  style={{ backgroundColor: '#eef2ff', color: '#4338ca', border: '1.5px solid #c7d2fe' }}>
                                  {s.usuario?.avatar ?? s.usuario?.nome?.[0] ?? '?'}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm" style={{ color: '#333' }}>{s.usuario?.nome ?? '—'}</p>
                                  <p className="text-[10px]" style={{ color: '#B3B3B3' }}>{s.usuario?.email}</p>
                                </div>
                              </div>
                            </td>
                            {/* Página */}
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-lg"
                                style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                                {s.pagina}
                              </span>
                            </td>
                            {/* Permissão */}
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg"
                                style={{ backgroundColor: '#eef2ff', color: '#4338ca' }}>
                                {s.permissao}
                              </span>
                            </td>
                            {/* Mensagem */}
                            <td className="px-4 py-3 text-xs max-w-[160px]" style={{ color: '#64748b' }}>
                              {s.mensagem
                                ? <span className="italic">"{s.mensagem}"</span>
                                : <span style={{ color: '#B3B3B3' }}>—</span>}
                            </td>
                            {/* Data */}
                            <td className="px-4 py-3 text-xs" style={{ color: '#B3B3B3' }}>
                              {tempoRelativo(s.criada_em)}
                            </td>
                            {/* Ações */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => responderSolicitacao(s.id, 'aprovado')}
                                  disabled={respondendoSolicitacao === s.id}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                  style={{ backgroundColor: respondendoSolicitacao === s.id ? '#B3B3B3' : '#16a34a' }}
                                  title="Marcar como aprovado e notificar usuário. Ajuste as permissões na aba Usuários.">
                                  {respondendoSolicitacao === s.id
                                    ? <Loader2 size={11} className="animate-spin" />
                                    : <Check size={11} />}
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => responderSolicitacao(s.id, 'negado')}
                                  disabled={respondendoSolicitacao === s.id}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                  style={{ backgroundColor: respondendoSolicitacao === s.id ? '#B3B3B3' : '#dc2626' }}>
                                  <X size={11} />
                                  Negar
                                </button>
                                <button
                                  onClick={() => { setAbaAtiva('usuarios') }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                  style={{ border: '1px solid #c7d2fe', color: '#4338ca' }}
                                  title="Abrir aba de usuários para ajustar perfil/permissões">
                                  <ExternalLink size={11} />
                                  Ver usuário
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
                    <p className="text-[10px] text-slate-400">
                      ⓘ "Aprovar" notifica o usuário mas não altera permissões automaticamente. Ajuste o perfil ou as permissões individuais na aba <strong>Usuários</strong>.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {abaAtiva === 'permissoes' && (
        <div className="space-y-4">
          {/* Cabeçalho da aba com botão editar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: '#B3B3B3' }}>
                {modoEdicaoMatriz
                  ? 'Clique nas células para alterar permissões. A coluna Admin é sempre total e não pode ser editada.'
                  : 'Permissões por perfil. Clique em "Editar Permissões" para ajustar.'}
              </p>
            </div>
            <div className="flex gap-2">
              {modoEdicaoMatriz ? (
                <>
                  <button
                    onClick={() => { setModoEdicaoMatriz(false); setMatrizEditavel(null) }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{ border: '1px solid #e5e7eb', color: '#B3B3B3' }}
                    disabled={salvandoMatriz}
                  >
                    <X size={14} /> Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setSalvandoMatriz(true)
                      setMsgPermissoes(null)
                      const ok = await salvarPermissoes(matrizEditavel)
                      setSalvandoMatriz(false)
                      if (ok) {
                        setModoEdicaoMatriz(false); setMatrizEditavel(null)
                        setMsgPermissoes({ tipo: 'sucesso', texto: 'Permissões salvas com sucesso!' })
                        // Força recarregamento do JSON do banco
                        if (typeof window !== 'undefined') window.location.reload()
                      } else {
                        setMsgPermissoes({ tipo: 'erro', texto: 'Erro ao salvar permissões. Verifique suas permissões no Supabase.' })
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: '#233772' }}
                    disabled={salvandoMatriz}
                  >
                    {salvandoMatriz ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Salvar Permissões
                  </button>
                      {msgPermissoes && (
                        <div className={`my-4 rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${msgPermissoes.tipo === 'sucesso' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
                          style={{ border: '1px solid', color: msgPermissoes.tipo === 'sucesso' ? '#166534' : '#dc2626' }}>
                          {msgPermissoes.tipo === 'sucesso' ? <Check size={16} /> : <AlertTriangle size={16} />} {msgPermissoes.texto}
                          <button className="ml-auto" onClick={() => setMsgPermissoes(null)}><X size={14} /></button>
                        </div>
                      )}
                </>
              ) : (
                <button
                  onClick={() => {
                    // Inicia edição com cópia do estado atual
                    setMatrizEditavel(JSON.parse(JSON.stringify(permissoesConfig)))
                    setModoEdicaoMatriz(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ backgroundColor: '#FFC82D', color: '#233772' }}
                >
                  <Edit2 size={14} /> Editar Permissões
                </button>
              )}
            </div>
          </div>

          {/* Legenda rápida */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ backgroundColor: '#f0f4ff', border: '1px solid #c7d2fe' }}>
              <span className="text-lg">🌐</span>
              <div>
                <p className="text-xs font-bold" style={{ color: '#1d4ed8' }}>Acesso Global</p>
                <p className="text-[11px]" style={{ color: '#3730a3' }}>
                  <strong>Ver Todas as Obras</strong> — o usuário enxerga todas as obras sem precisar de vínculo.
                  Perfis: Admin, Diretor, Gerente, Planejamento.
                </p>
              </div>
            </div>
            <div className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <span className="text-lg">🔗</span>
              <div>
                <p className="text-xs font-bold" style={{ color: '#0369a1' }}>Acesso por Vínculo</p>
                <p className="text-[11px]" style={{ color: '#075985' }}>
                  <strong>Ver Obras Vinculadas</strong> — o usuário só acessa obras explicitamente vinculadas
                  na aba <em>Acessos por Obra</em>. Perfis: Planej. Obra, Supervisor, Visualizador.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-x-auto" style={{ border: '1px solid #e5e7eb' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#B3B3B3', minWidth: 200 }}>Ação / Funcionalidade</th>
                  {cols.map(c => {
                    const badge = perfilBadge[c]
                    return (
                      <th key={c} className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ minWidth: 110 }}>
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-2 py-1 rounded-full" style={{ backgroundColor: badge.bg, color: badge.text }}>{badge.label}</span>
                          {modoEdicaoMatriz && c === 'admin' && <Lock size={10} style={{ color: '#B3B3B3' }} />}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = []
                  let lastGrupo = null
                  // Usa matrizEditavel (durante edição) ou reconstrói da config do banco
                  const getValor = (key, perfil) => {
                    if (perfil === 'admin') return true; // Sempre verde para admin
                    const config = modoEdicaoMatriz ? matrizEditavel : permissoesConfig
                    return (config[perfil] || []).includes(key)
                  }
                  const toggleValor = (key, perfil) => {
                    if (!modoEdicaoMatriz || perfil === 'admin') return
                    setMatrizEditavel(prev => {
                      const nova = JSON.parse(JSON.stringify(prev))
                      const lista = nova[perfil] || []
                      if (lista.includes(key)) {
                        nova[perfil] = lista.filter(k => k !== key)
                      } else {
                        nova[perfil] = [...lista, key]
                      }
                      return nova
                    })
                  }
                  matrizPermissoes.forEach((row, i) => {
                    if (row.grupo !== lastGrupo) {
                      lastGrupo = row.grupo
                      // Cor do grupo por seção
                      const grupoColor = {
                        'Página Obras': '#1d4ed8',
                        'Contratos & Medições': '#0369a1',
                        'Campo': '#b45309',
                        'Suprimentos': '#7e22ce',
                        'Planejamento': '#166534',
                        'Financeiro': '#b91c1c',
                        'Resultado Operacional': '#9f1239',
                        'Administração': '#374151',
                      }[row.grupo] || '#233772'
                      rows.push(
                        <tr key={`grupo-${row.grupo}`} style={{ backgroundColor: '#f1f5f9' }}>
                          <td colSpan={cols.length + 1} className="px-4 py-2.5" style={{ borderTop: i > 0 ? '2px solid #e5e7eb' : 'none' }}>
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                              style={{ color: grupoColor, backgroundColor: grupoColor + '18' }}>
                              {row.grupo}
                            </span>
                          </td>
                        </tr>
                      )
                    }
                    // Linhas de acesso por obra ficam com fundo sutil diferenciado
                    const rowBg = row.key === 'ver_obras_proprias' ? '#f0f9ff'
                                : row.key === 'ver_todas_obras'    ? '#f0f4ff'
                                : undefined
                    rows.push(
                      <tr key={row.key} className="hover:bg-slate-50 transition-colors"
                        style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: rowBg }}>
                        <td className="px-4 py-2.5 pl-6">
                          <p className="text-sm font-medium" style={{ color: '#333' }}>{row.acao}</p>
                          {row.rota && row.rota !== '—' && (
                            <p className="text-[10px] font-mono mt-0.5" style={{ color: '#94a3b8' }}>{row.rota}</p>
                          )}
                        </td>
                        {cols.map(c => {
                          const ativo = getValor(row.key, c)
                          const isFixo = row.key === 'ver_todas_obras' && row.fixos && row.fixos.includes(c)
                          const editavel = modoEdicaoMatriz && c !== 'admin' && !isFixo
                          return (
                            <td key={c} className="px-3 py-2.5 text-center">
                              {editavel ? (
                                <button
                                  onClick={() => toggleValor(row.key, c)}
                                  className="mx-auto flex items-center justify-center w-6 h-6 rounded transition-colors"
                                  style={{
                                    backgroundColor: ativo ? '#dcfce7' : '#f8fafc',
                                    border: `1.5px solid ${ativo ? '#86efac' : '#e5e7eb'}`,
                                  }}
                                  title={ativo ? 'Clique para remover' : 'Clique para conceder'}
                                >
                                  {ativo
                                    ? <Check size={12} style={{ color: '#16a34a' }} />
                                    : <X size={12} style={{ color: '#d1d5db' }} />
                                  }
                                </button>
                              ) : (
                                ativo
                                  ? <Check size={15} className="mx-auto" style={{ color: '#16a34a' }} />
                                  : <X size={15} className="mx-auto" style={{ color: '#e5e7eb' }} />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                  return rows
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Aba Acessos por Obra ─────────────────────────────── */}
      {abaAtiva === 'acessos' && (
        <div className="space-y-4">
          {/* Botão adicionar + formulário */}
          <div className="flex justify-end">
            <button onClick={() => setFormAcessoAberto(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#FFC82D', color: '#233772' }}>
              <Plus size={15} /> Vincular Usuário à Obra
            </button>
          </div>

          {formAcessoAberto && (
            <div className="bg-white rounded-xl p-4 space-y-3" style={{ border: '1px solid #e5e7eb' }}>
              <p className="text-sm font-bold" style={{ color: '#233772' }}>Novo Vínculo</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: '#B3B3B3' }}>Usuário</label>
                  <select value={novoAcesso.usuario_id}
                    onChange={e => setNovoAcesso(p => ({ ...p, usuario_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: '#e5e7eb', color: '#333' }}>
                    <option value="">Selecione...</option>
                    {lista.filter(u => !['admin','diretor','gerente','master','planejamento'].includes(u.perfil)).map(u => (
                      <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: '#B3B3B3' }}>Obra</label>
                  <SearchableSelect
                    value={novoAcesso.obra_ids}
                    onChange={vs => setNovoAcesso(p => ({ ...p, obra_ids: vs }))}
                    options={obrasParaOptions(obras)}
                    placeholder="Selecione obras..."
                    multi
                    clearable
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setFormAcessoAberto(false)}
                  className="px-3 py-1.5 rounded-lg text-sm" style={{ color: '#B3B3B3' }}>Cancelar</button>
                <button onClick={adicionarAcesso} disabled={salvandoAcesso}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: '#233772', color: '#fff' }}>
                  {salvandoAcesso ? 'Salvando...' : novoAcesso.obra_ids.length > 1 ? `Vincular ${novoAcesso.obra_ids.length} Obras` : 'Vincular'}
                </button>
              </div>
            </div>
          )}

          {/* Lista por usuário */}
          {carregandoAcessos ? (
            <div className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto" style={{ color: '#B3B3B3' }} /></div>
          ) : lista.filter(u => !['admin','diretor','gerente','master','planejamento'].includes(u.perfil)).length === 0 ? (
            <div className="py-12 text-center text-slate-400">Nenhum usuário para vincular.</div>
          ) : (
            <div className="space-y-2">
              {lista.filter(u => !['admin','diretor','gerente','master','planejamento'].includes(u.perfil)).map(u => {
                const uAcessos = acessos.filter(a => a.usuario_id === u.id)
                const expanded = expandedUser === u.id
                return (
                  <div key={u.id} className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                    <div onClick={() => setExpandedUser(expanded ? null : u.id)}
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: '#233772', color: '#fff' }}>{u.avatar || '?'}</div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#233772' }}>{u.nome}</p>
                          <p className="text-[11px] capitalize" style={{ color: '#B3B3B3' }}>{u.perfil} · {u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: uAcessos.length > 0 ? '#f0fdf4' : '#f8fafc', color: uAcessos.length > 0 ? '#16a34a' : '#B3B3B3' }}>
                          {uAcessos.length} obra{uAcessos.length !== 1 ? 's' : ''}
                        </span>
                        {uAcessos.length > 0 && (expanded
                          ? <ChevronDown size={15} style={{ color: '#B3B3B3' }} />
                          : <ChevronRight size={15} style={{ color: '#B3B3B3' }} />)}
                      </div>
                    </div>
                    {expanded && uAcessos.length > 0 && (
                      <div style={{ borderTop: '1px solid #f1f5f9' }}>
                        {uAcessos.map(ac => {
                          const obra = obras.find(o => o.id === ac.obra_id)
                          return (
                            <div key={ac.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50"
                              style={{ borderBottom: '1px solid #f8fafc' }}>
                              <div className="flex items-center gap-2">
                                <Building2 size={13} style={{ color: '#233772' }} />
                                <span className="text-sm" style={{ color: '#333' }}>
                                  {obra ? `${obra.codigo} — ${obra.nome}` : ac.obra_id.slice(0,8)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => removerAcesso(ac.id)}
                                  className="p-1 rounded hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <p className="text-[11px] text-center" style={{ color: '#B3B3B3' }}>
            Admin / Diretor / Gerente / Planejamento têm acesso global a todas as obras e não precisam de vínculo.
          </p>
        </div>
      )}

      {/* ── Modal Criar / Editar ─────────────────────────────── */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold" style={{ color: '#233772' }}>
                {editando ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setModalAberto(false)} style={{ color: '#B3B3B3' }}><X size={18} /></button>
            </div>

            {/* Sucesso: senha criada */}
            {senhaCriada ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: '#f0fdf4' }}>
                  <Check size={24} style={{ color: '#16a34a' }} />
                </div>
                <p className="font-semibold mb-1" style={{ color: '#233772' }}>
                  <strong>{form.nome}</strong> criado com sucesso!
                </p>
                <p className="text-sm mb-4" style={{ color: '#B3B3B3' }}>
                  Um e-mail foi enviado para <strong>{form.email}</strong>.
                </p>
                <div className="rounded-lg p-3 mb-4 text-sm font-mono text-center"
                  style={{ backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', color: '#333' }}>
                  <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: '#B3B3B3' }}>Senha inicial</p>
                  <p className="text-lg font-bold tracking-widest">{senhaCriada}</p>
                </div>
                <p className="text-xs mb-4" style={{ color: '#B3B3B3' }}>
                  Anote a senha acima. O usuário pode alterá-la no primeiro acesso.
                </p>
                <button onClick={() => setModalAberto(false)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: '#233772' }}>Fechar</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>Nome completo</label>
                  <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                    placeholder="João da Silva"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ border: '1.5px solid #e5e7eb', fontFamily: 'Montserrat, sans-serif' }}
                    onFocus={e => e.target.style.borderColor = '#233772'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="joao@biasiengenharia.com.br"
                    disabled={!!editando}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ border: '1.5px solid #e5e7eb', fontFamily: 'Montserrat, sans-serif',
                      backgroundColor: editando ? '#f8fafc' : '#fff', color: editando ? '#B3B3B3' : '#333' }}
                    onFocus={e => { if (!editando) e.target.style.borderColor = '#233772' }}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                {!editando && (
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>Senha inicial</label>
                    <input type="text" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono"
                      style={{ border: '1.5px solid #e5e7eb', fontFamily: 'monospace' }}
                      onFocus={e => e.target.style.borderColor = '#233772'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <p className="text-[10px] mt-1" style={{ color: '#B3B3B3' }}>Senha gerada automaticamente. O usuário receberá por e-mail.</p>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>Perfil de Acesso</label>
                  <select value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ border: '1.5px solid #e5e7eb', fontFamily: 'Montserrat, sans-serif' }}
                    disabled={editando && editando.email === ADMIN_MASTER_EMAIL}>
                    {PERFIS.map(p => <option key={p} value={p}>{perfilBadge[p]?.label || p}</option>)}
                  </select>
                  {editando && editando.email === ADMIN_MASTER_EMAIL && (
                    <p className="text-[10px] mt-1" style={{ color: '#B3B3B3' }}>O perfil do Admin Master não pode ser alterado.</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>Foto do usuário</label>
                  <input type="file" accept="image/*" onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setForm(f => ({ ...f, foto: e.target.files[0] }));
                    }
                  }} />
                  {uploadingFoto && <p className="text-xs text-yellow-600 mt-1">Enviando foto...</p>}
                  {form.foto && !(form.foto instanceof File) && (
                    <img src={form.foto} alt="Foto do usuário" className="w-16 h-16 rounded-full mt-2 object-cover border" />
                  )}
                  {form.foto && form.foto instanceof File && (
                    <img src={URL.createObjectURL(form.foto)} alt="Preview" className="w-16 h-16 rounded-full mt-2 object-cover border" />
                  )}
                </div>

                {/* ── Permissões Personalizadas (apenas na edição) ──────── */}
                {editando && (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                    {/* Cabeçalho colapsável */}
                    <button
                      onClick={() => setMostrarOverrides(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors"
                      style={{ backgroundColor: mostrarOverrides ? '#f8fafc' : '#fff' }}
                    >
                      <div className="flex items-center gap-2">
                        <Sliders size={13} style={{ color: '#7c3aed' }} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7c3aed' }}>
                          Permissões Personalizadas
                        </span>
                        {overridesUsuario.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}>
                            {overridesUsuario.length} override{overridesUsuario.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {mostrarOverrides
                        ? <ChevronDown size={13} style={{ color: '#B3B3B3' }} />
                        : <ChevronRight size={13} style={{ color: '#B3B3B3' }} />}
                    </button>

                    {mostrarOverrides && (
                      <div className="p-3 space-y-1" style={{ borderTop: '1px solid #f1f5f9' }}>
                        <p className="text-[10px] mb-2" style={{ color: '#94a3b8' }}>
                          Sobreposições individuais sobre o perfil <strong>{form.perfil}</strong>.
                          Verde = herdado do perfil · Roxo = adicionado · Vermelho = removido.
                        </p>
                        {carregandoOverrides ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 size={16} className="animate-spin" style={{ color: '#7c3aed' }} />
                          </div>
                        ) : (
                          matrizPermissoes.map(p => {
                            const basePerfil = !!p[form.perfil]
                            const override = overridesUsuario.find(o => o.permissao === p.key)
                            const efetivo = override ? override.concedida : basePerfil
                            const temOverride = !!override
                            const carregando = salvandoOverride === p.key

                            return (
                              <div key={p.key}
                                className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                                style={{
                                  backgroundColor: temOverride
                                    ? override.concedida ? '#f5f3ff' : '#fef2f2'
                                    : efetivo ? '#f0fdf4' : '#f8fafc'
                                }}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-medium truncate" style={{
                                    color: temOverride
                                      ? override.concedida ? '#7c3aed' : '#dc2626'
                                      : efetivo ? '#16a34a' : '#94a3b8'
                                  }}>
                                    {p.acao}
                                  </p>
                                  <p className="text-[9px]" style={{ color: '#cbd5e1' }}>{p.key}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {carregando ? (
                                    <Loader2 size={12} className="animate-spin" style={{ color: '#7c3aed' }} />
                                  ) : (
                                    <>
                                      {/* Botão: forçar ON */}
                                      {(!efetivo || (temOverride && !override.concedida)) && (
                                        <button
                                          onClick={() => salvarOverride(editando.id, p.key, true)}
                                          className="text-[10px] px-2 py-0.5 rounded font-semibold"
                                          style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}
                                          title="Adicionar esta permissão">
                                          + Dar
                                        </button>
                                      )}
                                      {/* Botão: forçar OFF */}
                                      {(efetivo && !(temOverride && !override.concedida)) && (
                                        <button
                                          onClick={() => salvarOverride(editando.id, p.key, false)}
                                          className="text-[10px] px-2 py-0.5 rounded font-semibold"
                                          style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                                          title="Remover esta permissão">
                                          − Tirar
                                        </button>
                                      )}
                                      {/* Botão: restaurar padrão */}
                                      {temOverride && (
                                        <button
                                          onClick={() => removerOverride(editando.id, p.key)}
                                          className="text-[10px] px-2 py-0.5 rounded font-semibold"
                                          style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                                          title="Restaurar padrão do perfil">
                                          ↺
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}

                {erroModal && (
                  <div className="rounded-lg px-3 py-2 text-xs"
                    style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                    {erroModal}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setModalAberto(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ border: '1.5px solid #e5e7eb', color: '#B3B3B3' }}>Cancelar</button>
                  <button onClick={salvar} disabled={salvando}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: salvando ? '#B3B3B3' : '#233772' }}>
                    {salvando ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : 'Salvar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    {/* Fim do modal de criação/edição */}

      {/* ── Modal Designar Gestor ────────────────────────────── */}
      {modalGestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#eff2fc' }}>
                <UserCog size={20} style={{ color: '#233772' }} />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
                  Designar Gestor
                </h2>
                <p className="text-xs" style={{ color: '#B3B3B3' }}>Setor: {modalGestor.setorLabel}</p>
              </div>
              <button onClick={() => setModalGestor(null)} className="ml-auto p-1 rounded-lg hover:bg-slate-100">
                <X size={16} style={{ color: '#B3B3B3' }} />
              </button>
            </div>

            <p className="text-xs mb-3" style={{ color: '#64748b' }}>
              Escolha quem vai gerenciar os usuários deste setor. O gestor poderá aprovar acessos e
              ativar/desativar membros. Ele <strong>não</strong> precisa ser do mesmo perfil que o setor gerenciado.
            </p>

            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: '#B3B3B3' }}>Usuário a designar</label>
            <select
              value={candidatoGestor}
              onChange={e => setCandidatoGestor(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-5"
              style={{ border: '1.5px solid #233772', fontFamily: 'Montserrat, sans-serif' }}
            >
              <option value="">— Selecione —</option>
              {modalGestor.candidatos.map(u => {
                const badge = perfilBadge[u.perfil] || perfilBadge.visualizador
                return (
                  <option key={u.id} value={u.id}>
                    {u.nome} · {badge.label}
                  </option>
                )
              })}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setModalGestor(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid #e5e7eb', color: '#B3B3B3' }}
              >Cancelar</button>
              <button
                onClick={designarGestor}
                disabled={!candidatoGestor || salvandoGestor}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity"
                style={{ backgroundColor: !candidatoGestor ? '#B3B3B3' : '#233772' }}
              >
                {salvandoGestor
                  ? <><Loader2 size={14} className="animate-spin" />Salvando...</>
                  : <><Check size={14} />Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmação Exclusão ───────────────────────── */}
      {confirmarExclusao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: '#fef2f2' }}>
              <AlertTriangle size={24} style={{ color: '#dc2626' }} />
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: '#233772' }}>Excluir usuário?</h3>
            <p className="text-sm mb-1" style={{ color: '#333' }}><strong>{confirmarExclusao.nome}</strong></p>
            <p className="text-xs mb-6" style={{ color: '#B3B3B3' }}>
              Esta ação remove o acesso permanentemente e não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarExclusao(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ border: '1.5px solid #e5e7eb', color: '#B3B3B3' }}>Cancelar</button>
              <button onClick={excluir} disabled={excluindo}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: excluindo ? '#B3B3B3' : '#dc2626' }}>
                {excluindo ? <><Loader2 size={14} className="animate-spin" />Excluindo...</> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
  