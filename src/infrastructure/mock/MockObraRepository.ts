import type { IObraRepository } from '../../application/ports/IObraRepository';
import type { Obra } from '../../domain/entities/Obra';
import { mockObras } from './dados/obras.mock';

export class MockObraRepository implements IObraRepository {
  private store: Obra[] = structuredClone(mockObras);

  async listar(): Promise<Obra[]> {
    return [...this.store];
  }

  async buscarPorId(id: string): Promise<Obra | null> {
    return this.store.find((o) => o.id === id) ?? null;
  }

  async salvar(obra: Obra): Promise<void> {
    const idx = this.store.findIndex((o) => o.id === obra.id);
    if (idx >= 0) {
      this.store[idx] = obra;
    } else {
      this.store.push(obra);
    }
  }
}
