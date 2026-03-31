import type { IUsuarioRepository } from '../../application/ports/IUsuarioRepository';
import type { Usuario } from '../../domain/entities/Usuario';
import { mockUsuarios } from './dados/usuarios.mock';

export class MockUsuarioRepository implements IUsuarioRepository {
  private store: Usuario[] = structuredClone(mockUsuarios);

  async listar(): Promise<Usuario[]> {
    return [...this.store];
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    return this.store.find((u) => u.id === id) ?? null;
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    return this.store.find((u) => u.email === email) ?? null;
  }
}
