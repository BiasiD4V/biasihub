import type { ICotacaoRepository } from '../../application/ports/ICotacaoRepository';
import type { Cotacao } from '../../domain/entities/Cotacao';

export class MockCotacaoRepository implements ICotacaoRepository {
  private store: Cotacao[] = [];

  async listarPorInsumo(insumoId: string): Promise<Cotacao[]> {
    return this.store.filter((c) => c.insumoId === insumoId);
  }

  async buscarPorId(id: string): Promise<Cotacao | null> {
    return this.store.find((c) => c.id === id) ?? null;
  }

  async salvar(cotacao: Cotacao): Promise<void> {
    const idx = this.store.findIndex((c) => c.id === cotacao.id);
    if (idx >= 0) {
      this.store[idx] = cotacao;
    } else {
      this.store.push(cotacao);
    }
  }
}
