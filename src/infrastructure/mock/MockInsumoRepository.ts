import type { IInsumoRepository } from '../../application/ports/IInsumoRepository';
import type { Insumo } from '../../domain/entities/Insumo';
import { mockInsumos } from './dados/insumos.mock';

export class MockInsumoRepository implements IInsumoRepository {
  private store: Insumo[] = structuredClone(mockInsumos);

  async listar(): Promise<Insumo[]> {
    return [...this.store];
  }

  async buscarPorId(id: string): Promise<Insumo | null> {
    return this.store.find((i) => i.id === id) ?? null;
  }

  async buscarPorCategoria(categoriaId: string): Promise<Insumo[]> {
    return this.store.filter((i) => i.categoriaId === categoriaId);
  }

  async salvar(insumo: Insumo): Promise<void> {
    const idx = this.store.findIndex((i) => i.id === insumo.id);
    if (idx >= 0) {
      this.store[idx] = insumo;
    } else {
      this.store.push(insumo);
    }
  }
}
