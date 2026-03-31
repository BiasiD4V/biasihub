import type { IDemandaRepository } from '../../application/ports/IDemandaRepository';
import type { DemandaOrcamento } from '../../domain/entities/DemandaOrcamento';
import { mockDemandas } from './dados/demandas.mock';

export class MockDemandaRepository implements IDemandaRepository {
  private store: DemandaOrcamento[] = structuredClone(mockDemandas);

  async listar(): Promise<DemandaOrcamento[]> {
    return [...this.store];
  }

  async buscarPorId(id: string): Promise<DemandaOrcamento | null> {
    return this.store.find((d) => d.id === id) ?? null;
  }

  async salvar(demanda: DemandaOrcamento): Promise<void> {
    const idx = this.store.findIndex((d) => d.id === demanda.id);
    if (idx >= 0) {
      this.store[idx] = demanda;
    } else {
      this.store.push(demanda);
    }
  }
}
