import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Save,
  ArrowLeft,
  Plus,
  Settings2,
  Building2,
  Calculator,
  AlertCircle,
  Printer,
  FileEdit,
} from 'lucide-react'
import {
  planilhaRepository,
  calcularBDI,
  issParaMunicipio,
  ISS_MUNICIPIOS,
  type PlanilhaOrcamentaria,
  type NivelItem,
} from '../infrastructure/supabase/planilhaOrcamentariaRepository'
import { clientesRepository, type ClienteSupabase } from '../infrastructure/supabase/clientesRepository'
import {
  fmt, fmtPct, gerarId, proximoNumeroItem,
  PLANILHA_DEFAULTS, InputField,
  type ItemLocal, type TabAtiva,
} from '../components/planilha/planilhaTypes'
import { BDIPanel } from '../components/planilha/PlanilhaBDIPanel'
import { HierarquiaBloco } from '../components/planilha/PlanilhaHierarquia'
import { ResumoTab } from '../components/planilha/PlanilhaResumo'

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CriarPlanilha() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isNova = !id || id === 'nova'

  const [planilha, setPlanilha] = useState<PlanilhaOrcamentaria>({
    ...PLANILHA_DEFAULTS,
    id: '',
    numero: (location.state as { numero?: string })?.numero ?? 'PO-??????-????',
    nome_obra: '',
    cliente_id: null,
    criado_em: '',
    atualizado_em: '',
  } as PlanilhaOrcamentaria)

  const [itens, setItens] = useState<ItemLocal[]>([])
  const [clientes, setClientes] = useState<ClienteSupabase[]>([])
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('planilha')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(!isNova)
  const salvoRef = useRef(false)

  // Load clientes
  useEffect(() => {
    clientesRepository.listarTodos().then(setClientes).catch(console.error)
  }, [])

  // Load planilha if editing
  useEffect(() => {
    if (isNova) {
      setLoading(false)
      return
    }
    planilhaRepository
      .buscarPorId(id!)
      .then((data) => {
        if (!data) { navigate('/planilha-orcamentaria'); return }
        const { itens: itensDB, ...header } = data
        setPlanilha(header as PlanilhaOrcamentaria)
        setItens(itensDB.map((i) => ({ ...i, _tempId: undefined })))
      })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setLoading(false))
  }, [id, isNova, navigate])

  // Auto-set ISS when municipio changes
  const handleMunicipioChange = useCallback((municipio: string) => {
    const iss = issParaMunicipio(municipio)
    setPlanilha((prev) => ({ ...prev, municipio, bdi_iss: iss }))
  }, [])

  const updateCampo = useCallback((campo: string, valor: string | number | boolean | null) => {
    setPlanilha((prev) => ({ ...prev, [campo]: valor }))
  }, [])

  // Items management
  const addCC = useCallback(() => {
    const num = proximoNumeroItem(itens, 'CC', '')
    const novo: ItemLocal = {
      id: '',
      _tempId: gerarId(),
      nivel: 'CC',
      numero_item: num,
      descricao: '',
      unidade: null,
      quantidade: 1,
      preco_unit_material: 0,
      preco_unit_mo: 0,
      is_verba: false,
      verba_pct: 0,
      ordem: itens.length,
    }
    setItens((prev) => [...prev, novo])
  }, [itens])

  const addFilho = useCallback((parentNum: string, nivelPai: NivelItem | 'SE_verba') => {
    const isVerba = nivelPai === 'SE_verba'
    const nivelMap: Record<string, NivelItem> = {
      CC: 'E',
      E: 'SE',
      SE: 'S',
      SE_verba: 'S',
    }
    const nivelFilho = nivelMap[nivelPai] as NivelItem
    const num = proximoNumeroItem(itens, nivelFilho, parentNum)
    const novo: ItemLocal = {
      id: '',
      _tempId: gerarId(),
      nivel: nivelFilho,
      numero_item: num,
      descricao: '',
      unidade: nivelFilho === 'S' ? 'un' : null,
      quantidade: 1,
      preco_unit_material: 0,
      preco_unit_mo: 0,
      is_verba: isVerba,
      verba_pct: isVerba ? 5 : 0,
      ordem: itens.length,
    }
    setItens((prev) => [...prev, novo])
  }, [itens])

  const updateItem = useCallback((itemId: string, campo: string, valor: string | number | boolean) => {
    setItens((prev) =>
      prev.map((i) => {
        const match = (i.id && i.id === itemId) || (i._tempId && i._tempId === itemId)
        return match ? { ...i, [campo]: valor } : i
      })
    )
  }, [])

  const deleteItem = useCallback((itemId: string) => {
    setItens((prev) => {
      const item = prev.find((i) => (i.id && i.id === itemId) || (i._tempId && i._tempId === itemId))
      if (!item) return prev
      return prev.filter((i) => {
        const id2 = i.id || i._tempId || ''
        const isTarget = id2 === itemId
        const isChild = i.numero_item.startsWith(item.numero_item + '.')
        return !isTarget && !isChild
      })
    })
  }, [])

  const salvar = async () => {
    if (!planilha.nome_obra.trim()) {
      setErro('Nome da obra é obrigatório.')
      setTabAtiva('cabecalho')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      let planilhaId = planilha.id

      // Calculate totals
      const sItens = itens.filter((i) => i.nivel === 'S' && !i.is_verba)
      const totalMat = sItens.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
      const totalMO = sItens.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
      // Verbas
      const SEs = itens.filter((i) => i.nivel === 'SE')
      let totalVerba = 0
      for (const se of SEs) {
        const sNaoVerba = itens.filter(
          (i) => i.nivel === 'S' && !i.is_verba && i.numero_item.startsWith(se.numero_item + '.')
        )
        const seBase = sNaoVerba.reduce((a, i) => a + i.quantidade * (i.preco_unit_material + i.preco_unit_mo), 0)
        const verbas = itens.filter((i) => i.nivel === 'S' && i.is_verba && i.numero_item.startsWith(se.numero_item + '.'))
        totalVerba += verbas.reduce((a, v) => a + (v.verba_pct / 100) * seBase, 0)
      }
      const totalGeral = totalMat + totalMO + totalVerba
      const bdi = calcularBDI(planilha)
      const totalComBDI = totalGeral * (1 + bdi / 100)

      const header = {
        numero: planilha.numero,
        revisao: planilha.revisao,
        tipo: planilha.tipo,
        status: planilha.status,
        cliente_id: planilha.cliente_id,
        nome_obra: planilha.nome_obra,
        objeto: planilha.objeto,
        municipio: planilha.municipio,
        condicoes_pagamento: planilha.condicoes_pagamento,
        prazo_execucao: planilha.prazo_execucao,
        data_proposta: planilha.data_proposta,
        responsavel: planilha.responsavel,
        faturamento_direto: planilha.faturamento_direto,
        observacoes: planilha.observacoes,
        bdi_ac: planilha.bdi_ac,
        bdi_riscos: planilha.bdi_riscos,
        bdi_cf: planilha.bdi_cf,
        bdi_seguros: planilha.bdi_seguros,
        bdi_garantias: planilha.bdi_garantias,
        bdi_lucro: planilha.bdi_lucro,
        bdi_pis: planilha.bdi_pis,
        bdi_cofins: planilha.bdi_cofins,
        bdi_irpj: planilha.bdi_irpj,
        bdi_csll: planilha.bdi_csll,
        bdi_iss: planilha.bdi_iss,
        total_material: totalMat,
        total_mo: totalMO,
        total_geral: totalGeral,
        total_com_bdi: totalComBDI,
      }

      if (isNova || !planilhaId) {
        const nova = await planilhaRepository.criar(header)
        planilhaId = nova.id
        setPlanilha((prev) => ({ ...prev, id: planilhaId }))
        salvoRef.current = true
      } else {
        await planilhaRepository.atualizar(planilhaId, header)
      }

      // Save items
      const itensParaSalvar = itens.map((item, idx) => ({
        planilha_id: planilhaId,
        nivel: item.nivel,
        numero_item: item.numero_item,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        preco_unit_material: item.preco_unit_material,
        preco_unit_mo: item.preco_unit_mo,
        is_verba: item.is_verba,
        verba_pct: item.verba_pct,
        ordem: idx,
      }))

      const itensDb = await planilhaRepository.salvarItens(planilhaId, itensParaSalvar)
      setItens(itensDb.map((i) => ({ ...i, _tempId: undefined })))

      // Navigate to edit page if was new
      if (isNova) {
        navigate(`/planilha-orcamentaria/${planilhaId}`, { replace: true })
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const TABS: { key: TabAtiva; label: string; icon: React.ElementType }[] = [
    { key: 'planilha', label: 'Planilha', icon: FileEdit },
    { key: 'cabecalho', label: 'Cabeçalho', icon: Building2 },
    { key: 'bdi', label: 'BDI', icon: Calculator },
    { key: 'resumo', label: 'Resumo', icon: Settings2 },
  ]

  const bdi = calcularBDI(planilha)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
        <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
        <span>Carregando planilha...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/planilha-orcamentaria')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-blue-600">{planilha.numero}</span>
              <span className="text-xs text-slate-400">R{planilha.revisao}</span>
              <select
                value={planilha.status}
                onChange={(e) => updateCampo('status', e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="rascunho">Rascunho</option>
                <option value="emitido">Emitido</option>
                <option value="aprovado">Aprovado</option>
                <option value="cancelado">Cancelado</option>
              </select>
              {planilha.nome_obra && (
                <span className="text-sm text-slate-700 truncate hidden sm:block max-w-[200px]">
                  {planilha.nome_obra}
                </span>
              )}
            </div>
          </div>

          {/* BDI badge */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-600">
            <Calculator size={12} />
            BDI: {fmtPct(bdi)}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <Save size={14} />
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {erro && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            <AlertCircle size={13} />
            {erro}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-4">
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTabAtiva(key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
                tabAtiva === key
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {/* Planilha Tab */}
        {tabAtiva === 'planilha' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">
                Editor de Planilha — Hierarquia CC → E → SE → S
              </h2>
              <button
                onClick={addCC}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} />
                + CC
              </button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
              <HierarquiaBloco
                itens={itens}
                onUpdate={updateItem}
                onDelete={deleteItem}
                onAddFilho={addFilho}
              />
            </div>

            {/* Grand total bar */}
            {itens.some((i) => i.nivel === 'S') && (() => {
              const sItens = itens.filter((i) => i.nivel === 'S' && !i.is_verba)
              const mat = sItens.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
              const mo = sItens.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
              const total = mat + mo
              const comBDI = total * (1 + bdi / 100)
              return (
                <div className="mt-3 flex items-center justify-end gap-6 px-4 py-3 bg-slate-800 text-white rounded-lg text-sm">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Material</p>
                    <p className="font-semibold">{fmt(mat)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Mão de Obra</p>
                    <p className="font-semibold">{fmt(mo)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Total s/ BDI</p>
                    <p className="font-semibold">{fmt(total)}</p>
                  </div>
                  <div className="text-center bg-blue-600 rounded-lg px-4 py-1.5">
                    <p className="text-xs text-blue-200">Total c/ BDI ({fmtPct(bdi)})</p>
                    <p className="font-bold text-lg">{fmt(comBDI)}</p>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Cabeçalho Tab */}
        {tabAtiva === 'cabecalho' && (
          <div className="p-4 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Número da Proposta"
                value={planilha.numero}
                onChange={(v) => updateCampo('numero', v)}
                className="sm:col-span-1"
              />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select
                  value={planilha.tipo}
                  onChange={(e) => updateCampo('tipo', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PO">PO — Planilha Orçamentária</option>
                  <option value="PTC">PTC — Proposta Técnico-Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cliente</label>
                <select
                  value={planilha.cliente_id ?? ''}
                  onChange={(e) => updateCampo('cliente_id', e.target.value || null)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <InputField
                label="Nome da Obra / Projeto"
                value={planilha.nome_obra}
                onChange={(v) => updateCampo('nome_obra', v)}
                required
                placeholder="Ex: Instalações elétricas — Galpão A"
              />

              <InputField
                label="Objeto / Escopo Resumido"
                value={planilha.objeto ?? ''}
                onChange={(v) => updateCampo('objeto', v)}
                placeholder="Descrição do escopo..."
                className="sm:col-span-2"
              />

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Município</label>
                <select
                  value={planilha.municipio ?? ''}
                  onChange={(e) => handleMunicipioChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar município...</option>
                  {Object.keys(ISS_MUNICIPIOS).map((m) => (
                    <option key={m} value={m}>{m} (ISS {ISS_MUNICIPIOS[m]}%)</option>
                  ))}
                  <option value="Outros">Outros (ISS 5%)</option>
                </select>
              </div>

              <InputField
                label="Data da Proposta"
                value={planilha.data_proposta ?? ''}
                onChange={(v) => updateCampo('data_proposta', v)}
                type="date"
              />

              <InputField
                label="Prazo de Execução"
                value={planilha.prazo_execucao ?? ''}
                onChange={(v) => updateCampo('prazo_execucao', v)}
                placeholder="Ex: 60 dias corridos"
              />

              <InputField
                label="Condições de Pagamento"
                value={planilha.condicoes_pagamento ?? ''}
                onChange={(v) => updateCampo('condicoes_pagamento', v)}
                placeholder="Ex: 30/60/90 dias"
              />

              <InputField
                label="Responsável"
                value={planilha.responsavel ?? ''}
                onChange={(v) => updateCampo('responsavel', v)}
                placeholder="Nome do engenheiro responsável"
              />

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea
                  value={planilha.observacoes ?? ''}
                  onChange={(e) => updateCampo('observacoes', e.target.value)}
                  rows={3}
                  placeholder="Observações gerais..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planilha.faturamento_direto}
                    onChange={(e) => updateCampo('faturamento_direto', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">
                    Faturamento direto de materiais
                    <span className="text-xs text-slate-400 ml-1">(materiais faturados diretamente pelo fornecedor, não entram na NF da Biasi)</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* BDI Tab */}
        {tabAtiva === 'bdi' && (
          <div className="p-4 max-w-3xl">
            <BDIPanel
              planilha={planilha}
              onChange={(campo, valor) => updateCampo(campo, valor)}
            />
          </div>
        )}

        {/* Resumo Tab */}
        {tabAtiva === 'resumo' && (
          <div className="p-4">
            <ResumoTab planilha={planilha} itens={itens} />
          </div>
        )}
      </div>
    </div>
  )
}
