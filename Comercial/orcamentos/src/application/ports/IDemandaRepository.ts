import type { DemandaOrcamento } from '../../domain/entities/DemandaOrcamento';

export interface IDemandaRepository {
  listar(): Promise<DemandaOrcamento[]>;
  buscarPorId(id: string): Promise<DemandaOrcamento | null>;
  salvar(demanda: DemandaOrcamento): Promise<void>;
}
