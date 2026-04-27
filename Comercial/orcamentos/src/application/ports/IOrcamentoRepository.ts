import type { Orcamento } from '../../domain/entities/Orcamento';

export interface IOrcamentoRepository {
  listar(): Promise<Orcamento[]>;
  buscarPorId(id: string): Promise<Orcamento | null>;
  buscarPorDemanda(demandaId: string): Promise<Orcamento[]>;
  salvar(orcamento: Orcamento): Promise<void>;
}
