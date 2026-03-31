import { supabase } from './client'

export interface InclusoExclusoSupabase {
  id: string
  obra: string
  servico: string
  tipo: 'incluso' | 'excluso'
  padrao: boolean
  motivo: string | null
  observacao: string | null
  criado_em: string
  atualizado_em: string
}

const LS_KEY = 'biasi_incluso_excluso'

function lsGet(): InclusoExclusoSupabase[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function lsSet(items: InclusoExclusoSupabase[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

export const inclusoExclusoRepository = {
  async listarTodos(): Promise<InclusoExclusoSupabase[]> {
    try {
      const { data, error } = await supabase
        .from('incluso_excluso')
        .select('*')
        .order('obra', { ascending: true })
      if (error) throw error
      if (data && data.length > 0) return data
    } catch { /* fallback */ }
    return lsGet()
  },

  async criar(item: Omit<InclusoExclusoSupabase, 'id' | 'criado_em' | 'atualizado_em'>): Promise<InclusoExclusoSupabase> {
    try {
      const { data, error } = await supabase
        .from('incluso_excluso')
        .insert(item)
        .select()
        .single()
      if (error) throw error
      return data
    } catch { /* fallback localStorage */ }
    const now = new Date().toISOString()
    const novo: InclusoExclusoSupabase = { ...item, id: crypto.randomUUID(), criado_em: now, atualizado_em: now }
    const all = lsGet()
    all.push(novo)
    lsSet(all)
    return novo
  },

  async atualizar(id: string, item: Partial<InclusoExclusoSupabase>): Promise<InclusoExclusoSupabase> {
    try {
      const { data, error } = await supabase
        .from('incluso_excluso')
        .update({ ...item, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    } catch { /* fallback localStorage */ }
    const all = lsGet()
    const idx = all.findIndex(x => x.id === id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...item, atualizado_em: new Date().toISOString() }
      lsSet(all)
      return all[idx]
    }
    throw new Error('Item não encontrado')
  },

  async excluir(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('incluso_excluso').delete().eq('id', id)
      if (error) throw error
      return
    } catch { /* fallback localStorage */ }
    const all = lsGet().filter(x => x.id !== id)
    lsSet(all)
  },
}
