import type { IAuditoriaRepository } from '../ports/IAuditoriaRepository';
import type { EventoAuditoria, OrigemEvento } from '../../domain/entities/EventoAuditoria';
import type { PapelUsuario } from '../../domain/value-objects/PapelUsuario';

interface Input {
  usuarioId: string;
  papel: PapelUsuario;
  acao: string;
  entidadeTipo: string;
  entidadeId: string;
  dadosAntes?: Record<string, unknown>;
  dadosDepois?: Record<string, unknown>;
  origem?: OrigemEvento;
}

export function criarRegistrarEventoAuditoria(repo: IAuditoriaRepository) {
  return async function registrarEventoAuditoria(input: Input): Promise<void> {
    const evento: EventoAuditoria = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      usuarioId: input.usuarioId,
      papel: input.papel,
      acao: input.acao,
      entidadeTipo: input.entidadeTipo,
      entidadeId: input.entidadeId,
      dadosAntes: input.dadosAntes,
      dadosDepois: input.dadosDepois,
      origem: input.origem ?? 'ui',
    };

    await repo.registrar(evento);
  };
}
