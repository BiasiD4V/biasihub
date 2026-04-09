import { supabase } from './client';

export interface BiraTarefa {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  status: 'ideia' | 'a_fazer' | 'em_andamento' | 'em_analise' | 'concluido';
  prioridade: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  tipo: 'epic' | 'feature' | 'tarefa' | 'historia' | 'bug' | 'recurso' | 'subtask';
  responsavel_id: string | null;
  responsavel_nome: string | null;
  criador_id: string | null;
  criador_nome: string | null;
  parent_id: string | null;
  data_inicio: string | null;
  data_limite: string | null;
  etiquetas: string[];
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

export interface BiraComentario {
  id: string;
  tarefa_id: string;
  autor_id: string | null;
  autor_nome: string;
  autor_avatar: string | null;
  corpo: string;
  criado_em: string;
}

export const biraRepository = {
  async listarTodas(): Promise<BiraTarefa[]> {
    const { data, error } = await supabase
      .from('bira_tarefas')
      .select('*')
      .order('ordem', { ascending: true })
      .order('criado_em', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async buscarDetalhe(id: string): Promise<BiraTarefa & { comentarios: BiraComentario[] }> {
    const { data: tarefa, error: errorTarefa } = await supabase
      .from('bira_tarefas')
      .select('*')
      .eq('id', id)
      .single();

    if (errorTarefa) throw errorTarefa;

    const { data: comentarios, error: errorComentarios } = await supabase
      .from('bira_comentarios')
      .select('*')
      .eq('tarefa_id', id)
      .order('criado_em', { ascending: true });

    if (errorComentarios) throw errorComentarios;

    return { ...tarefa, comentarios: comentarios || [] };
  },

  async criar(dados: Partial<BiraTarefa>): Promise<BiraTarefa> {
    const { data, error } = await supabase
      .from('bira_tarefas')
      .insert(dados)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async atualizar(id: string, dados: Partial<BiraTarefa>): Promise<BiraTarefa> {
    const { data, error } = await supabase
      .from('bira_tarefas')
      .update(dados)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('bira_tarefas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async adicionarComentario(dados: Partial<BiraComentario>): Promise<BiraComentario> {
    const { data, error } = await supabase
      .from('bira_comentarios')
      .insert(dados)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Realtime subscription helper
  subscribe(callback: () => void) {
    return supabase
      .channel('bira_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bira_tarefas' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bira_comentarios' }, callback)
      .subscribe();
  }
};
