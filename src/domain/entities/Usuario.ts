import type { PapelUsuario } from '../value-objects/PapelUsuario';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  ativo: boolean;
}
