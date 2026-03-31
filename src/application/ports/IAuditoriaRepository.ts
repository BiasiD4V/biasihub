import type { EventoAuditoria } from '../../domain/entities/EventoAuditoria';

export interface IAuditoriaRepository {
  registrar(evento: EventoAuditoria): Promise<void>;
  listarPorEntidade(entidadeTipo: string, entidadeId: string): Promise<EventoAuditoria[]>;
}
