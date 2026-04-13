import React, { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, CheckCircle2, XCircle, Clock, Database,
  Calendar, Building2, Play, FileText, ShoppingCart, Package,
  ClipboardList, Handshake, Calculator, Warehouse, ChevronDown, ChevronUp,
  Zap, BarChart2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const COR_AZUL  = '#233772'
const COR_AMAR  = '#FFC82D'
const COR_CINZA = '#B3B3B3'
const BUDGET_MAX = 90  // budget total configurado na edge function

const MODULO_CFG = {
  obras:               { label: 'Obras',                icone: Building2,     cor: '#233772' },
  contratos:           { label: 'Contratos',            icone: Handshake,     cor: '#233772' },
  medicoes_contrato:   { label: 'Medições',             icone: ClipboardList, cor: '#22c55e' },
  pedidos_compra:      { label: 'Pedidos de Compra',    icone: ShoppingCart,  cor: '#f97316' },
  notas_fiscais:       { label: 'Notas Fiscais',        icone: FileText,      cor: '#8b5cf6' },
  solicitacoes_compra: { label: 'Solicitações',         icone: Package,       cor: '#06b6d4' },
  cotacoes:            { label: 'Cotações',             icone: Calculator,    cor: '#ec4899' },
  orcamentos:          { label: 'Orçamentos (por obra)',icone: FileText,      cor: '#14b8a6' },
  estoque:             { label: 'Estoque (por obra)',   icone: Warehouse,     cor: '#eab308' },
}

// Módulos por-obra têm lógica de progresso diferente (fila de obras, não offset)
const MODULOS_PER_OBRA = new Set(['orcamentos', 'estoque'])

// ─── Badge de status ────────────────────────────────────────
function BadgeStatus({ status }) {
  const cfg = {
    processando: { cor: '#2563eb', bg: '#eff6ff', label: 'Processando', icone: RefreshCw },
    concluido:   { cor: '#16a34a', bg: '#f0fdf4', label: 'Concluído',   icone: CheckCircle2 },
    erro:        { cor: '#dc2626', bg: '#fef2f2', label: 'Erro',        icone: XCircle },
  }[status] ?? { cor: COR_CINZA, bg: '#f9fafb', label: status ?? '—', icone: Clock }
  const Icone = cfg.icone
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.cor, backgroundColor: cfg.bg }}>
      <Icone size={11} className={status === 'processando' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  )
}

// ─── Barra de progresso do módulo ────────────────────────────
function ModuloProgress({ modulo, ctrl }) {
  const cfg = MODULO_CFG[modulo] || { label: modulo, icone: Database, cor: COR_AZUL }
  const Icone = cfg.icone
  const isPerObra = MODULOS_PER_OBRA.has(modulo)

  // ── Cálculo de % correto por tipo de módulo ──────────────
  let perc = 0
  let subInfo = ''

  if (isPerObra) {
    // Per-obra: progresso = obras processadas / total obras
    // fila = obras que ainda faltam. Quando vazia, ciclo completo.
    const totalObras    = ctrl.total_remoto || 0           // nº de obras (ex: 401)
    const filaRestante  = ctrl.meta?.fila?.length ?? 0
    const processadas   = Math.max(0, totalObras - filaRestante)

    if (ctrl.carga_completa) {
      perc    = 100
      subInfo = `${totalObras} obras · ciclo completo`
    } else if (totalObras > 0) {
      perc    = Math.min((processadas / totalObras) * 100, 99)
      subInfo = `${processadas}/${totalObras} obras · ${filaRestante} restantes`
    } else {
      perc    = 0
      subInfo = 'Aguardando início'
    }
  } else {
    // Paginado: progresso = registros locais / registros no Sienge
    const localCount  = ctrl.total_local  ?? 0
    const remotoCount = ctrl.total_remoto ?? 0

    if (ctrl.carga_completa) {
      perc    = 100
      subInfo = `${localCount.toLocaleString('pt-BR')} registros`
    } else if (remotoCount > 0) {
      perc    = Math.min((localCount / remotoCount) * 100, 99)
      subInfo = `${localCount.toLocaleString('pt-BR')} / ${remotoCount.toLocaleString('pt-BR')} registros`
    } else if (localCount > 0) {
      // Sienge não retornou totalCount ainda, mas já tem dados
      perc    = 50  // indeterminado
      subInfo = `${localCount.toLocaleString('pt-BR')} registros (total remoto indisponível)`
    } else {
      perc    = 0
      subInfo = ctrl.ultimo_offset > 0
        ? `Offset: ${ctrl.ultimo_offset.toLocaleString('pt-BR')}`
        : 'Aguardando início'
    }
  }

  return (
    <div className="py-3 px-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${cfg.cor}15` }}>
        <Icone size={16} style={{ color: cfg.cor }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
          <div className="flex items-center gap-2">
            {ctrl.carga_completa ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                ✓ Completo
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                ⟳ Carregando
              </span>
            )}
            <span className="text-xs font-mono tabular-nums font-semibold" style={{ color: cfg.cor }}>
              {Math.round(perc)}%
            </span>
          </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${perc}%`, backgroundColor: cfg.cor }}
          />
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-400">
            {ctrl.ultima_sync
              ? `Sync: ${new Date(ctrl.ultima_sync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
              : 'Nunca sincronizado'}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            {subInfo}
            {!ctrl.carga_completa && ctrl.budget_por_exec
              ? ` · ${ctrl.budget_por_exec} req/exec`
              : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Mini-tabela de módulos (expandível no histórico) ────────
function ResumoModulos({ resumo }) {
  if (!resumo || Object.keys(resumo).length === 0) return null
  const entries = Object.entries(resumo).filter(([, v]) => v && typeof v === 'object')
  if (entries.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map(([mod, v]) => {
        const cfg = MODULO_CFG[mod]
        const label = cfg?.label ?? mod
        const modeColor = v.modo === 'erro' ? '#dc2626'
          : v.modo?.includes('manut') || v.modo === 'manutenção' ? '#2563eb'
          : '#16a34a'
        return (
          <span key={mod}
            className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border"
            style={{ borderColor: `${modeColor}33`, backgroundColor: `${modeColor}0d`, color: modeColor }}>
            <span className="font-semibold">{label}:</span>
            {v.importados ?? 0} imp · {v.modo}
          </span>
        )
      })}
    </div>
  )
}

export default function SiengeSync() {
  const { usuario } = useAuth()
  const [controles, setControles]         = useState([])
  const [historico, setHistorico]         = useState([])
  const [carregando, setCarregando]       = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [resultado, setResultado]         = useState(null)
  const [detalheAberto, setDetalheAberto] = useState(null)
  const [mostrarHistorico, setMostrarHistorico] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [{ data: ctrl }, { data: hist }] = await Promise.all([
      supabase.from('sienge_sync_control').select('*').order('modulo'),
      supabase.from('importacoes_sienge').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    setControles(ctrl ?? [])
    setHistorico(hist ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const sincronizarAgora = async () => {
    setSincronizando(true)
    setResultado(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sienge-sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      )
      const json = await res.json()
      setResultado({ ok: res.ok && json.ok, ...json })
      await carregar()
    } catch (e) {
      setResultado({ ok: false, error: e.message })
    }
    setSincronizando(false)
  }

  const ultimoSucesso    = historico.find(h => h.status === 'concluido')
  const totalModulos     = controles.length
  const modulosCompletos = controles.filter(c => c.carga_completa).length

  // ── Próximo sync: cron roda às 04h UTC (01h BRT) ──────────
  const proximoSync = (() => {
    const agora = new Date()
    const proximo = new Date(agora)
    proximo.setUTCHours(4, 0, 0, 0)                           // 04h UTC = 01h BRT
    if (proximo <= agora) proximo.setUTCDate(proximo.getUTCDate() + 1)
    const diff = proximo - agora
    const hh = Math.floor(diff / 3_600_000)
    const mm = Math.floor((diff % 3_600_000) / 60_000)
    return `${hh}h ${mm}m`
  })()

  const canSync = ['admin', 'master', 'diretor'].includes(usuario?.perfil)

  // Budget do último sync bem-sucedido
  const budgetUltimo = ultimoSucesso?.requests_usados ?? null

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ─────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: COR_AZUL }}>
              <Database size={16} color="#fff" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: COR_AZUL }}>Integração Sienge</h1>
          </div>
          <p className="text-sm text-gray-500">
            Sync incremental · 9 módulos ·{' '}
            <span className="font-semibold">{modulosCompletos}/{totalModulos}</span> com carga completa
          </p>
        </div>

        {canSync && (
          <button onClick={sincronizarAgora} disabled={sincronizando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-white transition-all"
            style={{ backgroundColor: sincronizando ? COR_CINZA : COR_AZUL }}>
            {sincronizando
              ? <><RefreshCw size={15} className="animate-spin" />Sincronizando...</>
              : <><Play size={15} />Sincronizar Agora</>}
          </button>
        )}
      </div>

      {/* ── Resultado do sync manual ─────────────────────── */}
      {resultado && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{
            backgroundColor: resultado.ok ? '#f0fdf4' : '#fef2f2',
            border: `1.5px solid ${resultado.ok ? '#bbf7d0' : '#fecaca'}`,
          }}>
          {resultado.ok
            ? <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
            : <XCircle      size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />}
          <div className="text-sm flex-1">
            {resultado.ok ? (
              <div>
                <p style={{ color: '#166534' }}>
                  <strong>{resultado.totalImportados?.toLocaleString('pt-BR')}</strong> registros importados
                  {' · '}
                  <strong>{resultado.requestsUsados}</strong>/{BUDGET_MAX} requests usados
                  {resultado.budgetRestante != null && (
                    <span className="text-green-600"> · {resultado.budgetRestante} de sobra</span>
                  )}
                  {resultado.erros > 0 && <span className="text-amber-600"> · {resultado.erros} avisos</span>}
                </p>
                {/* Barra de budget */}
                {resultado.requestsUsados != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-green-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-green-500"
                        style={{ width: `${Math.min((resultado.requestsUsados / BUDGET_MAX) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-green-600 font-mono">
                      {Math.round((resultado.requestsUsados / BUDGET_MAX) * 100)}% do budget
                    </span>
                  </div>
                )}
                {/* Detalhes por módulo */}
                {resultado.resumo && <ResumoModulos resumo={resultado.resumo} />}
              </div>
            ) : (
              <p style={{ color: '#991b1b' }}>
                <strong>Erro:</strong> {resultado.error ?? resultado.detalhes_erros?.[0]?.erro}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Cards resumo ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricaCard icone={CheckCircle2} label="Módulos completos"
          valor={`${modulosCompletos}/${totalModulos}`}
          cor={modulosCompletos === totalModulos ? '#16a34a' : COR_AMAR}
          subtitulo={totalModulos > 0 ? `${Math.round((modulosCompletos / totalModulos) * 100)}% completo` : ''} />

        <MetricaCard icone={Building2} label="Última sincronização"
          valor={ultimoSucesso
            ? (() => {
                const d = new Date(ultimoSucesso.created_at)
                const agora = new Date()
                const minutos = Math.floor((agora - d) / 60000)
                if (minutos < 1)    return 'agora'
                if (minutos < 60)   return `há ${minutos}m`
                if (minutos < 1440) return `há ${Math.floor(minutos / 60)}h`
                return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              })()
            : 'Nunca'}
          subtitulo={ultimoSucesso
            ? `${ultimoSucesso.registros_importados?.toLocaleString('pt-BR') ?? 0} registros`
            : ''} />

        <MetricaCard icone={Calendar} label="Próximo sync (auto)"
          valor={proximoSync}
          subtitulo="Cron: 04h UTC · 01h BRT" />

        <MetricaCard icone={Zap} label="Budget último sync"
          valor={budgetUltimo != null ? `${budgetUltimo}/${BUDGET_MAX}` : '—'}
          cor={budgetUltimo != null && budgetUltimo > 70 ? '#dc2626' : budgetUltimo != null ? '#16a34a' : COR_CINZA}
          subtitulo={budgetUltimo != null
            ? `${Math.round((budgetUltimo / BUDGET_MAX) * 100)}% do budget usado`
            : 'Execute um sync para ver'} />
      </div>

      {/* ── Progresso por Módulo ─────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: COR_AZUL }}>
          <h2 className="font-bold text-sm uppercase tracking-wider text-white">
            Progresso por Módulo
          </h2>
          <button onClick={carregar}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin" style={{ color: COR_CINZA }} />
          </div>
        ) : controles.length === 0 ? (
          <div className="text-center py-12">
            <Database size={32} style={{ color: COR_CINZA, margin: '0 auto 12px' }} />
            <p className="text-sm font-semibold" style={{ color: COR_AZUL }}>Tabela sienge_sync_control vazia</p>
            <p className="text-xs mt-1 text-gray-400">
              Execute o SQL <code className="bg-gray-100 px-1 rounded">migrate_sync_incremental.sql</code> no Supabase
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {controles.map(ctrl => (
              <ModuloProgress key={ctrl.modulo} modulo={ctrl.modulo} ctrl={ctrl} />
            ))}
          </div>
        )}

        {/* Legenda */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-4 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Completo — busca só novidades
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Em carga — avança N req/dia até completar
          </span>
          <span>Budget total: {BUDGET_MAX} req/execução · Cron: 01h00 BRT</span>
        </div>
      </div>

      {/* ── Configuração ──────────────────────────────────── */}
      <div className="rounded-xl p-5 bg-white border border-gray-100 shadow-sm">
        <h2 className="font-bold text-sm mb-4 uppercase tracking-wider" style={{ color: COR_AZUL }}>
          Configuração
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Base URL',    valor: 'api.sienge.com.br/biasi/public/api/v1' },
            { label: 'Usuário API', valor: 'biasi-bi' },
            { label: 'Frequência',  valor: 'Diário · 01h00 BRT (cron Supabase)' },
            { label: 'Budget/exec', valor: `${BUDGET_MAX} requests (10 de reserva)` },
            { label: 'Modo',        valor: 'Incremental — retoma de onde parou' },
            { label: 'Módulos',     valor: '7 paginados + 2 per-obra (orç/estoque)' },
          ].map(({ label, valor }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">{label}</span>
              <span className="font-medium text-gray-700">{valor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Histórico (colapsável) ───────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <button onClick={() => setMostrarHistorico(!mostrarHistorico)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between flex-1">
            <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: COR_AZUL }}>
              Histórico de Sincronizações
            </h2>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500 text-right">
                <div className="font-semibold text-gray-600">
                  {historico.filter(h => h.status === 'concluido').length} sucesso
                  {' · '}
                  {historico.filter(h => h.status === 'erro').length} erros
                </div>
                <div className="text-gray-400">{historico.length} execuções registradas</div>
              </div>
              {mostrarHistorico
                ? <ChevronUp size={16} className="text-gray-400" />
                : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </div>
        </button>

        {mostrarHistorico && (
          historico.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">Nenhuma sincronização registrada.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8f9fc' }}>
                  {['Data/Hora', 'Tipo', 'Status', 'Registros', 'Requests / Budget', 'Erros', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map((h, idx) => (
                  <React.Fragment key={h.id}>
                    <tr style={{ borderTop: '1px solid #f0f0f0', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      {/* Data */}
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {new Date(h.created_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: '#eef1f8', color: COR_AZUL }}>
                          {h.tipo}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3"><BadgeStatus status={h.status} /></td>
                      {/* Registros */}
                      <td className="px-4 py-3 font-semibold text-right" style={{ color: '#16a34a' }}>
                        {h.registros_importados?.toLocaleString('pt-BR') ?? '—'}
                      </td>
                      {/* Requests + barra de budget */}
                      <td className="px-4 py-3">
                        {h.requests_usados != null ? (
                          <div className="flex flex-col gap-1 min-w-[80px]">
                            <span className="text-xs font-mono font-semibold text-gray-700 text-right">
                              {h.requests_usados}/{BUDGET_MAX}
                            </span>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min((h.requests_usados / BUDGET_MAX) * 100, 100)}%`,
                                  backgroundColor: h.requests_usados > 70 ? '#dc2626' : '#16a34a',
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 text-right block">—</span>
                        )}
                      </td>
                      {/* Erros */}
                      <td className="px-4 py-3 text-right"
                        style={{ color: (h.erros?.length ?? 0) > 0 ? '#dc2626' : '#16a34a' }}>
                        {h.erros?.length ?? 0}
                      </td>
                      {/* Expand */}
                      <td className="px-4 py-3">
                        {(h.erros?.length > 0 || (h.resumo && Object.keys(h.resumo).length > 0)) && (
                          <button onClick={() => setDetalheAberto(detalheAberto === h.id ? null : h.id)}
                            className="text-xs underline font-semibold text-gray-500">
                            {detalheAberto === h.id ? 'Ocultar' : 'Detalhar'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* ── Linha expandida: resumo por módulo + erros ── */}
                    {detalheAberto === h.id && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3" style={{ backgroundColor: '#f8f9fc' }}>
                          {/* Resumo por módulo */}
                          {h.resumo && Object.keys(h.resumo).length > 0 && (
                            <div className="mb-2">
                              <p className="text-[10px] font-semibold mb-1.5 text-gray-400 uppercase tracking-wide">
                                Detalhamento por módulo
                              </p>
                              <ResumoModulos resumo={h.resumo} />
                            </div>
                          )}
                          {/* Erros */}
                          {h.erros?.length > 0 && (
                            <div style={{ backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>
                              <p className="text-xs font-semibold mb-1 text-red-600">
                                Erros ({h.erros.length}):
                              </p>
                              <div className="space-y-0.5">
                                {h.erros.slice(0, 10).map((e, i) => (
                                  <div key={i} className="text-xs font-mono text-red-800">
                                    [{e.registro ?? i}] {e.erro}
                                  </div>
                                ))}
                                {h.erros.length > 10 && (
                                  <div className="text-xs text-red-400">...e mais {h.erros.length - 10} erros</div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

    </div>
  )
}

function MetricaCard({ icone: Icone, label, valor, cor = COR_AZUL, subtitulo }) {
  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${cor}18` }}>
        <Icone size={20} style={{ color: cor }} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold truncate" style={{ color: COR_AZUL }}>{valor}</p>
        <p className="text-xs text-gray-400">{label}</p>
        {subtitulo && <p className="text-[10px] text-gray-300 mt-0.5">{subtitulo}</p>}
      </div>
    </div>
  )
}
