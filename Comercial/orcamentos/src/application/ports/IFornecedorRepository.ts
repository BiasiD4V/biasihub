import type { Fornecedor } from '../../domain/entities/Fornecedor';

export interface IFornecedorRepository {
  listar(): Promise<Fornecedor[]>;
  buscarPorId(id: string): Promise<Fornecedor | null>;
  salvar(fornecedor: Fornecedor): Promise<void>;
}
