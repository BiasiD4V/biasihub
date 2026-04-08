import React, { useState } from 'react'
import { X, Save, Link, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { COR_TIPO } from '../../lib/planejamento/parseEAP'

// ── Constantes ────────────────────────────────────────────────────────────────

const CRITERIOS = [
  { value: 'ZERO_CEM',      label: '0/100 — Zero ou cem'       },
  { value: 'VINTE_OITENTA', label: '20/80 — Vinte e oitenta'   },
  { value: 'ETAPAS',        label: 'Etapas físicas'            },
  { value: 'UNIDADE',       label: 'Por unidade produzida'     },
  { value: 'QUANTIDADE',    label: 'Por quantidade executada'  },
]

const STATUS_OPTS = [
  { value: 'nao_iniciada', label: 'Não iniciada', cor: '#94a3b8' },
  { value: 'em_andamento', label: 'Em andamento', cor: '#2563eb' },
  { value: 'concluida',    label: 'Concluída',    cor: '#16a34a' },
  { value: 'atrasada',     label: 'Atrasada',     cor: '#dc2626' },
  { value: 'pausada',      label: 'Pausada',      cor: '#d97706' },
]

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

// ── Seção de formulário ───────────────────────────────────────────────────────

function Secao({ titulo, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
        {titulo}
      </h3>
      {children}
    </div>
  )
}

function Campo({ label, children, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * ModalParametrosServico
 *
 * Modal completo de edição de parâmetros de um Serviço (tipo S da EAP).
 * Salva diretamente no Supabase e chama onSalvo(itemAtualizado) após.
 *
 * Props:
 *   item             - item EAP normalizado (tipo S)
 *   baselineCongelada
 *   perm             - permissões do usuário
 *   predecessorasAtv - array de predecessoras desta atividade
 *   atvIdToEap       - mapa atividade_id → item EAP (para exibir códigos)
 *   onAbrirModalPred - abre modal de predecessoras (passando item)
 *   onFechar         - fecha o modal
 *   onSalvo(campos)  - atualiza estado local no pai com campos novos
 */
export default function ModalParametrosServico({
  item,
  baselineCongelada,
  perm,
  predecessorasAtv = [],
  atvIdToEap = {},
  onAbrirModalPred,
  onFechar,
  onSalvo,
}) {
  const podeEditar = perm.editarCronograma && !baselineCongelada

  // ── Estado ─────────────────────────────────────────────────────────────────

  const [aba, setAba] = useState('planejamento')

  // Tab Planejamento
  const [nome,         setNome]         = useState(item.nome         || '')
  const [duracao,      setDuracao]      = useState(item.duracao_dias  != null ? String(item.duracao_dias) : '')
  const [dataInicio,   setDataInicio]   = useState(item.data_inicio_prevista || '')
  const [dataFim,      setDataFim]      = useState(item.data_fim_prevista    || '')
  const [peso,         setPeso]         = useState(item.peso_percentual      != null ? String(item.peso_percentual) : '')
  const [valorOrcado,  setValorOrcado]  = useState(item.valor_orcado         != null ? String(item.valor_orcado)    : '')
  const [criterio,     setCriterio]     = useState(item.criterio_medicao     || 'ZERO_CEM')

  // Tab Execução
  const [pctReal,      setPctReal]      = useState(String(item.peso_realizado_agregado ?? 0))
  const [status,       setStatus]       = useState(item.status_execucao  || 'nao_iniciada')
  const [dataRealIni,  setDataRealIni]  = useState(item.data_real_inicio || '')
  const [dataRealFim,  setDataRealFim]  = useState(item.data_real_fim    || '')
  const [obs,          setObs]          = useState(item.obs_execucao     || '')

  const [salvando,  setSalvando]  = useState(false)
  const [erro,      setErro]      = useState('')
  const [sucesso,   setSucesso]   = useState(false)

  // ── Salvar ─────────────────────────────────────────────────────────────────

  async function handleSalvar() {
    setErro('')
    setSucesso(false)
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }

    setSalvando(true)
    try {
      // 1. Atualiza planejamento_eap
      const { error: errEap } = await supabase
        .from('planejamento_eap')
        .update({
          nome:             nome.trim(),
          peso_percentual:  peso       ? Number(peso)      : null,
          valor_orcado:     valorOrcado ? Number(valorOrcado) : null,
        })
        .eq('id', item.id)
      if (errEap) throw errEap

      // 2. Atualiza planejamento_atividades (se existir)
      if (item.atividade_id) {
        const { error: errAtv } = await supabase
          .from('planejamento_atividades')
          .update({
            duracao_dias:         duracao    ? Number(duracao)    : null,
            data_inicio_prevista: dataInicio || null,
            data_fim_prevista:    dataFim    || null,
            criterio_medicao:     criterio   || null,
            peso_realizado_perc:  Number(pctReal) || 0,
            status:               status,
            data_real_inicio:     dataRealIni || null,
            data_real_fim:        dataRealFim || null,
            obs_execucao:         obs.trim()  || null,
          })
          .eq('id', item.atividade_id)
        if (errAtv) throw errAtv
      }

      // Retorna campos atualizados para o pai
      onSalvo?.({
        nome:                    nome.trim(),
        duracao_dias:            duracao     ? Number(duracao)      : null,
        data_inicio_prevista:    dataInicio  || null,
        data_fim_prevista:       dataFim     || null,
        peso_percentual:         peso        ? Number(peso)         : null,
        valor_orcado:            valorOrcado ? Number(valorOrcado)  : null,
        criterio_medicao:        criterio,
        peso_realizado_agregado: Number(pctReal) || 0,
        status_execucao:         status,
        data_real_inicio:        dataRealIni || null,
        data_real_fim:           dataRealFim || null,
        obs_execucao:            obs.trim()  || null,
      })

      setSucesso(true)
      setTimeout(onFechar, 800)
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  // ── Predecessoras string (estilo MS Project) ───────────────────────────────

  const predStr = predecessorasAtv
    .map(p => {
      const pred = atvIdToEap?.[p.predecessora_id]
      if (!pred) return null
      const lag = p.lag_dias !== 0 ? (p.lag_dias > 0 ? `+${p.lag_dias}` : `${p.lag_dias}`) : ''
      return `${pred.codigo}${p.tipo}${lag}`
    })
    .filter(Boolean)
    .join(', ')

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const abas = [
    { id: 'planejamento', label: 'Planejamento' },
    { id: 'execucao',     label: 'Execução'     },
    { id: 'info',         label: 'CPM / Info'   },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* ── Cabeçalho ── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: COR_TIPO['S'] + '25', color: COR_TIPO['S'] }}>
                S
              </span>
              <span className="font-mono text-xs text-slate-400">{item.codigo}</span>
              {item.is_critica && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">CRÍTICA</span>
              )}
              {item.folga_total != null && item.folga_total <= 5 && !item.is_critica && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                  FT={item.folga_total}d
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-slate-800 truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {item.nome}
            </h2>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 ml-2 flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* ── Abas ── */}
        <div className="flex border-b border-slate-100 px-5 flex-shrink-0">
          {abas.map(a => (
            <button key={a.id}
              onClick={() => setAba(a.id)}
              className={[
                'py-2.5 px-1 mr-5 text-xs font-semibold border-b-2 transition-colors',
                aba === a.id
                  ? 'border-[#233772] text-[#233772]'
                  : 'border-transparent text-slate-400 hover:text-slate-600',
              ].join(' ')}>
              {a.label}
            </button>
          ))}
        </div>

        {/* ── Corpo scrollável ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ╔══ ABA PLANEJAMENTO ══╗ */}
          {aba === 'planejamento' && (
            <>
              <Secao titulo="Identificação">
                <Campo label="Nome *" full>
                  {podeEditar ? (
                    <input value={nome} onChange={e => setNome(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#233772]" />
                  ) : (
                    <p className="text-sm text-slate-700 py-1">{nome || '—'}</p>
                  )}
                </Campo>
              </Secao>

              <Secao titulo="Cronograma">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Duração (dias úteis)">
                    {podeEditar ? (
                      <input type="number" min="1" value={duracao}
                        onChange={e => setDuracao(e.target.value)}
                        placeholder="Ex: 5"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#233772]" />
                    ) : (
                      <p className="text-sm text-slate-700 py-1">{duracao ? `${duracao}d` : '—'}</p>
                    )}
                  </Campo>
                  <Campo label="Critério de medição">
                    {podeEditar ? (
                      <select value={criterio} onChange={e => setCriterio(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#233772]">
                        {CRITERIOS.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-slate-700 py-1">
                        {CRITERIOS.find(c => c.value === criterio)?.label || criterio}
                      </p>
                    )}
                  </Campo>
                  <Campo label="Início previsto">
                    {podeEditar ? (
                      <input type="date" value={dataInicio}
                        onChange={e => setDataInicio(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#233772]" />
                    ) : (
                      <p className="text-sm text-slate-700 py-1">{fmtData(dataInicio)}</p>
                    )}
                  </Campo>
                  <Campo label="Fim previsto">
                    {podeEditar ? (
                      <input type="date" value={dataFim}
                        onChange={e => setDataFim(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#233772]" />
                    ) : (
                      <p className="text-sm text-slate-700 py-1">{fmtData(dataFim)}</p>
                    )}
                  </Campo>
                </div>
              </Secao>

              <Secao titulo="Custo">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Peso %">
                    {podeEditar ? (
                      <input type="number" min="0" max="100" step="0.01" value={peso}
                        onChange={e => setPeso(e.target.value)}
                        placeholder="0,00"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#233772]" />
                    ) : (
                      <p className="text-sm text-slate-700 py-1">{peso ? `${peso}%` : '—'}</p>
                    )}
                  </Campo>
                  <Campo label="Valor Orçado (R$)">
                    {podeEditar ? (
                      <input type="number" min="0" step="0.01" value={valorOrcado}
                        onChange={e => setValorOrcado(e.target.value)}
                        placeholder="0,00"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#233772]" />
                    ) : (
                      <p className="text-sm text-slate-700 py-1">
                        {valorOrcado ? `R$ ${Number(valorOrcado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </p>
                    )}
                  </Campo>
                </div>
              </Secao>

              {/* Predecessoras */}
              <Secao titulo="Predecessoras">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-600 flex-1 min-w-0 truncate">
                    {predStr || 'Nenhuma predecessora'}
                  </span>
                  {podeEditar && (
                    <button
                      onClick={() => { onAbrirModalPred?.(item); onFechar() }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex-shrink-0">
                      <Link size={12} />
                      Editar
                    </button>
                  )}
                </div>
              </Secao>
            </>
          )}

          {/* ╔══ ABA EXECUÇÃO ══╗ */}
          {aba === 'execucao' && (
            <>
              <Secao titulo="Avanço físico">
                <div className="space-y-3">
                  {/* Slider + input */}
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="100" step="0.5"
                      value={pctReal}
                      onChange={e => setPctReal(e.target.value)}
                      disabled={!perm.registrarProgresso}
                      className="flex-1 accent-[#233772]" />
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" max="100" step="0.1"
                        value={pctReal}
                        onChange={e => setPctReal(e.target.value)}
                        disabled={!perm.registrarProgresso}
                        className="w-16 text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-[#233772] disabled:bg-slate-50" />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </div>
                  {/* Barra visual */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Number(pctReal) || 0)}%`,
                        backgroundColor: Number(pctReal) >= 100 ? '#16a34a' : '#233772',
                      }} />
                  </div>
                </div>
              </Secao>

              <Secao titulo="Status e datas reais">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Status" full>
                    {perm.registrarProgresso ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 col-span-2">
                        {STATUS_OPTS.map(s => (
                          <button key={s.value}
                            onClick={() => setStatus(s.value)}
                            className="py-2 px-3 rounded-lg border-2 text-xs font-semibold transition-all text-left"
                            style={status === s.value
                              ? { borderColor: s.cor, backgroundColor: s.cor + '18', color: s.cor }
                              : { borderColor: '#e2e8f0', color: '#94a3b8' }}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm py-1" style={{ color: STATUS_OPTS.find(s => s.value === status)?.cor }}>
                        {STATUS_OPTS.find(s => s.value === status)?.label || status}
                      </p>
                    )}
                  </Campo>
                  <Campo label="Data real de início">
                    <input type="date" value={dataRealIni}
                      onChange={e => setDataRealIni(e.target.value)}
                      disabled={!perm.registrarProgresso}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#233772] disabled:bg-slate-50" />
                  </Campo>
                  <Campo label="Data real de fim">
                    <input type="date" value={dataRealFim}
                      onChange={e => setDataRealFim(e.target.value)}
                      disabled={!perm.registrarProgresso}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#233772] disabled:bg-slate-50" />
                  </Campo>
                  <Campo label="Observações" full>
                    <textarea rows={3} value={obs}
                      onChange={e => setObs(e.target.value)}
                      disabled={!perm.registrarProgresso}
                      placeholder="Comentários sobre execução..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#233772] disabled:bg-slate-50 resize-none" />
                  </Campo>
                </div>
              </Secao>
            </>
          )}

          {/* ╔══ ABA CPM / INFO ══╗ */}
          {aba === 'info' && (
            <>
              <Secao titulo="Caminho Crítico">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Crítica</p>
                    <div className="flex items-center gap-1.5">
                      {item.is_critica
                        ? <><AlertTriangle size={13} className="text-red-500" /><span className="text-sm font-bold text-red-600">Sim</span></>
                        : <><CheckCircle2 size={13} className="text-green-500" /><span className="text-sm font-bold text-green-600">Não</span></>
                      }
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Folga Total</p>
                    <p className="text-sm font-bold" style={{
                      color: item.folga_total == null ? '#94a3b8'
                           : item.folga_total === 0   ? '#dc2626'
                           : item.folga_total <= 5    ? '#f97316'
                           : '#16a34a'
                    }}>
                      {item.folga_total != null ? `${item.folga_total}d` : '—'}
                    </p>
                  </div>
                </div>
              </Secao>

              <Secao titulo="Baseline">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Início baseline</p>
                    <p className="text-sm text-slate-700">{fmtData(item.data_inicio_baseline)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Fim baseline</p>
                    <p className="text-sm text-slate-700">{fmtData(item.data_fim_baseline)}</p>
                  </div>
                  {item.duracao_baseline && (
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Duração baseline</p>
                      <p className="text-sm text-slate-700">{item.duracao_baseline}d</p>
                    </div>
                  )}
                </div>
              </Secao>

              <Secao titulo="Predecessoras">
                {predecessorasAtv.length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhuma predecessora cadastrada.</p>
                ) : (
                  <div className="space-y-1">
                    {predecessorasAtv.map(p => {
                      const pred = atvIdToEap?.[p.predecessora_id]
                      const lag  = p.lag_dias !== 0 ? (p.lag_dias > 0 ? `+${p.lag_dias}d` : `${p.lag_dias}d`) : ''
                      return (
                        <div key={p.id} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-slate-500">{pred?.codigo || '?'}</span>
                          <span className="text-slate-400">—</span>
                          <span className="text-slate-700 truncate">{pred?.nome || '?'}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono flex-shrink-0">{p.tipo}{lag}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Secao>
            </>
          )}

          {/* Feedback */}
          {erro    && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          {sucesso && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} />
              Salvo com sucesso!
            </div>
          )}
        </div>

        {/* ── Rodapé ── */}
        <div className="flex justify-between items-center gap-2 px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <div className="text-[10px] text-slate-400">
            {baselineCongelada && (
              <span className="flex items-center gap-1 text-amber-600">
                <Clock size={11} /> Baseline congelada — planejamento somente leitura
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onFechar}
              className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              Fechar
            </button>
            {(podeEditar || perm.registrarProgresso) && (
              <button onClick={handleSalvar} disabled={salvando}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                style={{ backgroundColor: '#233772' }}>
                {salvando
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save size={14} />}
                Salvar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
