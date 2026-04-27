import { supabase } from './client';

export type TipoEvento = 'visita' | 'reuniao' | 'obra' | 'viagem' | 'compromisso' | 'pessoal' | 'ferias';
export type StatusEvento = 'agendado' | 'concluido' | 'cancelado' | 'transferido';

export interface AgendaEvento {
  id: string;
  criador_id: string;
  responsavel_id: string;
  responsavel_original_id: string | null;
  titulo: string;
  descricao: string | null;
  local: string | null;
  data_inicio: string;
  data_fim: string;
  tipo: TipoEvento;
  cor: string;
  proposta_id: string | null;
  participantes: string[];
  acompanhantes: string[];
  status: StatusEvento;
  transferido_para: string | null;
  transferido_em: string | null;
  motivo_transferencia: string | null;
  criado_em: string;
  atualizado_em: string;
  // campos JOIN (opcionais)
  responsavel_nome?: string;
  criador_nome?: string;
}

export interface NovoEvento {
  titulo: string;
  descricao?: string | null;
  local?: string | null;
  data_inicio: string;
  data_fim: string;
  tipo?: TipoEvento;
  cor?: string;
  responsavel_id?: string;   // se omitido, usa o criador
  participantes?: string[];
  acompanhantes?: string[];
  proposta_id?: string | null;
}

export const agendaRepository = {
  async listar(opts: { inicio?: string; fim?: string; userId?: string } = {}): Promise<AgendaEvento[]> {
    let query = supabase
      .from('agenda_eventos')
      .select(`
        *,
        responsavel:usuarios!agenda_eventos_responsavel_id_fkey(nome),
        criador:usuarios!agenda_eventos_criador_id_fkey(nome)
      `)
      .order('data_inicio', { ascending: true });

    if (opts.inicio) query = query.gte('data_inicio', opts.inicio);
    if (opts.fim) query = query.lte('data_inicio', opts.fim);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...row,
      responsavel_nome: row.responsavel?.nome,
      criador_nome: row.criador?.nome,
    }));
  },

  async criar(dados: NovoEvento, criadorId: string): Promise<AgendaEvento> {
    const payload = {
      criador_id: criadorId,
      responsavel_id: dados.responsavel_id || criadorId,
      responsavel_original_id: dados.responsavel_id || criadorId,
      titulo: dados.titulo,
      descricao: dados.descricao || null,
      local: dados.local || null,
      data_inicio: dados.data_inicio,
      data_fim: dados.data_fim,
      tipo: dados.tipo || 'compromisso',
      cor: dados.cor || '#3b82f6',
      participantes: dados.participantes || [],
      acompanhantes: dados.acompanhantes || [],
      proposta_id: dados.proposta_id || null,
    };

    const { data, error } = await supabase
      .from('agenda_eventos')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async atualizar(id: string, dados: Partial<NovoEvento> & { status?: StatusEvento }): Promise<void> {
    const { error } = await supabase.from('agenda_eventos').update(dados).eq('id', id);
    if (error) throw error;
  },

  async excluir(id: string): Promise<void> {
    const { error } = await supabase.from('agenda_eventos').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Transfere o evento pra outro usuário. Registra trilha em transferido_para.
   */
  async transferir(id: string, novoResponsavelId: string, motivo?: string): Promise<void> {
    // Pega o atual responsável antes de transferir
    const { data: atual } = await supabase
      .from('agenda_eventos')
      .select('responsavel_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('agenda_eventos')
      .update({
        responsavel_id: novoResponsavelId,
        transferido_para: novoResponsavelId,
        transferido_em: new Date().toISOString(),
        motivo_transferencia: motivo || null,
        // Mantém o responsavel_original_id se já existir; senão, registra o que está sendo transferido
        ...(atual?.responsavel_id ? { responsavel_original_id: atual.responsavel_id } : {}),
      })
      .eq('id', id);

    if (error) throw error;
  },

  async marcarConcluido(id: string): Promise<void> {
    await this.atualizar(id, { status: 'concluido' });
  },

  async cancelar(id: string): Promise<void> {
    await this.atualizar(id, { status: 'cancelado' });
  },
};
