import type { PapelUsuario } from '../value-objects/PapelUsuario';

export type OrigemEvento = 'ui' | 'sistema';

export interface EventoAuditoria {
  id: string;
  timestamp: string;
  usuarioId: string;
  papel: PapelUsuario;
  acao: string;
  entidadeTipo: string;
  entidadeId: string;
  dadosAntes?: Record<string, unknown>;
  dadosDepois?: Record<string, unknown>;
  origem: OrigemEvento;
}
