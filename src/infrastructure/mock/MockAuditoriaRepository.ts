import type { IAuditoriaRepository } from '../../application/ports/IAuditoriaRepository';
import type { EventoAuditoria } from '../../domain/entities/EventoAuditoria';

export class MockAuditoriaRepository implements IAuditoriaRepository {
  private store: EventoAuditoria[] = [];

  async registrar(evento: EventoAuditoria): Promise<void> {
    this.store.push(evento);
  }

  async listarPorEntidade(entidadeTipo: string, entidadeId: string): Promise<EventoAuditoria[]> {
    return this.store.filter(
      (e) => e.entidadeTipo === entidadeTipo && e.entidadeId === entidadeId
    );
  }
}
