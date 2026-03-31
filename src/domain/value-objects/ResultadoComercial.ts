export type ResultadoComercial = 'em_andamento' | 'ganho' | 'perdido';

export const RESULTADO_LABELS: Record<ResultadoComercial, string> = {
  em_andamento: 'Em andamento',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

export const RESULTADO_CORES: Record<ResultadoComercial, { bg: string; text: string }> = {
  em_andamento: { bg: 'bg-blue-50',  text: 'text-blue-700'  },
  ganho:        { bg: 'bg-green-50', text: 'text-green-700' },
  perdido:      { bg: 'bg-red-50',   text: 'text-red-700'   },
};
