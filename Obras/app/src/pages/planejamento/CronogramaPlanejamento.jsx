import React, { useState, useEffect } from 'react'
import {
  Upload, Lock, AlertCircle, CheckCircle2, Save,
  Plus, ChevronsDownUp, ChevronsUpDown, HelpCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePermissoes } from '../../hooks/usePermissoes'
import { useObra } from '../../context/ObraContext'
import GanttEstrategico from '../../components/planejamento/GanttEstrategico'
import ModalPredecessoras from '../../components/planejamento/ModalPredecessoras'
import ModalImportarEAP from '../../components/planejamento/ModalImportarEAP'
import ModalNovoItemEAP from '../../components/planejamento/ModalNovoItemEAP'
import ModalParametrosServico from '../../components/planejamento/ModalParametrosServico'
import ToolbarEAP from '../../components/planejamento/ToolbarEAP'
import PainelResumoCronograma from '../../components/planejamento/PainelResumoCronograma'
import LinhaEAP from '../../components/planejamento/LinhaEAP'
import LegendaCPM from '../../components/planejamento/LegendaCPM'
import { aplicarCPMNoSupabase } from '../../lib/planejamento/calcCPM'
import {
  parseEAP, construirArvore, contarPorTipo, COR_TIPO, LABEL_TIPO, EXEMPLO_EAP
} from '../../lib/planejamento/parseEAP'

export default function CronogramaPlanejamento() {
  const { usuario } = useAuth()
  const { obraSelecionadaId, obraAtual } = useObra()
  const perm = usePermissoes(obraSelecionadaId)

  const [planejamento,     setPlanejamento]     = useState(null)
  const [eap,              setEap]              = useState([])
  const [predecessoras,    setPredecessoras]    = useState([])
  const [pendingForms,     setPendingForms]     = useState({})   // { [eapId]: form }
  const [salvandoTudo,     setSalvandoTudo]     = useState(false)
  const [modoProgresso,    setModoProgresso]    = useState(false)
  const [pendingProgresso, setPendingProgresso] = useState({})   // { [atvId]: { pct, status, ... } }
  const [salvandoProgresso,setSalvandoProgresso]= useState(false)
  const [modalPred,        setModalPred]        = useState(null)
  const [salvandoPred,     setSalvandoPred]     = useState(false)
  const [expandidos,       setExpandidos]       = useState(new Set())
  const [editando,         setEditando]         = useState(false)
  const [modalImport,      setModalImport]      = useState(false)
  const [modalNovoItem,    setModalNovoItem]    = useState(false)
  const [modalParametros,  setModalParametros]  = useState(null)   // item EAP ou null
  const [itemSelecionado,  setItemSelecionado]  = useState(null)   // toolbar
  const [tipoAddRapido,    setTipoAddRapido]    = useState(null)   // pré-seleciona tipo no modal
  const [painelAberto,     setPainelAberto]     = useState(true)
  const [carregando,       setCarregando]       = useState(false)
  const [congelando,       setCongelando]       = useState(false)
  const [msgSucesso,       setMsgSucesso]       = useState('')

  const obraId = obraSelecionadaId

  // ── Carregar EAP ────────────────────────────────────────────────────────────
  async function carregar() {
    if (!obraId) return
    setCarregando(true)
    try {
      const { data: planos } = await supabase
        .from('obra_planejamentos')
        .select('*')
        .eq('obra_id', obraId)
        .order('versao', { ascending: false })
        .limit(1)

      const plano = planos?.[0] || null
      setPlanejamento(plano)

      if (!plano) { setEap([]); return }

      const { data: eapData, error: eapErr } = await supabase
        .from('planejamento_eap')
        .select(`
          *,
          atividades:planejamento_atividades(
            id, duracao_dias,
            data_inicio_prevista, data_fim_prevista,
            data_inicio_baseline, data_fim_baseline,
            duracao_baseline,
            criterio_medicao, quantidade, unidade,
            is_critica, folga_total,
            peso_realizado_perc,
            status, data_real_inicio, data_real_fim, obs_execucao
          )
        `)
        .eq('planejamento_id', plano.id)
        .is('deletado_em', null)
        .order('ordem',  { ascending: true, nullsFirst: false })
        .order('codigo', { ascending: true })

      if (eapErr) throw eapErr

      const eapNormalizada = (eapData || []).map(item => {
        const at = item.atividades?.[0]
        const temFilhos = (eapData || []).some(e => e.parent_id === item.id)
        return {
          ...item,
          temFilhos,
          duracao_dias:            at?.duracao_dias         ?? null,
          data_inicio_prevista:    at?.data_inicio_prevista ?? null,
          data_fim_prevista:       at?.data_fim_prevista    ?? null,
          criterio_medicao:        at?.criterio_medicao,
          is_critica:              at?.is_critica           ?? false,
          folga_total:             at?.folga_total          ?? null,
          peso_realizado_agregado: at?.peso_realizado_perc  ?? 0,
          atividade_id:            at?.id,
          status_execucao:         at?.status               ?? 'nao_iniciada',
          data_real_inicio:        at?.data_real_inicio     ?? null,
          data_real_fim:           at?.data_real_fim        ?? null,
          obs_execucao:            at?.obs_execucao         ?? '',
        }
      })

      setEap(eapNormalizada)

      const atvIds = eapNormalizada.filter(i => i.atividade_id).map(i => i.atividade_id)
      if (atvIds.length > 0) {
        const { data: predsData } = await supabase
          .from('planejamento_predecessoras')
          .select('id, atividade_id, predecessora_id, tipo, lag_dias')
          .in('atividade_id', atvIds)
        setPredecessoras(predsData || [])
      } else {
        setPredecessoras([])
      }

      setExpandidos(new Set(eapNormalizada.map(i => i.id)))
      setPendingForms({})
    } catch (err) {
      console.error('[CronogramaPlanejamento] carregar:', err)
      alert('Erro ao carregar EAP: ' + (err?.message || err))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [obraId])

  // ── Importar EAP via Excel ───────────────────────────────────────────────────
  async function handleImportarEAP(itens, modo, planejamentoId) {
    let planoId = planejamentoId

    if (!planoId) {
      const { data: novoPlano, error } = await supabase
        .from('obra_planejamentos')
        .insert({
          obra_id:    obraId,
          nome:       'Planejamento v1',
          versao:     1,
          status:     'rascunho',
          criado_por: usuario?.id,
        })
        .select()
        .single()
      if (error) throw error
      planoId = novoPlano.id
    }

    if (modo === 'substituir') {
      await supabase.from('planejamento_eap').delete().eq('planejamento_id', planoId)
    }

    const mapaId = {}
    for (const [idx, item] of itens.entries()) {
      const parentId = item.parentCodigo ? mapaId[item.parentCodigo] : null
      const { data, error } = await supabase
        .from('planejamento_eap')
        .insert({
          planejamento_id: planoId,
          codigo:          item.codigo,
          nome:            item.nome,
          nivel:           item.nivel,
          tipo:            item.tipo,
          parent_id:       parentId || null,
          hierarquia:      item.codigo,
          ordem:           idx,
        })
        .select('id')
        .single()
      if (error) throw error
      mapaId[item.codigo] = data.id

      if (item.tipo === 'S') {
        await supabase.from('planejamento_atividades').insert({
          eap_item_id:      data.id,
          planejamento_id:  planoId,
          nome:             item.nome,
          criterio_medicao: 'ZERO_CEM',
          status:           'nao_iniciada',
          quantidade:       item.quantidade  ?? null,
          unidade:          item.unidade     ?? null,
          duracao_dias:     item.duracao_dias ?? null,
          criado_por:       usuario?.id,
        })
      }
    }

    setMsgSucesso(`EAP importada com sucesso — ${itens.length} itens!`)
    setTimeout(() => setMsgSucesso(''), 4000)
    await carregar()
  }

  // ── Adicionar item manualmente ───────────────────────────────────────────────
  async function handleAdicionarItem({ tipo, codigo, nome, nivel, parentId, duracao_dias, data_inicio_prevista, peso_percentual, valor_orcado, ordem }) {
    let planoId = planejamento?.id

    if (!planoId) {
      const { data: novoPlano, error } = await supabase
        .from('obra_planejamentos')
        .insert({
          obra_id:    obraId,
          nome:       'Planejamento v1',
          versao:     1,
          status:     'rascunho',
          criado_por: usuario?.id,
        })
        .select()
        .single()
      if (error) throw error
      planoId = novoPlano.id
    }

    const { data: novoItem, error: eapErr } = await supabase
      .from('planejamento_eap')
      .insert({
        planejamento_id: planoId,
        codigo,
        nome,
        nivel,
        tipo,
        parent_id:       parentId || null,
        hierarquia:      codigo,
        ordem:           ordem ?? 0,
        peso_percentual: peso_percentual != null ? Number(peso_percentual) : null,
        valor_orcado:    valor_orcado    != null ? Number(valor_orcado)    : null,
      })
      .select('id')
      .single()

    if (eapErr) throw eapErr

    if (tipo === 'S') {
      const atvPayload = {
        eap_item_id:      novoItem.id,
        planejamento_id:  planoId,
        nome,
        criterio_medicao: 'ZERO_CEM',
        status:           'nao_iniciada',
        criado_por:       usuario?.id,
      }
      if (duracao_dias)         atvPayload.duracao_dias         = Number(duracao_dias)
      if (data_inicio_prevista) atvPayload.data_inicio_prevista = data_inicio_prevista

      const { error: atvErr } = await supabase
        .from('planejamento_atividades')
        .insert(atvPayload)
      if (atvErr) throw atvErr
    }

    setMsgSucesso(`"${nome}" adicionado à EAP!`)
    setTimeout(() => setMsgSucesso(''), 3000)
    setModalNovoItem(false)
    await carregar()
  }

  // ── Salvar campos do cronograma (em lote) ───────────────────────────────────
  async function handleSalvarTudo() {
    const entradas = Object.entries(pendingForms)
    if (!entradas.length) return
    setSalvandoTudo(true)
    try {
      for (const [eapId, form] of entradas) {
        await handleSalvarAtividade(eapId, form)
      }
      setMsgSucesso(`${entradas.length} atividade(s) salva(s)!`)
      setTimeout(() => setMsgSucesso(''), 3000)
      await carregar()
    } catch (err) {
      alert(err.message)
    } finally {
      setSalvandoTudo(false)
    }
  }

  // ── Salvar progresso (em lote) ───────────────────────────────────────────────
  async function handleSalvarProgresso() {
    const entradas = Object.entries(pendingProgresso)
    if (!entradas.length) return
    setSalvandoProgresso(true)

    const hoje = new Date().toISOString().slice(0, 10)
    const atvMap = {}
    eap.forEach(e => { if (e.atividade_id) atvMap[e.atividade_id] = e })

    try {
      await Promise.all(
        entradas.map(([atvId, p]) => {
          let statusFinal = p.status
          if (statusFinal !== 'concluida') {
            const atv        = atvMap[atvId] || {}
            const fimPrev    = atv.data_fim_prevista    || ''
            const inicioPrev = atv.data_inicio_prevista || ''
            if (p.data_real_fim    && fimPrev    && p.data_real_fim    > fimPrev)    statusFinal = 'atrasada'
            if (p.data_real_inicio && inicioPrev && p.data_real_inicio > inicioPrev) statusFinal = 'atrasada'
            if (fimPrev && hoje > fimPrev && statusFinal !== 'nao_iniciada')          statusFinal = 'atrasada'
          }
          return supabase
            .from('planejamento_atividades')
            .update({
              peso_realizado_perc: p.pct != null ? Number(p.pct) : null,
              status:              statusFinal,
              data_real_inicio:    p.data_real_inicio || null,
              data_real_fim:       p.data_real_fim    || null,
              obs_execucao:        p.obs              || null,
            })
            .eq('id', atvId)
        })
      )
      setMsgSucesso(`Progresso de ${entradas.length} atividade(s) salvo!`)
      setTimeout(() => setMsgSucesso(''), 3000)
      await carregar()
    } catch (err) {
      alert('Erro ao salvar progresso: ' + err.message)
    } finally {
      setSalvandoProgresso(false)
    }
  }

  // ── Salvar predecessoras e recalcular CPM ────────────────────────────────────
  async function handleSalvarPredecessoras(atividade_id, novasPreds) {
    if (!planejamento || !atividade_id) return
    setSalvandoPred(true)
    try {
      await supabase.from('planejamento_predecessoras').delete().eq('atividade_id', atividade_id)

      if (novasPreds.length > 0) {
        const { error: insErr } = await supabase
          .from('planejamento_predecessoras')
          .insert(novasPreds.map(p => ({
            atividade_id,
            predecessora_id: p.predecessora_id,
            tipo:            p.tipo,
            lag_dias:        p.lag_dias,
          })))
        if (insErr) throw insErr
      }

      const dataIni = planejamento?.data_base_assinada
        || eap
            .filter(i => i.tipo === 'S' && i.data_inicio_prevista)
            .sort((a, b) => a.data_inicio_prevista.localeCompare(b.data_inicio_prevista))[0]
            ?.data_inicio_prevista
        || new Date().toISOString().split('T')[0]

      await aplicarCPMNoSupabase(planejamento.id, dataIni, supabase)

      setMsgSucesso('Predecessoras salvas e CPM recalculado!')
      setTimeout(() => setMsgSucesso(''), 3000)
      setModalPred(null)
      await carregar()
    } catch (err) {
      alert('Erro ao salvar predecessoras: ' + err.message)
    } finally {
      setSalvandoPred(false)
    }
  }

  // ── Salvar atividade individual (usado pelo handleSalvarTudo) ───────────────
  async function handleSalvarAtividade(eapId, form) {
    const item = eap.find(i => i.id === eapId)
    if (!item?.atividade_id) return

    const { error: errAtv } = await supabase
      .from('planejamento_atividades')
      .update({
        duracao_dias:         form.duracao_dias         ? Number(form.duracao_dias) : null,
        data_inicio_prevista: form.data_inicio_prevista || null,
        data_fim_prevista:    form.data_fim_prevista    || null,
        criterio_medicao:     form.criterio_medicao     || null,
      })
      .eq('id', item.atividade_id)
    if (errAtv) throw new Error('Erro ao salvar atividade: ' + errAtv.message)

    // peso_percentual e valor_orcado ficam em planejamento_eap
    const eapUpdate = {}
    if (form.peso_percentual !== undefined && form.peso_percentual !== '')
      eapUpdate.peso_percentual = form.peso_percentual ? Number(form.peso_percentual) : null
    if (form.valor_orcado !== undefined && form.valor_orcado !== '')
      eapUpdate.valor_orcado = form.valor_orcado ? Number(form.valor_orcado) : null

    if (Object.keys(eapUpdate).length > 0) {
      const { error: errEap } = await supabase
        .from('planejamento_eap')
        .update(eapUpdate)
        .eq('id', eapId)
      if (errEap) throw new Error('Erro ao salvar peso/valor: ' + errEap.message)
    }
  }

  // ── Reordenar item (cima / baixo) dentro do mesmo nível ─────────────────────
  async function handleMoverItem(item, direcao) {
    // Irmãos visíveis no mesmo parent, respeitando a ordenação atual
    const irmaos = eap
      .filter(i => (i.parent_id || null) === (item.parent_id || null))
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.codigo.localeCompare(b.codigo))

    const idx    = irmaos.findIndex(i => i.id === item.id)
    const alvoIdx = direcao === 'cima' ? idx - 1 : idx + 1
    if (alvoIdx < 0 || alvoIdx >= irmaos.length) return

    // Reordena e reatribui ordem sequencial para evitar duplicatas
    const reordenados = [...irmaos]
    const [movido]    = reordenados.splice(idx, 1)
    reordenados.splice(alvoIdx, 0, movido)

    try {
      await Promise.all(
        reordenados.map((irmao, i) =>
          supabase.from('planejamento_eap').update({ ordem: i + 1 }).eq('id', irmao.id)
        )
      )
      // Atualiza estado local para resposta imediata (sem reload completo)
      setEap(prev => {
        const novo = [...prev]
        reordenados.forEach((irmao, i) => {
          const pos = novo.findIndex(x => x.id === irmao.id)
          if (pos !== -1) novo[pos] = { ...novo[pos], ordem: i + 1 }
        })
        // Re-sort para refletir a nova ordem na renderização
        return novo.sort((a, b) => {
          if ((a.parent_id || null) !== (b.parent_id || null)) return 0
          return (a.ordem ?? 0) - (b.ordem ?? 0) || a.codigo.localeCompare(b.codigo)
        })
      })
    } catch (err) {
      alert('Erro ao reordenar: ' + err.message)
    }
  }

  // ── Congelar baseline ────────────────────────────────────────────────────────
  async function handleCongelarBaseline() {
    if (!planejamento) return
    const ok = window.confirm(
      'Congelar baseline?\n\nAs datas atuais serão gravadas como referência permanente.\n' +
      'Após o congelamento, o cronograma só pode ser alterado por Reprogramação.\n\n' +
      'Esta ação é irreversível.'
    )
    if (!ok) return

    setCongelando(true)
    try {
      const { data: atvs, error: atvErr } = await supabase
        .from('planejamento_atividades')
        .select('id, data_inicio_prevista, data_fim_prevista, duracao_dias')
        .eq('planejamento_id', planejamento.id)
      if (atvErr) throw atvErr

      const lote = 20
      for (let i = 0; i < (atvs || []).length; i += lote) {
        await Promise.all(
          atvs.slice(i, i + lote).map(a =>
            supabase.from('planejamento_atividades').update({
              data_inicio_baseline: a.data_inicio_prevista,
              data_fim_baseline:    a.data_fim_prevista,
              duracao_baseline:     a.duracao_dias,
            }).eq('id', a.id)
          )
        )
      }

      await supabase
        .from('obra_planejamentos')
        .update({
          baseline_congelada: true,
          data_congelamento:  new Date().toISOString(),
          congelado_por:      usuario?.id,
        })
        .eq('id', planejamento.id)

      setMsgSucesso('Baseline congelada! As datas originais estão preservadas como referência.')
      setTimeout(() => setMsgSucesso(''), 5000)
      await carregar()
    } catch (err) {
      console.error('[CongelarBaseline]', err)
      alert('Erro ao congelar: ' + err.message)
    } finally {
      setCongelando(false)
    }
  }

  // ── Excluir item (soft delete) ───────────────────────────────────────────────
  async function handleExcluirItem(itemId, itemNome) {
    if (!window.confirm(`Excluir "${itemNome}"?\n\nO item será removido da EAP.`)) return
    try {
      await supabase
        .from('planejamento_eap')
        .update({ deletado_em: new Date().toISOString(), deletado_por: usuario?.id })
        .eq('id', itemId)
      await carregar()
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  // ── Expand / collapse ────────────────────────────────────────────────────────
  function toggleExpandido(id) {
    setExpandidos(prev => {
      const novo = new Set(prev)
      novo.has(id) ? novo.delete(id) : novo.add(id)
      return novo
    })
  }

  function expandirTudo() {
    setExpandidos(new Set(eap.map(i => i.id)))
  }

  function recolherTudo() {
    // Mantém apenas os nós raiz expandidos (CC)
    setExpandidos(new Set(eap.filter(i => i.tipo === 'CC').map(i => i.id)))
  }

  // ── Recuar / Promover (toolbar) ──────────────────────────────────────────────

  /**
   * Recuar: item vira filho do seu anterior irmão mais próximo.
   * Respeita a hierarquia CC→E→SE→S.
   */
  async function handleRecuarItem() {
    const item = itemSelecionado
    if (!item) return

    const irmaos = eap
      .filter(i => (i.parent_id || null) === (item.parent_id || null))
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    const idx = irmaos.findIndex(i => i.id === item.id)
    if (idx === 0) return // Já é o primeiro — não tem onde recuar

    const novoPai = irmaos[idx - 1]
    // Valida hierarquia: tipo do novo pai deve ser o tipo pai esperado
    const TIPO_PAI_ESPERADO = { CC: null, E: 'CC', SE: 'E', S: 'SE' }
    if (TIPO_PAI_ESPERADO[item.tipo] !== novoPai.tipo) {
      alert(`Não é possível recuar: um(a) ${item.tipo} deve ter como pai um(a) ${TIPO_PAI_ESPERADO[item.tipo] || 'nenhum'}.`)
      return
    }

    // Calcula novo código e nova ordem
    const novoCodigo = gerarProximoCodigoLocal(novoPai.id)
    const filhosNovoPai = eap.filter(i => (i.parent_id || null) === novoPai.id)
    const novaOrdem     = filhosNovoPai.reduce((max, i) => Math.max(max, i.ordem ?? 0), 0) + 1

    try {
      await supabase.from('planejamento_eap')
        .update({ parent_id: novoPai.id, codigo: novoCodigo, ordem: novaOrdem })
        .eq('id', item.id)
      await carregar()
      setItemSelecionado(null)
    } catch (err) {
      alert('Erro ao recuar: ' + err.message)
    }
  }

  /**
   * Promover: item vira irmão do seu pai atual (um nível acima).
   */
  async function handlePromoverItem() {
    const item = itemSelecionado
    if (!item || !item.parent_id) return // Já é raiz

    const pai = eap.find(i => i.id === item.parent_id)
    if (!pai) return

    const novoParentId = pai.parent_id || null
    // Valida hierarquia
    const TIPO_PAI_ESPERADO = { CC: null, E: 'CC', SE: 'E', S: 'SE' }
    const tipoPaiEsperado = TIPO_PAI_ESPERADO[item.tipo]
    const novoPai         = novoParentId ? eap.find(i => i.id === novoParentId) : null
    if ((novoPai?.tipo || null) !== tipoPaiEsperado) {
      alert(`Não é possível promover: um(a) ${item.tipo} deve ter como pai um(a) ${tipoPaiEsperado || 'nenhum'}.`)
      return
    }

    const irmaosNovoPai = eap.filter(i => (i.parent_id || null) === novoParentId)
    const paiIdx        = irmaosNovoPai.findIndex(i => i.id === pai.id)
    const novaOrdem     = (irmaosNovoPai[paiIdx]?.ordem ?? 0) + 1
    const novoCodigo    = gerarProximoCodigoLocal(novoParentId)

    try {
      await supabase.from('planejamento_eap')
        .update({ parent_id: novoParentId, codigo: novoCodigo, ordem: novaOrdem })
        .eq('id', item.id)
      await carregar()
      setItemSelecionado(null)
    } catch (err) {
      alert('Erro ao promover: ' + err.message)
    }
  }

  // Helper local para gerar código sem importar do ModalNovoItemEAP
  function gerarProximoCodigoLocal(parentId) {
    const irmaos = eap.filter(i => (i.parent_id || null) === (parentId || null))
    const parent  = eap.find(i => i.id === parentId)
    if (!irmaos.length) return parent ? `${parent.codigo}.1` : '1'
    let maxSeq = 0
    for (const irmao of irmaos) {
      const partes = irmao.codigo.split('.')
      const seq = parseInt(partes[partes.length - 1], 10)
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
    }
    return parent ? `${parent.codigo}.${maxSeq + 1}` : String(maxSeq + 1)
  }

  // ── Árvore de itens visíveis ─────────────────────────────────────────────────
  function itensVisiveis() {
    const resultado = []
    function percorrer(parentId, profundidade) {
      const filhos = eap.filter(i => (i.parent_id || null) === (parentId || null))
      for (const item of filhos) {
        resultado.push({ item, profundidade })
        if (expandidos.has(item.id) && item.temFilhos) {
          percorrer(item.id, profundidade + 1)
        }
      }
    }
    percorrer(null, 0)
    return resultado
  }

  const visivel          = itensVisiveis()
  const baselineCongelada = planejamento?.baseline_congelada === true

  // Mapa atividade_id → item EAP (para exibir predecessoras)
  const atvIdToEap = {}
  for (const item of eap) {
    if (item.atividade_id) atvIdToEap[item.atividade_id] = item
  }

  // Informação de posição entre irmãos (para habilitar/desabilitar ↑↓)
  const siblingInfo = {}
  for (const { item } of visivel) {
    const irmaos = visivel
      .filter(v => (v.item.parent_id || null) === (item.parent_id || null))
      .map(v => v.item)
    const idx = irmaos.findIndex(i => i.id === item.id)
    siblingInfo[item.id] = {
      ehPrimeiro: idx === 0,
      ehUltimo:   idx === irmaos.length - 1,
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!obraId) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-slate-500">
      <AlertCircle size={32} className="mb-3 text-slate-300" />
      <p className="font-medium">Selecione uma obra no cabeçalho</p>
    </div>
  )

  return (
    <div className="p-6 space-y-5">

      {/* Modal predecessoras */}
      {modalPred && (
        <ModalPredecessoras
          item={modalPred}
          todasFolhas={eap.filter(i => i.tipo === 'S' && i.atividade_id)}
          predecessorasAtv={predecessoras.filter(p => p.atividade_id === modalPred.atividade_id)}
          salvando={salvandoPred}
          onSalvar={(novasPreds) => handleSalvarPredecessoras(modalPred.atividade_id, novasPreds)}
          onFechar={() => setModalPred(null)}
        />
      )}

      {/* Modal importar Excel */}
      {modalImport && (
        <ModalImportarEAP
          onFechar={() => setModalImport(false)}
          onConfirmar={handleImportarEAP}
          planejamentoId={planejamento?.id}
        />
      )}

      {/* Modal novo item manual */}
      {modalNovoItem && (
        <ModalNovoItemEAP
          eap={eap}
          planejamentoId={planejamento?.id}
          onConfirmar={handleAdicionarItem}
          onFechar={() => { setModalNovoItem(false); setTipoAddRapido(null) }}
          tipoInicial={tipoAddRapido}
        />
      )}

      {/* Modal parâmetros do Serviço (duplo clique) */}
      {modalParametros && (
        <ModalParametrosServico
          item={modalParametros}
          baselineCongelada={baselineCongelada}
          perm={perm}
          predecessorasAtv={predecessoras.filter(p => p.atividade_id === modalParametros.atividade_id)}
          atvIdToEap={atvIdToEap}
          onAbrirModalPred={(it) => { setModalParametros(null); setModalPred(it) }}
          onFechar={() => setModalParametros(null)}
          onSalvo={(campos) => {
            setEap(prev => prev.map(i => i.id === modalParametros.id ? { ...i, ...campos } : i))
          }}
        />
      )}

      {/* Alerta de sucesso */}
      {msgSucesso && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          {msgSucesso}
        </div>
      )}

      {/* Legenda CPM */}
      <LegendaCPM />

      {/* Cabeçalho com botões de ação */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
            Cronograma da Obra
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {obraAtual?.nome || 'Obra selecionada'}
            {planejamento && (
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: baselineCongelada ? '#f0fdf4' : '#fffbeb',
                  color:           baselineCongelada ? '#16a34a' : '#d97706',
                }}>
                {baselineCongelada ? '🔒 Baseline congelada' : `v${planejamento.versao} — ${planejamento.status}`}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">

          {/* Salvar Progresso */}
          {modoProgresso && Object.keys(pendingProgresso).length > 0 && (
            <button onClick={handleSalvarProgresso} disabled={salvandoProgresso}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#0891b2', color: '#fff' }}>
              {salvandoProgresso
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Save size={14} />}
              Salvar progresso ({Object.keys(pendingProgresso).length})
            </button>
          )}

          {/* Salvar Tudo */}
          {editando && !baselineCongelada && Object.keys(pendingForms).length > 0 && (
            <button onClick={handleSalvarTudo} disabled={salvandoTudo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#16a34a', color: '#fff' }}>
              {salvandoTudo
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Save size={14} />}
              Salvar tudo ({Object.keys(pendingForms).length})
            </button>
          )}

          {/* Expandir / Recolher tudo */}
          {eap.length > 0 && (
            <>
              <button onClick={expandirTudo} title="Expandir tudo"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                <ChevronsUpDown size={14} />
                <span className="hidden sm:inline">Expandir</span>
              </button>
              <button onClick={recolherTudo} title="Recolher tudo"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                <ChevronsDownUp size={14} />
                <span className="hidden sm:inline">Recolher</span>
              </button>
            </>
          )}

          {/* Adicionar item manualmente */}
          {editando && !baselineCongelada && perm.editar_cronograma && (
            <button onClick={() => setModalNovoItem(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-colors"
              style={{ borderColor: '#233772', color: '#233772' }}>
              <Plus size={14} />
              Adicionar Item
            </button>
          )}

          {/* Modo Edição */}
          {perm.editar_cronograma && (
            <button onClick={() => setEditando(!editando)}
              disabled={baselineCongelada}
              title={baselineCongelada ? 'Baseline congelada — não é possível editar' : ''}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={editando && !baselineCongelada
                ? { backgroundColor: '#233772', color: '#fff', borderColor: '#233772' }
                : { borderColor: '#e2e8f0', color: '#475569' }}>
              {editando ? 'Sair da edição' : 'Editar'}
            </button>
          )}

          {/* Modo Progresso */}
          {eap.length > 0 && perm.editar_cronograma && (
            <button onClick={() => { setModoProgresso(m => !m); setEditando(false) }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors"
              style={modoProgresso
                ? { backgroundColor: '#0891b2', color: '#fff', borderColor: '#0891b2' }
                : { borderColor: '#e2e8f0', color: '#475569' }}>
              {modoProgresso ? '✓ Sair do progresso' : '📊 Progresso'}
            </button>
          )}

          {/* Importar EAP */}
          {perm.importar_eap && (
            <button onClick={() => setModalImport(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#233772', color: '#fff' }}>
              <Upload size={14} /> Importar EAP
            </button>
          )}

          {/* Congelar Baseline */}
          {perm.congelar_baseline && planejamento && !baselineCongelada && (
            <button onClick={handleCongelarBaseline} disabled={congelando}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors"
              style={{ borderColor: '#d97706', color: '#d97706' }}>
              <Lock size={14} /> Congelar Baseline
            </button>
          )}
        </div>
      </div>

      {/* Painel de resumo — visível quando há EAP carregada */}
      {eap.length > 0 && (
        <PainelResumoCronograma
          eap={eap}
          aberto={painelAberto}
          onToggle={() => setPainelAberto(a => !a)}
        />
      )}

      {/* Tabela EAP */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin mx-auto mb-2" />
            Carregando EAP...
          </div>
        ) : eap.length === 0 ? (
          editando ? (
            <div className="p-10">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-green-600" />
                <p className="font-semibold text-green-900 mb-2">Modo de Edição Ativado</p>
                <p className="text-sm text-green-700 mb-4">
                  Importe uma EAP via Excel ou adicione itens manualmente.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button onClick={() => setModalImport(true)}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: '#233772' }}>
                    📄 Importar do Excel
                  </button>
                  <button onClick={() => setModalNovoItem(true)}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: '#10b981' }}>
                    <Plus size={14} className="inline mr-1" />
                    Adicionar manualmente
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center">
              <Upload size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-600 mb-1">EAP não importada</p>
              <p className="text-sm text-slate-400 mb-6">
                Importe a Estrutura Analítica do Projeto a partir do Excel ou crie manualmente
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {perm.importar_eap && (
                  <button onClick={() => setModalImport(true)}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: '#233772' }}>
                    + Importar EAP
                  </button>
                )}
                {perm.editar_cronograma && (
                  <button onClick={() => setEditando(true)}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white border-2 transition-colors"
                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                    + Criar Manualmente
                  </button>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">WBS / Nome</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Dur.</th>
                  {!modoProgresso && <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Pred.</th>}
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">
                    {modoProgresso ? 'Início Prev.' : 'Início'}
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">
                    {modoProgresso ? 'Fim Prev.' : 'Fim'}
                  </th>
                  {modoProgresso ? (
                    <>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-cyan-600 uppercase tracking-wide w-24">Início Real</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-cyan-600 uppercase tracking-wide w-24">Fim Real</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-cyan-600 uppercase tracking-wide w-20">% Conc.</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-cyan-600 uppercase tracking-wide w-28">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Peso%</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Valor Orç.</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">% Realizado</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Status</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">CPM</th>
                    </>
                  )}
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {visivel.map(({ item, profundidade }) => (
                  <LinhaEAP
                    key={item.id}
                    item={item}
                    expandido={expandidos.has(item.id)}
                    onToggle={toggleExpandido}
                    editando={editando}
                    onSalvar={handleSalvarAtividade}
                    onExcluir={handleExcluirItem}
                    perm={perm}
                    profundidade={profundidade}
                    baselineCongelada={baselineCongelada}
                    predecessorasAtv={predecessoras.filter(p => p.atividade_id === item.atividade_id)}
                    atvIdToEap={atvIdToEap}
                    onAbrirModalPred={setModalPred}
                    pendingForm={pendingForms[item.id]}
                    onFormChange={(id, form) => setPendingForms(prev => ({ ...prev, [id]: form }))}
                    modoProgresso={modoProgresso}
                    pendingProgresso={pendingProgresso[item.atividade_id]}
                    onProgressoChange={(atvId, p) => setPendingProgresso(prev => ({ ...prev, [atvId]: p }))}
                    ehPrimeiro={siblingInfo[item.id]?.ehPrimeiro ?? true}
                    ehUltimo={siblingInfo[item.id]?.ehUltimo ?? true}
                    onMoverCima={() => handleMoverItem(item, 'cima')}
                    onMoverBaixo={() => handleMoverItem(item, 'baixo')}
                    onAbrirParametros={(it) => setModalParametros(it)}
                    itemSelecionadoId={itemSelecionado?.id}
                    onSelecionar={(it) => setItemSelecionado(prev => prev?.id === it.id ? null : it)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toolbar flutuante de edição rápida */}
      {editando && !baselineCongelada && (
        <ToolbarEAP
          itemSelecionado={itemSelecionado}
          baselineCongelada={baselineCongelada}
          perm={perm}
          onAddTipo={(tipo) => { setTipoAddRapido(tipo); setModalNovoItem(true) }}
          onRecuar={handleRecuarItem}
          onPromover={handlePromoverItem}
          onMoverCima={() => itemSelecionado && handleMoverItem(itemSelecionado, 'cima')}
          onMoverBaixo={() => itemSelecionado && handleMoverItem(itemSelecionado, 'baixo')}
          onExcluir={() => itemSelecionado && handleExcluirItem(itemSelecionado.id)}
        />
      )}

      {/* Gantt Estratégico */}
      {eap.length > 0 && (
        <GanttEstrategico
          eap={eap}
          predecessoras={predecessoras}
          baselineCongelada={baselineCongelada}
          onClickItem={(item) => {
            const el = document.getElementById(`eap-row-${item.id}`)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        />
      )}
    </div>
  )
}
