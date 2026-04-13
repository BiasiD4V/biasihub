import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

// ─── Constantes ───────────────────────────────────────────────────────────────
const LEFT_W = 268   // largura da coluna fixa esquerda (px)
const ROW_H  = 32    // altura de cada linha (px)
const COL_W  = { semana: 44, mes: 80 }
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ─── Helpers de data ──────────────────────────────────────────────────────────
const pd  = s => s ? new Date(s + 'T12:00:00') : null
const ts  = d => d.toISOString().slice(0, 10)
const dif = (a, b) => { const da = pd(a), db = pd(b); return (!da || !db) ? 0 : Math.round((db - da) / 86_400_000) }
const add = (s, n)  => { const d = pd(s); d.setDate(d.getDate() + n); return ts(d) }
const fmt = s       => {
  if (!s) return '—'
  const d = pd(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

// ─── Geração de períodos ──────────────────────────────────────────────────────
function gerarSemanas(ini, fim) {
  const res = [], d = pd(ini)
  const dow = d.getDay(); d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  const end = pd(fim)
  while (d <= end) {
    const s = ts(d); d.setDate(d.getDate() + 6)
    res.push({ ini: s, fim: ts(d), mes: pd(s).getMonth(), ano: pd(s).getFullYear() })
    d.setDate(d.getDate() + 1)
  }
  return res
}

function gerarMeses(ini, fim) {
  const res = [], d = pd(ini); d.setDate(1)
  const end = pd(fim)
  while (d <= end) {
    const y = d.getFullYear(), m = d.getMonth()
    const last = new Date(y, m + 1, 0)
    res.push({ ini: `${y}-${String(m+1).padStart(2,'0')}-01`, fim: ts(last), mes: m, ano: y })
    d.setMonth(d.getMonth() + 1)
  }
  return res
}

// ─── Posicionamento de barra ──────────────────────────────────────────────────
function geom(ini, fim, tlIni, totalD, totalW) {
  if (!ini || !fim) return null
  const l = Math.max(0,      dif(tlIni, ini) / totalD * totalW)
  const r = Math.min(totalW, (dif(tlIni, fim) + 1) / totalD * totalW)
  return { left: l, width: Math.max(4, r - l) }
}

// ─── Cor da barra por criticidade (Aldo Dórea Mattos) ────────────────────────
function corBarra(item) {
  const st = item?.status_execucao
  if (st === 'concluida')               return '#16a34a'
  if (st === 'atrasada')                return '#dc2626'
  if (item?.is_critica)                 return '#ef4444'
  const ft = item?.folga_total
  if (ft != null && ft >= 0 && ft <= 5) return '#f97316'
  if (st === 'em_andamento')            return '#2563eb'
  return '#64748b'
}

// ─── Tooltip fixo (segue o mouse pela viewport) ───────────────────────────────
function Tooltip({ item, x, y }) {
  if (!item) return null
  const cor = corBarra(item)
  const STATUS = { concluida: 'Concluída', em_andamento: 'Em andamento', atrasada: 'Atrasada', pausada: 'Pausada', nao_iniciada: 'Não iniciada' }
  const rows = [
    ['Código',      item.codigo,           '#64748b'],
    ['Início Prev.',fmt(item.data_inicio_prevista), null],
    ['Fim Prev.',   fmt(item.data_fim_prevista),    null],
    item.data_inicio_baseline && ['Início Base', fmt(item.data_inicio_baseline), '#94a3b8'],
    item.data_fim_baseline    && ['Fim Base',    fmt(item.data_fim_baseline),    '#94a3b8'],
    item.duracao_dias         && ['Duração',     `${item.duracao_dias}d`,        null],
    ['% Real',      `${Number(item.peso_realizado_agregado||item._pct||0).toFixed(0)}%`, cor],
    item.folga_total != null  && ['Folga Total', `${item.folga_total}d`,
      item.folga_total <= 0 ? '#ef4444' : item.folga_total <= 5 ? '#f97316' : '#16a34a'],
    item.status_execucao && ['Status', STATUS[item.status_execucao] || item.status_execucao, cor],
  ].filter(Boolean)

  return (
    <div style={{ position: 'fixed', left: Math.min(x + 14, window.innerWidth - 240), top: y - 12, zIndex: 9999, pointerEvents: 'none' }}>
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, boxShadow:'0 8px 32px rgba(0,0,0,0.16)', padding:'10px 12px', minWidth:200, maxWidth:260, fontSize:11 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:6 }}>
          <div style={{ width:8, height:8, borderRadius:2, background:cor, flexShrink:0, marginTop:2 }} />
          <p style={{ fontWeight:700, color:'#1e293b', lineHeight:1.35, margin:0 }}>{item.nome}</p>
        </div>
        {rows.map(([label, val, color]) => (
          <div key={label} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'1.5px 0' }}>
            <span style={{ color:'#94a3b8' }}>{label}</span>
            <span style={{ fontWeight:600, color: color||'#334155', fontFamily:'monospace' }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
/**
 * GanttEstrategico
 *
 * Gantt customizado com:
 * - Barras coloridas por criticidade (Aldo Dórea Mattos: FT=0 → crítico)
 * - Barra de baseline (ghost) quando baseline congelada
 * - Fill de progresso dentro da barra atual
 * - Agrupamento por Etapa (E) com barra de resumo
 * - Escala Semanas / Meses
 * - Linha de hoje
 * - Tooltip rico ao hover
 * - Expand/collapse por Etapa
 *
 * Props:
 *   eap              - array normalizado de todos os itens EAP
 *   predecessoras    - array de dependências (não desenhado, futuro)
 *   baselineCongelada- boolean — exibe barras de baseline
 *   onClickItem      - callback(itemId) ao clicar no nome do serviço
 */
export default function GanttEstrategico({ eap = [], predecessoras = [], baselineCongelada = false, onClickItem }) {
  const [escala,    setEscala]    = useState('mes')
  const [expandidos,setExpandidos]= useState(() => new Set(eap.filter(i => i.tipo === 'E').map(i => i.id)))
  const [tooltip,   setTooltip]   = useState(null)  // { item, x, y }

  // ── Limites da timeline ────────────────────────────────────────────────────
  const { tlIni, tlFim } = useMemo(() => {
    let ini = null, fim = null
    for (const it of eap) {
      for (const f of ['data_inicio_prevista','data_inicio_baseline','data_fim_prevista','data_fim_baseline']) {
        if (!it[f]) continue
        if (!ini || it[f] < ini) ini = it[f]
        if (!fim || it[f] > fim) fim = it[f]
      }
    }
    if (!ini) ini = ts(new Date())
    if (!fim) fim = add(ini, 90)
    return { tlIni: add(ini, -14), tlFim: add(fim, 21) }
  }, [eap])

  const periodos = useMemo(() =>
    escala === 'semana' ? gerarSemanas(tlIni, tlFim) : gerarMeses(tlIni, tlFim),
    [escala, tlIni, tlFim]
  )
  const colW   = COL_W[escala]
  const totalD = dif(tlIni, tlFim) + 1
  const totalW = periodos.length * colW
  const hoje   = ts(new Date())
  const todayX = Math.max(0, Math.min(totalW, dif(tlIni, hoje) / totalD * totalW))

  // ── Header de grupos (meses para semana, anos para mês) ───────────────────
  const grupos = useMemo(() => {
    const g = []
    for (const p of periodos) {
      const key   = escala === 'semana' ? `${p.ano}-${p.mes}` : String(p.ano)
      const label = escala === 'semana' ? `${MESES[p.mes]} ${p.ano}` : String(p.ano)
      if (!g.length || g[g.length-1].key !== key) g.push({ key, label, count: 0 })
      g[g.length-1].count++
    }
    return g
  }, [periodos, escala])

  // ── Linhas visíveis ────────────────────────────────────────────────────────
  const etapas = useMemo(() => eap.filter(i => i.tipo === 'E'), [eap])

  const rows = useMemo(() => {
    const result = []
    for (const etapa of etapas) {
      const prefix  = etapa.codigo + '.'
      const filhos  = eap.filter(i =>
        i.tipo === 'S' && i.codigo.startsWith(prefix) &&
        (i.data_inicio_prevista || i.data_inicio_baseline)
      )
      const eIni = filhos.reduce((m, f) => { const d = f.data_inicio_prevista||f.data_inicio_baseline; return (!m||d<m)?d:m }, null)
      const eFim = filhos.reduce((m, f) => { const d = f.data_fim_prevista||f.data_fim_baseline; return (!m||d>m)?d:m }, null)
      const tp   = filhos.reduce((s, f) => s + Number(f.peso_percentual||0), 0)
      const pct  = tp > 0
        ? filhos.reduce((s, f) => s + Number(f.peso_percentual||0) * Number(f.peso_realizado_agregado||0)/100, 0) / tp * 100
        : 0

      result.push({
        tipo: 'etapa',
        item: { ...etapa, _ini: eIni, _fim: eFim, _pct: pct },
        nFilhos: filhos.length,
      })
      if (expandidos.has(etapa.id)) {
        for (const f of filhos) result.push({ tipo: 'servico', item: f })
      }
    }
    return result
  }, [etapas, eap, expandidos])

  function toggle(id) {
    setExpandidos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Métricas de resumo ─────────────────────────────────────────────────────
  const servicos   = eap.filter(i => i.tipo === 'S')
  const nCriticos  = servicos.filter(i => i.is_critica).length
  const nAtrasados = servicos.filter(i => i.status_execucao === 'atrasada').length
  const nConcl     = servicos.filter(i => i.status_execucao === 'concluida').length

  // ── Estado vazio ───────────────────────────────────────────────────────────
  if (servicos.length === 0 || totalW === 0) {
    return (
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:32, textAlign:'center', color:'#94a3b8', fontSize:13 }}>
        Nenhuma atividade com datas definidas para exibir no Gantt.<br />
        Configure datas de início e fim na tabela acima.
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {tooltip && <Tooltip item={tooltip.item} x={tooltip.x} y={tooltip.y} />}

      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>

        {/* ── Header ───────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 20px', borderBottom:'1px solid #f1f5f9', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, color:'#1e293b', fontSize:14, fontFamily:'Montserrat,sans-serif' }}>Gantt</span>
            {baselineCongelada && (
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#f0fdf4', color:'#16a34a', fontWeight:600 }}>
                🔒 Baseline ativa
              </span>
            )}
            <span style={{ fontSize:11, color:'#94a3b8' }}>
              {servicos.length} serviços · {nCriticos > 0 && <span style={{ color:'#ef4444', fontWeight:700 }}>{nCriticos} críticos</span>}
              {nCriticos > 0 && ' · '}
              {nAtrasados > 0 && <span style={{ color:'#dc2626', fontWeight:700 }}>{nAtrasados} atrasados</span>}
              {nAtrasados > 0 && ' · '}
              <span style={{ color:'#16a34a', fontWeight:600 }}>{nConcl} concluídos</span>
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Escala */}
            <div style={{ display:'flex', background:'#f1f5f9', padding:4, borderRadius:8, gap:2 }}>
              {[['semana','Semanas'],['mes','Meses']].map(([k,l]) => (
                <button key={k} onClick={() => setEscala(k)} style={{
                  padding:'3px 12px', border:'none', borderRadius:6, cursor:'pointer',
                  fontSize:11, fontWeight:500,
                  background: escala === k ? '#233772' : 'transparent',
                  color: escala === k ? '#fff' : '#64748b',
                  transition:'all .15s',
                }}>{l}</button>
              ))}
            </div>
            <button onClick={() => setExpandidos(new Set(etapas.map(i => i.id)))}
              style={{ padding:'3px 10px', border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', fontSize:11, cursor:'pointer', color:'#64748b' }}>
              Expandir
            </button>
            <button onClick={() => setExpandidos(new Set())}
              style={{ padding:'3px 10px', border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', fontSize:11, cursor:'pointer', color:'#64748b' }}>
              Recolher
            </button>
          </div>
        </div>

        {/* ── Legenda ──────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'5px 20px', background:'#f8fafc', borderBottom:'1px solid #f1f5f9', flexWrap:'wrap' }}>
          {[
            ['#ef4444','Crítico (FT=0)'],
            ['#f97316','Near-crítico (FT≤5d)'],
            ['#2563eb','Em andamento'],
            ['#16a34a','Concluído'],
            ['#dc2626','Atrasado'],
            ['#64748b','Não iniciado'],
          ].map(([cor,label]) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#64748b' }}>
              <div style={{ width:10, height:10, borderRadius:2, background:cor, flexShrink:0 }} />
              {label}
            </div>
          ))}
          {baselineCongelada && (
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#64748b' }}>
              <div style={{ width:10, height:6, borderRadius:2, background:'#94a3b8', opacity:.5, flexShrink:0 }} />
              Baseline
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#64748b' }}>
            <div style={{ width:2, height:10, background:'#ef4444', opacity:.7, flexShrink:0 }} />
            Hoje
          </div>
        </div>

        {/* ── Corpo do Gantt ────────────────────────────── */}
        <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:500 }}>
          <div style={{ minWidth: LEFT_W + totalW }}>

            {/* Timeline header — sticky no topo */}
            <div style={{ display:'flex', position:'sticky', top:0, zIndex:20, background:'#233772' }}>
              {/* Célula fixa esquerda do header */}
              <div style={{
                width:LEFT_W, flexShrink:0, padding:'0 12px',
                display:'flex', alignItems:'flex-end', paddingBottom:4,
                position:'sticky', left:0, zIndex:21, background:'#233772',
                borderRight:'2px solid rgba(255,255,255,0.2)',
              }}>
                <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:.5 }}>
                  WBS / Atividade
                </span>
              </div>

              {/* Cabeçalhos dos períodos */}
              <div style={{ width:totalW, flexShrink:0 }}>
                {/* Linha de grupos (meses / anos) */}
                <div style={{ display:'flex', height:22 }}>
                  {grupos.map((g, gi) => (
                    <div key={gi} style={{
                      width: g.count * colW, flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:10, fontWeight:700, color:'#fff',
                      borderRight:'1px solid rgba(255,255,255,0.15)',
                    }}>
                      {g.label}
                    </div>
                  ))}
                </div>
                {/* Linha de períodos individuais */}
                <div style={{ display:'flex', height:22 }}>
                  {periodos.map((p, pi) => {
                    const isHoje = p.ini <= hoje && hoje <= p.fim
                    return (
                      <div key={pi} style={{
                        width:colW, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:9, fontWeight: isHoje ? 700 : 400,
                        color: isHoje ? '#FFC82D' : 'rgba(255,255,255,0.45)',
                        borderRight:'1px solid rgba(255,255,255,0.08)',
                      }}>
                        {escala === 'semana' ? `S${pi+1}` : MESES[p.mes]}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Linhas de dados */}
            <div style={{ position:'relative' }}>

              {/* Linha de hoje (vertical, sobre tudo) */}
              {todayX > 0 && todayX <= totalW && (
                <div style={{
                  position:'absolute', top:0, bottom:0,
                  left: LEFT_W + todayX, width:2,
                  background:'#ef4444', opacity:.65, zIndex:15, pointerEvents:'none',
                }} />
              )}

              {/* Grid vertical de períodos (1 único conjunto, não por linha) */}
              {periodos.map((_, pi) => (
                <div key={pi} style={{
                  position:'absolute', top:0, bottom:0,
                  left: LEFT_W + pi * colW, width:1,
                  background:'#e2e8f0', zIndex:0, pointerEvents:'none',
                }} />
              ))}

              {rows.map((row, ri) => {
                if (row.tipo === 'etapa') {
                  const it = row.item
                  const bg = '#eff6ff'
                  const gEtapa = it._ini ? geom(it._ini, it._fim, tlIni, totalD, totalW) : null
                  const expanded = expandidos.has(it.id)

                  return (
                    <div key={it.id}
                      style={{ display:'flex', height:ROW_H, background:bg, borderBottom:'1px solid #dbeafe', position:'relative', zIndex:1 }}
                      onMouseMove={e => setTooltip({ item: it, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}>

                      {/* Célula fixa: nome da Etapa */}
                      <div style={{
                        width:LEFT_W, flexShrink:0, display:'flex', alignItems:'center', gap:6,
                        padding:'0 12px', background:bg,
                        borderRight:'2px solid #dbeafe',
                        position:'sticky', left:0, zIndex:5,
                      }}>
                        <button onClick={() => toggle(it.id)}
                          style={{ flexShrink:0, background:'none', border:'none', cursor:'pointer', color:'#2563eb', padding:0, display:'flex', alignItems:'center' }}>
                          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                        <span style={{ fontSize:9, fontWeight:700, padding:'1px 4px', borderRadius:3, background:'#2563eb20', color:'#2563eb', flexShrink:0 }}>E</span>
                        <span style={{ fontFamily:'monospace', fontSize:10, color:'#93a3b8', flexShrink:0 }}>{it.codigo}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:'#1e40af', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{it.nome}</span>
                        {row.nFilhos > 0 && (
                          <span style={{ fontSize:9, color:'#93a3b8', flexShrink:0, marginLeft:'auto', paddingLeft:4 }}>{row.nFilhos}</span>
                        )}
                      </div>

                      {/* Área das barras */}
                      <div style={{ width:totalW, flexShrink:0, position:'relative', height:ROW_H }}>
                        {/* Highlight coluna de hoje */}
                        {periodos.map((p, pi) => p.ini <= hoje && hoje <= p.fim && (
                          <div key={pi} style={{ position:'absolute', top:0, bottom:0, left: pi*colW, width:colW, background:'rgba(255,200,45,0.07)', pointerEvents:'none' }} />
                        ))}
                        {/* Barra de resumo da Etapa */}
                        {gEtapa && (
                          <div style={{
                            position:'absolute',
                            left: gEtapa.left, width: gEtapa.width,
                            top:'20%', height:'60%',
                            background:'#1e40af', borderRadius:4, overflow:'hidden', opacity:.75,
                          }}>
                            <div style={{ height:'100%', width:`${Math.min(100, it._pct||0)}%`, background:'#3b82f6', opacity:.9 }} />
                            {gEtapa.width > 44 && (
                              <span style={{ position:'absolute', right:4, top:'50%', transform:'translateY(-50%)', fontSize:9, fontWeight:700, color:'#fff' }}>
                                {Math.round(it._pct||0)}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }

                // ── Linha de Serviço ──────────────────────────────────────────
                const it  = row.item
                const cor = corBarra(it)
                const gC  = geom(it.data_inicio_prevista, it.data_fim_prevista, tlIni, totalD, totalW)
                const gB  = (baselineCongelada && it.data_inicio_baseline)
                  ? geom(it.data_inicio_baseline, it.data_fim_baseline, tlIni, totalD, totalW)
                  : null
                const pct = Math.min(100, Number(it.peso_realizado_agregado || 0))
                const rowBg = it.is_critica ? '#fff1f2' : ri % 2 === 0 ? '#fff' : '#f8fafc'

                return (
                  <div key={it.id}
                    style={{ display:'flex', height:ROW_H, background:rowBg, borderBottom:'1px solid #f1f5f9', position:'relative', zIndex:1 }}
                    onMouseMove={e => setTooltip({ item: it, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}>

                    {/* Célula fixa: nome do Serviço */}
                    <div style={{
                      width:LEFT_W, flexShrink:0, display:'flex', alignItems:'center', gap:5,
                      paddingLeft:32, paddingRight:8,
                      background:rowBg, borderRight:'1px solid #e2e8f0',
                      position:'sticky', left:0, zIndex:5,
                    }}>
                      <span style={{ fontSize:9, fontWeight:700, padding:'1px 3px', borderRadius:3, background:'#64748b18', color:'#64748b', flexShrink:0 }}>S</span>
                      <span style={{ fontFamily:'monospace', fontSize:10, color:'#94a3b8', flexShrink:0 }}>{it.codigo}</span>
                      <span style={{ fontSize:11, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }}
                        onClick={() => onClickItem?.(it.id)}>
                        {it.nome}
                      </span>
                    </div>

                    {/* Área das barras */}
                    <div style={{ width:totalW, flexShrink:0, position:'relative', height:ROW_H }}>
                      {/* Highlight coluna de hoje */}
                      {periodos.map((p, pi) => p.ini <= hoje && hoje <= p.fim && (
                        <div key={pi} style={{ position:'absolute', top:0, bottom:0, left: pi*colW, width:colW, background:'rgba(255,200,45,0.05)', pointerEvents:'none' }} />
                      ))}

                      {/* Barra de baseline (ghost abaixo) */}
                      {gB && (
                        <div style={{
                          position:'absolute',
                          left:gB.left, width:gB.width,
                          top:'64%', height:'18%',
                          background:'#94a3b8', borderRadius:2, opacity:.45,
                        }} />
                      )}

                      {/* Barra atual (com fill de progresso) */}
                      {gC && (
                        <div style={{
                          position:'absolute',
                          left:gC.left, width:gC.width,
                          top:'20%', height:'42%',
                          background:cor, borderRadius:4, overflow:'hidden', opacity:.88,
                        }}>
                          {/* Fill de progresso: brilho mais escuro */}
                          <div style={{ height:'100%', width:`${pct}%`, background: cor, filter:'brightness(0.72)' }} />
                        </div>
                      )}

                      {/* Label de % na barra (quando há espaço) */}
                      {gC && gC.width > 34 && pct > 0 && (
                        <div style={{
                          position:'absolute',
                          left:gC.left + 4,
                          top:'20%', height:'42%',
                          display:'flex', alignItems:'center',
                          fontSize:9, fontWeight:700, color:'#fff',
                          pointerEvents:'none',
                        }}>
                          {pct}%
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
