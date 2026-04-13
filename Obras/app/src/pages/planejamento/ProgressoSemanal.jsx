import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Save, CheckCircle2, AlertCircle, Activity } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePermissoes } from '../../hooks/usePermissoes'
import { useObra } from '../../context/ObraContext'
import { semanaRef, formatarSemana } from '../../lib/planejamento/diasUteis'
import { calcPPC } from '../../lib/planejamento/calcEVM'

// Semáforo por desvio entre realizado e planejado
function semaforoLinha(perc_realizado, perc_planejado) {
  if (perc_planejado === 0 && perc_realizado === 0) return null
  const desvio = perc_realizado - perc_planejado
  if (desvio >= 0) return { cor: '#16a34a', bg: '#f0fdf4', label: '✓' }
  if (Math.abs(desvio) <= 10) return { cor: '#d97706', bg: '#fffbeb', label: '~' }
  return { cor: '#dc2626', bg: '#fef2f2', label: '!' }
}

export default function ProgressoSemanal() {
  const { usuario } = useAuth()
  const { obraSelecionadaId, obraAtual, planejamentoId } = useObra()
  const perm = usePermissoes(obraSelecionadaId)

  const [semana, setSemana] = useState(semanaRef())
  const [atividades, setAtividades] = useState([])   // lista tipo S com dados
  const [avancos, setAvancos] = useState({})          // { atividade_id: { perc_realizado, observacao } }
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msgSucesso, setMsgSucesso] = useState('')
  const [ppc, setPpc] = useState(null)

  const obraId = obraSelecionadaId

  async function carregar(semanaAtual) {
    if (!obraId || !planejamentoId) return
    setCarregando(true)
    try {
      // Buscar atividades tipo S (folhas) com seu item EAP pai
      const { data: eapItems } = await supabase
        .from('planejamento_eap')
        .select(`
          id, codigo, nome, tipo, parent_id,
          atividades:planejamento_atividades(
            id, nome, data_inicio_prevista, data_fim_prevista,
            peso_percentual, peso_realizado_perc, criterio_medicao, status
          )
        `)
        .eq('planejamento_id', planejamentoId)
        .order('codigo')

      // Filtrar só folhas (tipo S) e achatar
      const folhas = (eapItems || [])
        .filter(i => i.tipo === 'S' && i.atividades?.length > 0)
        .map(i => {
          const at = i.atividades[0]
          // Calcular % planejado para a semana (linear proporcional)
          const percPlanejado = calcPercPlanejadoSemana(at, semanaAtual)
          return {
            eapId: i.id,
            eapCodigo: i.codigo,
            eapNome: i.nome,
            parentId: i.parent_id,
            atividadeId: at.id,
            pesoPercentual: Number(at.peso_percentual || 0),
            percRealizadoAnterior: Number(at.peso_realizado_perc || 0),
            percPlanejado,
            status: at.status,
          }
        })

      // Buscar apontamentos já feitos nessa semana
      const atividadeIds = folhas.map(f => f.atividadeId)
      if (atividadeIds.length > 0) {
        const { data: avancosSemana } = await supabase
          .from('avancos_fisicos')
          .select('atividade_id, perc_realizado, observacao')
          .in('atividade_id', atividadeIds)
          .eq('semana_ref', semanaAtual)

        const mapaAvancos = {}
        for (const av of (avancosSemana || [])) {
          mapaAvancos[av.atividade_id] = {
            perc_realizado: Number(av.perc_realizado || 0),
            observacao: av.observacao || '',
          }
        }
        setAvancos(mapaAvancos)

        // Calcular PPC existente
        const planejadas = folhas.filter(f => f.percPlanejado > 0).length
        const concluidas = (avancosSemana || []).filter(av => {
          const f = folhas.find(x => x.atividadeId === av.atividade_id)
          return f && Number(av.perc_realizado) >= f.percPlanejado && f.percPlanejado > 0
        }).length
        setPpc(planejadas > 0 ? calcPPC(planejadas, concluidas) : null)
      } else {
        setAvancos({})
        setPpc(null)
      }

      setAtividades(folhas)
    } catch (err) {
      console.error('[ProgressoSemanal]', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar(semana) }, [obraId, planejamentoId, semana])

  // Calcular % planejado para uma atividade na semana
  function calcPercPlanejadoSemana(at, semanaStr) {
    if (!at.data_inicio_prevista || !at.data_fim_prevista) return 0
    const inicio = new Date(at.data_inicio_prevista + 'T12:00:00')
    const fim = new Date(at.data_fim_prevista + 'T12:00:00')
    const semana = new Date(semanaStr + 'T12:00:00')
    const fimSemana = new Date(semana)
    fimSemana.setDate(semana.getDate() + 4) // sexta

    if (fimSemana < inicio || semana > fim) return 0
    const durTotal = Math.max(1, (fim - inicio) / 86400000)
    const ate = Math.min(fimSemana, fim)
    const decorrido = Math.max(0, (ate - inicio) / 86400000)
    return Math.min(100, (decorrido / durTotal) * 100)
  }

  function handleChange(atividadeId, campo, valor) {
    setAvancos(prev => ({
      ...prev,
      [atividadeId]: {
        ...prev[atividadeId],
        [campo]: valor,
      }
    }))
  }

  async function handleSalvar() {
    if (!planejamentoId) return
    setSalvando(true)
    try {
      const upserts = atividades.map(f => ({
        atividade_id: f.atividadeId,
        planejamento_id: planejamentoId,
        semana_ref: semana,
        data_ref: semana,
        perc_realizado: Number(avancos[f.atividadeId]?.perc_realizado ?? f.percRealizadoAnterior),
        perc_planejado: f.percPlanejado,
        peso_realizado_perc: Number(avancos[f.atividadeId]?.perc_realizado ?? f.percRealizadoAnterior),
        observacao: avancos[f.atividadeId]?.observacao || null,
        registrado_por: usuario?.id,
      }))

      await supabase
        .from('avancos_fisicos')
        .upsert(upserts, { onConflict: 'atividade_id,data_ref' })

      // Calcular PPC da semana
      const planejadas = atividades.filter(f => f.percPlanejado > 0).length
      const concluidas = atividades.filter(f => {
        const real = Number(avancos[f.atividadeId]?.perc_realizado ?? 0)
        return f.percPlanejado > 0 && real >= f.percPlanejado
      }).length
      const ppcCalc = planejadas > 0 ? calcPPC(planejadas, concluidas) : null
      setPpc(ppcCalc)

      // Salvar snapshot EVM com PPC
      if (ppcCalc !== null) {
        await supabase
          .from('evm_snapshots')
          .upsert({
            planejamento_id: planejamentoId,
            semana_ref: semana,
            vp: 0, va: 0, cr: null, idc: null, idp: null,
            ppc: ppcCalc,
          }, { onConflict: 'planejamento_id,semana_ref,periodo' })
      }

      setMsgSucesso('Apontamentos salvos!')
      setTimeout(() => setMsgSucesso(''), 3000)
      await carregar(semana)
    } catch (err) {
      console.error('[ProgressoSemanal] Salvar:', err)
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  function navSemana(direcao) {
    const d = new Date(semana + 'T12:00:00')
    d.setDate(d.getDate() + direcao * 7)
    setSemana(d.toISOString().split('T')[0])
  }

  // Agrupar atividades por CC (raiz)
  const grupos = {}
  for (const at of atividades) {
    const cc = at.eapCodigo.split('.')[0]
    if (!grupos[cc]) grupos[cc] = []
    grupos[cc].push(at)
  }

  if (!obraId) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-slate-500">
      <AlertCircle size={32} className="mb-3 text-slate-300" />
      <p className="font-medium">Selecione uma obra no cabeçalho</p>
    </div>
  )

  return (
    <div className="p-6 space-y-5">

      {/* Alerta sucesso */}
      {msgSucesso && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
          <CheckCircle2 size={16} /> {msgSucesso}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
            Progresso Semanal
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{obraAtual?.nome || '—'}</p>
        </div>

        {/* PPC card */}
        {ppc !== null && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
            <Activity size={18} style={{ color: ppc >= 85 ? '#16a34a' : '#d97706' }} />
            <div>
              <p className="text-xs text-slate-500 font-medium">PPC da semana</p>
              <p className="text-xl font-bold" style={{ color: ppc >= 85 ? '#16a34a' : '#d97706' }}>
                {ppc.toFixed(0)}%
              </p>
            </div>
            <div className="text-xs text-slate-400">meta 85%</div>
          </div>
        )}
      </div>

      {/* Seletor de semana */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 w-fit">
        <button onClick={() => navSemana(-1)}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-slate-700 min-w-[260px] text-center">
          {formatarSemana(semana)}
        </span>
        <button onClick={() => navSemana(1)}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronRight size={16} />
        </button>
        <button onClick={() => setSemana(semanaRef())}
          className="text-xs text-blue-600 hover:underline ml-2">
          Hoje
        </button>
      </div>

      {/* Tabela de apontamento */}
      {carregando ? (
        <div className="p-8 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin mx-auto mb-2" />
          Carregando atividades...
        </div>
      ) : atividades.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          <Activity size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma atividade encontrada</p>
          <p className="text-sm mt-1">Importe uma EAP em Planejamento → Cronograma primeiro</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Atividade</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Previsto</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Realizado %</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Observação</th>
                <th className="text-center px-3 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(grupos).map(([cc, lista]) => (
                <React.Fragment key={cc}>
                  {/* Cabeçalho do grupo CC */}
                  <tr className="bg-violet-50">
                    <td colSpan={5} className="px-5 py-2">
                      <span className="text-xs font-bold text-violet-700 uppercase tracking-wide">
                        {cc} — {lista[0]?.eapCodigo.split('.').slice(0,1).join('.')}
                      </span>
                    </td>
                  </tr>
                  {/* Atividades do grupo */}
                  {lista.map(f => {
                    const avAtual = avancos[f.atividadeId]
                    const percReal = avAtual?.perc_realizado ?? f.percRealizadoAnterior
                    const semaf = semaforoLinha(Number(percReal), f.percPlanejado)
                    const editavel = perm.registrarAvanco

                    return (
                      <tr key={f.atividadeId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-2.5">
                          <p className="text-sm text-slate-800">{f.eapNome}</p>
                          <p className="text-xs text-slate-400 font-mono">{f.eapCodigo}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-sm font-medium text-slate-600">
                            {f.percPlanejado > 0 ? `${f.percPlanejado.toFixed(1)}%` : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {editavel ? (
                            <input
                              type="number" min="0" max="100" step="1"
                              value={avAtual?.perc_realizado ?? f.percRealizadoAnterior}
                              onChange={e => handleChange(f.atividadeId, 'perc_realizado', e.target.value)}
                              className="w-20 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                            />
                          ) : (
                            <span className="text-sm font-medium" style={{ color: '#233772' }}>
                              {Number(percReal).toFixed(0)}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {editavel ? (
                            <input
                              type="text"
                              value={avAtual?.observacao ?? ''}
                              onChange={e => handleChange(f.atividadeId, 'observacao', e.target.value)}
                              placeholder="Observação opcional..."
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">{avAtual?.observacao || '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {semaf && (
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mx-auto"
                              style={{ backgroundColor: semaf.bg, color: semaf.cor }}>
                              {semaf.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Rodapé com botão salvar */}
          {perm.registrarAvanco && (
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <p className="text-xs text-slate-500">
                Semáforo: <span className="text-green-600 font-medium">✓ no prazo</span> ·
                <span className="text-amber-600 font-medium"> ~ desvio ≤10%</span> ·
                <span className="text-red-600 font-medium"> ! desvio &gt;10%</span>
              </p>
              <button onClick={handleSalvar} disabled={salvando}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: '#233772' }}>
                {salvando
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save size={15} />}
                Salvar apontamentos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
