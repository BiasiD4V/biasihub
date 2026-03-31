export type EtapaFunil =
  | 'entrada_oportunidade'   // Entrada da oportunidade
  | 'aguardando_documentos'  // Aguardando documentos
  | 'analise_inicial'        // Análise inicial
  | 'levantamento'           // Levantamento
  | 'cotacao'                // Cotação
  | 'montagem_orcamento'     // Montagem do orçamento
  | 'revisao_interna'        // Revisão interna
  | 'proposta_enviada'       // Proposta enviada
  | 'followup'               // Follow-up
  | 'negociacao'             // Negociação
  | 'pos_venda';             // Pós-venda (apenas quando resultadoComercial === 'ganho')

export const ETAPA_LABELS: Record<EtapaFunil, string> = {
  entrada_oportunidade:  'Entrada da oportunidade',
  aguardando_documentos: 'Aguardando documentos',
  analise_inicial:       'Análise inicial',
  levantamento:          'Levantamento',
  cotacao:               'Cotação',
  montagem_orcamento:    'Montagem do orçamento',
  revisao_interna:       'Revisão interna',
  proposta_enviada:      'Proposta enviada',
  followup:              'Follow-up',
  negociacao:            'Negociação',
  pos_venda:             'Pós-venda',
};

export const ETAPA_CORES: Record<EtapaFunil, { bg: string; text: string; border: string }> = {
  entrada_oportunidade:  { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-200'  },
  aguardando_documentos: { bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
  analise_inicial:       { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200'   },
  levantamento:          { bg: 'bg-cyan-50',    text: 'text-cyan-700',   border: 'border-cyan-200'   },
  cotacao:               { bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-200'    },
  montagem_orcamento:    { bg: 'bg-indigo-50',  text: 'text-indigo-700', border: 'border-indigo-200' },
  revisao_interna:       { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200' },
  proposta_enviada:      { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200'  },
  followup:              { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  negociacao:            { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200' },
  pos_venda:             { bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-200'   },
};

// Etapa que representa conclusão do funil (pós-fechamento ganho)
export const ETAPAS_FECHAMENTO: EtapaFunil[] = ['pos_venda'];

// Todas as etapas aparecem no Kanban
export const ETAPAS_ATIVAS: EtapaFunil[] = [
  'entrada_oportunidade',
  'aguardando_documentos',
  'analise_inicial',
  'levantamento',
  'cotacao',
  'montagem_orcamento',
  'revisao_interna',
  'proposta_enviada',
  'followup',
  'negociacao',
  'pos_venda',
];

// Ordem natural do funil (usada no Kanban e no select)
export const ORDEM_FUNIL: EtapaFunil[] = [
  'entrada_oportunidade',
  'aguardando_documentos',
  'analise_inicial',
  'levantamento',
  'cotacao',
  'montagem_orcamento',
  'revisao_interna',
  'proposta_enviada',
  'followup',
  'negociacao',
  'pos_venda',
];
