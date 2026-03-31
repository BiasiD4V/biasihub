import type { Insumo } from '../../domain/entities/Insumo';

export interface IInsumoRepository {
  listar(): Promise<Insumo[]>;
  buscarPorId(id: string): Promise<Insumo | null>;
  buscarPorCategoria(categoriaId: string): Promise<Insumo[]>;
  salvar(insumo: Insumo): Promise<void>;
}
