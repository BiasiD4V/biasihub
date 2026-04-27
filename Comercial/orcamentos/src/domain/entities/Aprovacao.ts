import type { PapelUsuario } from '../value-objects/PapelUsuario';

export type TipoEntidadeAprovacao =
  | 'RevisaoOrcamento'
  | 'ComposicaoVersao'
  | 'TemplateVersao';

export type DecisaoAprovacao = 'aprovado' | 'reprovado' | 'solicitado_ajuste';

export interface Aprovacao {
  id: string;
  entidadeTipo: TipoEntidadeAprovacao;
  entidadeId: string;
  aprovadorId: string;
  papel: PapelUsuario;
  decisao: DecisaoAprovacao;
  comentario?: string;
  timestamp: string;
}
