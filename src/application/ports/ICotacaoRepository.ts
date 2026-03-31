import type { Cotacao } from '../../domain/entities/Cotacao';

export interface ICotacaoRepository {
  listarPorInsumo(insumoId: string): Promise<Cotacao[]>;
  buscarPorId(id: string): Promise<Cotacao | null>;
  salvar(cotacao: Cotacao): Promise<void>;
}
