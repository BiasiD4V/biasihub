import type { Usuario } from '../../domain/entities/Usuario';

export interface IUsuarioRepository {
  listar(): Promise<Usuario[]>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
}
