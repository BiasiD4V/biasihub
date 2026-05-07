import { supabase } from './client';

export type ComercialEventoTipo =
  | 'visita_tecnica'
  | 'ferias'
  | 'pessoal'
  | 'externo'
  | 'treinamento'
  | 'plantao'
  | 'outro';

export interface CalendarioComercialEvento {
  id: string;
  titulo: string;
  tipo: ComercialEventoTipo;
  descricao: string | null;
  pessoa: string;
  substituto: string | null;
  inicio: string;
  fim: string | null;
  dia_inteiro: boolean;
  criado_por: string | null;
  criado_por_nome: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface NovoCalendarioComercialEvento {
  titulo: string;
  tipo: ComercialEventoTipo;
  descricao?: string | null;
  pessoa: string;
  substituto?: string | null;
  inicio: string;
  fim?: string | null;
  dia_inteiro?: boolean;
  criado_por?: string | null;
  criado_por_nome?: string | null;
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const calendarioComercialEventosRepository = {
  async listar(): Promise<CalendarioComercialEvento[]> {
    const { data, error } = await supabase
      .from('comercial_calendario_eventos')
      .select('*')
      .order('inicio', { ascending: true })
      .order('criado_em', { ascending: true });

    if (error) {
      console.error('[CalendarioEventosRepository] erro ao listar:', error);
      return [];
    }

    return (data || []) as CalendarioComercialEvento[];
  },

  async criar(evento: NovoCalendarioComercialEvento): Promise<CalendarioComercialEvento> {
    const payload = {
      titulo: evento.titulo.trim(),
      tipo: evento.tipo,
      descricao: clean(evento.descricao),
      pessoa: evento.pessoa.trim(),
      substituto: clean(evento.substituto),
      inicio: evento.inicio,
      fim: evento.fim || null,
      dia_inteiro: evento.dia_inteiro ?? true,
      criado_por: evento.criado_por || null,
      criado_por_nome: clean(evento.criado_por_nome),
      atualizado_em: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('comercial_calendario_eventos')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as CalendarioComercialEvento;
  },

  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('comercial_calendario_eventos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
