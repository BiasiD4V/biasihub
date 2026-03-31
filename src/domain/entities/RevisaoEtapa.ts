import type { RevisaoAmbiente } from './RevisaoAmbiente';

export interface RevisaoEtapa {
  id: string;
  disciplinaId: string;
  nome: string;
  ordem: number;
  ambientes: RevisaoAmbiente[];
}
