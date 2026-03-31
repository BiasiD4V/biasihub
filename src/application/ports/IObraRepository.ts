import type { Obra } from '../../domain/entities/Obra';

export interface IObraRepository {
  listar(): Promise<Obra[]>;
  buscarPorId(id: string): Promise<Obra | null>;
  salvar(obra: Obra): Promise<void>;
}
