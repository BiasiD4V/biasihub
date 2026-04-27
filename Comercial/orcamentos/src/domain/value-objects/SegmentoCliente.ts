export const SEGMENTOS_CLIENTE = [
  'Construção Civil',
  'Indústria',
  'Saúde',
  'Varejo / Comercial',
  'Condomínio',
  'Infraestrutura',
  'Educação',
  'Hotelaria',
  'Agronegócio',
  'Outros',
] as const;

export type SegmentoCliente = (typeof SEGMENTOS_CLIENTE)[number];
