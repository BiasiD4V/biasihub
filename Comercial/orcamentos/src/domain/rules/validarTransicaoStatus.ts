import type { StatusRevisao } from '../value-objects/StatusRevisao';
import { TRANSICOES_VALIDAS } from '../value-objects/StatusRevisao';

export interface ResultadoValidacao {
  valida: boolean;
  motivo?: string;
}

export function validarTransicaoStatus(
  atual: StatusRevisao,
  destino: StatusRevisao
): ResultadoValidacao {
  const permitidas = TRANSICOES_VALIDAS[atual];

  if (permitidas.includes(destino)) {
    return { valida: true };
  }

  return {
    valida: false,
    motivo: `Transição de "${atual}" para "${destino}" não é permitida.`,
  };
}
