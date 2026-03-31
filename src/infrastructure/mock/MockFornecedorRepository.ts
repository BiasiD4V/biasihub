import type { IFornecedorRepository } from '../../application/ports/IFornecedorRepository';
import type { Fornecedor } from '../../domain/entities/Fornecedor';
import { mockFornecedores } from './dados/fornecedores.mock';

export class MockFornecedorRepository implements IFornecedorRepository {
  private store: Fornecedor[] = structuredClone(mockFornecedores);

  async listar(): Promise<Fornecedor[]> {
    return [...this.store];
  }

  async buscarPorId(id: string): Promise<Fornecedor | null> {
    return this.store.find((f) => f.id === id) ?? null;
  }

  async salvar(fornecedor: Fornecedor): Promise<void> {
    const idx = this.store.findIndex((f) => f.id === fornecedor.id);
    if (idx >= 0) {
      this.store[idx] = fornecedor;
    } else {
      this.store.push(fornecedor);
    }
  }
}
