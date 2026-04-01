import { supabase } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NivelItem = 'CC' | 'E' | 'SE' | 'S'
export type StatusPlanilha = 'rascunho' | 'emitido' | 'aprovado' | 'cancelado'

export interface PlanilhaItem {
  id: string
  planilha_id: string
  nivel: NivelItem
  numero_item: string
  descricao: string
  unidade: string | null
  quantidade: number
  preco_unit_material: number
  preco_unit_mo: number
  is_verba: boolean
  verba_pct: number
  ordem: number
  criado_em: string
}

export interface PlanilhaOrcamentaria {
  id: string
  numero: string
  revisao: number
  tipo: string
  status: StatusPlanilha
  cliente_id: string | null
  nome_obra: string
  objeto: string | null
  municipio: string | null
  condicoes_pagamento: string | null
  prazo_execucao: string | null
  data_proposta: string | null
  responsavel: string | null
  faturamento_direto: boolean
  observacoes: string | null
  bdi_ac: number
  bdi_riscos: number
  bdi_cf: number
  bdi_seguros: number
  bdi_garantias: number
  bdi_lucro: number
  bdi_pis: number
  bdi_cofins: number
  bdi_irpj: number
  bdi_csll: number
  bdi_iss: number
  total_material: number
  total_mo: number
  total_geral: number
  total_com_bdi: number
  criado_em: string
  atualizado_em: string
  // from view join
  cliente_nome?: string | null
  cliente_cidade?: string | null
}

export interface PlanilhaComItens extends PlanilhaOrcamentaria {
  itens: PlanilhaItem[]
}

export interface NovaPlanilha {
  numero: string
  revisao?: number
  tipo: string
  status?: string
  cliente_id: string | null
  nome_obra: string
  objeto?: string | null
  municipio?: string | null
  condicoes_pagamento?: string | null
  prazo_execucao?: string | null
  data_proposta?: string | null
  responsavel?: string | null
  faturamento_direto?: boolean
  observacoes?: string | null
  bdi_ac?: number
  bdi_riscos?: number
  bdi_cf?: number
  bdi_seguros?: number
  bdi_garantias?: number
  bdi_lucro?: number
  bdi_pis?: number
  bdi_cofins?: number
  bdi_irpj?: number
  bdi_csll?: number
  bdi_iss?: number
  total_material?: number
  total_mo?: number
  total_geral?: number
  total_com_bdi?: number
}

// ─── BDI calculation ─────────────────────────────────────────────────────────

export function calcularBDI(p: PlanilhaOrcamentaria): number {
  const numerador =
    1 +
    p.bdi_ac / 100 +
    p.bdi_riscos / 100 +
    p.bdi_cf / 100 +
    p.bdi_seguros / 100 +
    p.bdi_garantias / 100 +
    p.bdi_lucro / 100
  const denominador =
    1 -
    p.bdi_pis / 100 -
    p.bdi_cofins / 100 -
    p.bdi_irpj / 100 -
    p.bdi_csll / 100 -
    p.bdi_iss / 100
  if (denominador <= 0) return 0
  return (numerador / denominador - 1) * 100
}

export function calcularTotaisItens(itens: PlanilhaItem[]): {
  total_material: number
  total_mo: number
  total_geral: number
} {
  const servicoItens = itens.filter((i) => i.nivel === 'S')
  let total_material = 0
  let total_mo = 0

  for (const item of servicoItens) {
    if (item.is_verba) {
      // verba: % sobre base de S irmãos não-verba — simplified: % over subtotal of non-verba S in same SE
      // For now, treat verba_pct as a fixed monetary addition (user enters the % manually)
      // The actual amount is calculated in the UI dynamically
    } else {
      total_material += item.quantidade * item.preco_unit_material
      total_mo += item.quantidade * item.preco_unit_mo
    }
  }

  return {
    total_material,
    total_mo,
    total_geral: total_material + total_mo,
  }
}

// ─── ISS by municipality ──────────────────────────────────────────────────────

export const ISS_MUNICIPIOS: Record<string, number> = {
  Louveira: 4,
  Campinas: 5,
  Jundiaí: 5,
  Vinhedo: 4,
  Santos: 2,
  'Santana de Parnaíba': 2,
  Indaiatuba: 3,
}

export function issParaMunicipio(municipio: string | null): number {
  if (!municipio) return 5
  return ISS_MUNICIPIOS[municipio] ?? 5
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const planilhaRepository = {
  async listarTodas(): Promise<PlanilhaOrcamentaria[]> {
    const { data, error } = await supabase
      .from('planilhas_orcamentarias_view')
      .select('*')
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data || []
  },

  async buscarPorId(id: string): Promise<PlanilhaComItens | null> {
    const { data: planilha, error: pe } = await supabase
      .from('planilhas_orcamentarias_view')
      .select('*')
      .eq('id', id)
      .single()
    if (pe) throw pe

    const { data: itens, error: ie } = await supabase
      .from('planilha_itens')
      .select('*')
      .eq('planilha_id', id)
      .order('ordem', { ascending: true })
    if (ie) throw ie

    return { ...planilha, itens: itens || [] }
  },

  async proximoNumero(): Promise<string> {
    // Get the max sequential from propostas
    const { data, error } = await supabase
      .from('propostas')
      .select('numero_composto')
      .not('numero_composto', 'is', null)
      .order('numero_composto', { ascending: false })
      .limit(1)

    let seq = 2249
    if (!error && data && data.length > 0) {
      const num = data[0].numero_composto as string
      // format is "YYYYMM-NNNN"
      const parts = num.split('-')
      if (parts.length === 2) {
        const parsed = parseInt(parts[1], 10)
        if (!isNaN(parsed)) seq = parsed
      }
    }

    const now = new Date()
    const yyyymm =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0')
    return `PO-${yyyymm}-${String(seq + 1).padStart(4, '0')}`
  },

  async criar(nova: NovaPlanilha): Promise<PlanilhaOrcamentaria> {
    const { data, error } = await supabase
      .from('planilhas_orcamentarias')
      .insert(nova)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizar(
    id: string,
    campos: Partial<PlanilhaOrcamentaria>
  ): Promise<void> {
    const { error } = await supabase
      .from('planilhas_orcamentarias')
      .update({ ...campos, atualizado_em: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('planilhas_orcamentarias')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ─── Items ──────────────────────────────────────────────────────────────────

  async salvarItens(planilhaId: string, itens: Omit<PlanilhaItem, 'id' | 'criado_em'>[]): Promise<PlanilhaItem[]> {
    // Delete all existing items and reinsert (simplest for reorder/delete handling)
    const { error: de } = await supabase
      .from('planilha_itens')
      .delete()
      .eq('planilha_id', planilhaId)
    if (de) throw de

    if (itens.length === 0) return []

    const { data, error } = await supabase
      .from('planilha_itens')
      .insert(itens.map((item) => ({ ...item, planilha_id: planilhaId })))
      .select()
    if (error) throw error
    return data || []
  },

  async atualizarTotais(
    id: string,
    totais: {
      total_material: number
      total_mo: number
      total_geral: number
      total_com_bdi: number
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('planilhas_orcamentarias')
      .update({ ...totais, atualizado_em: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async criarRevisao(planilhaId: string): Promise<PlanilhaOrcamentaria> {
    // Get original
    const original = await this.buscarPorId(planilhaId)
    if (!original) throw new Error('Planilha não encontrada')

    // Create copy with incremented revisao
    const { id: _id, criado_em: _c, atualizado_em: _a, itens, cliente_nome: _cn, cliente_cidade: _cc, ...campos } = original
    const nova = await this.criar({
      ...campos,
      revisao: (campos.revisao ?? 0) + 1,
    })

    // Copy items
    if (itens.length > 0) {
      const itensCopia = itens.map(({ id: _iid, criado_em: _ic, planilha_id: _pid, ...item }) => ({
        ...item,
        planilha_id: nova.id,
      }))
      await supabase.from('planilha_itens').insert(itensCopia)
    }

    return nova
  },
}
