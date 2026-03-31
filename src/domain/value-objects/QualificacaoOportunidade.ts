export type NivelAltoMedioBaixo = 'alto' | 'medio' | 'baixo';
export type NivelAltaMediaBaixa = 'alta' | 'media' | 'baixa';
export type SimNao = 'sim' | 'nao';

export interface QualificacaoOportunidade {
  orcamentoId: string;
  fitTecnico: NivelAltoMedioBaixo;
  clarezaDocumentos: NivelAltaMediaBaixa;
  urgencia: NivelAltaMediaBaixa;
  chanceFechamento: NivelAltaMediaBaixa;
  valorEstrategico?: NivelAltoMedioBaixo;
  clienteEstrategico: SimNao;
  prazoResposta?: string;        // YYYY-MM-DD
  observacaoComercial?: string;
  atualizadoEm: string;          // ISO datetime
}

export type AtualizarQualificacaoInput = Partial<
  Omit<QualificacaoOportunidade, 'orcamentoId' | 'atualizadoEm'>
>;

export const NIVEL_AMB_LABELS: Record<NivelAltoMedioBaixo, string> = {
  alto: 'Alto',
  medio: 'Médio',
  baixo: 'Baixo',
};

export const NIVEL_AMB_CORES: Record<NivelAltoMedioBaixo, string> = {
  alto: 'bg-green-100 text-green-700',
  medio: 'bg-amber-100 text-amber-700',
  baixo: 'bg-red-100 text-red-700',
};

export const NIVEL_AMAB_LABELS: Record<NivelAltaMediaBaixa, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export const NIVEL_AMAB_CORES: Record<NivelAltaMediaBaixa, string> = {
  alta: 'bg-green-100 text-green-700',
  media: 'bg-amber-100 text-amber-700',
  baixa: 'bg-red-100 text-red-700',
};
