import { supabase } from './client';

export interface SolucaoReuniao {
  text: string;
  responsible: string;
  idealizer?: string;
  status: 'Parado' | 'Em andamento' | 'Concluída';
}

export interface CardMembroReuniao {
  name: string;
  problem: string;
  solutions: SolucaoReuniao[];
}

export interface ReuniaoSemanal {
  id: string;
  titulo: string;
  data: string;
  resumo: string;
  dados: CardMembroReuniao[];
  criado_em: string;
  atualizado_em: string;
}

export const comercialReunioesRepository = {
  async listar(): Promise<ReuniaoSemanal[]> {
    const { data, error } = await supabase
      .from('comercial_reunioes')
      .select('*')
      .order('data', { ascending: false });

    if (error) {
      console.error('[ReunioesRepository] erro ao listar:', error);
      return [];
    }
    return data || [];
  },

  async upsert(dados: Partial<ReuniaoSemanal>): Promise<ReuniaoSemanal> {
    const payload = {
      ...dados,
      atualizado_em: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('comercial_reunioes')
      .upsert(payload, { onConflict: 'id' } as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('comercial_reunioes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

