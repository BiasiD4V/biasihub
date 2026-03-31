import type { IOrcamentoRepository } from '../../application/ports/IOrcamentoRepository';
import type { Orcamento } from '../../domain/entities/Orcamento';
import { mockOrcamentos } from './dados/orcamentos.mock';

export class MockOrcamentoRepository implements IOrcamentoRepository {
  private store: Orcamento[] = structuredClone(mockOrcamentos);

  async listar(): Promise<Orcamento[]> {
    return [...this.store];
  }

  async buscarPorId(id: string): Promise<Orcamento | null> {
    return this.store.find((o) => o.id === id) ?? null;
  }

  async buscarPorDemanda(demandaId: string): Promise<Orcamento[]> {
    return this.store.filter((o) => o.demandaId === demandaId);
  }

  async salvar(orcamento: Orcamento): Promise<void> {
    const idx = this.store.findIndex((o) => o.id === orcamento.id);
    if (idx >= 0) {
      this.store[idx] = orcamento;
    } else {
      this.store.push(orcamento);
    }
  }
}
