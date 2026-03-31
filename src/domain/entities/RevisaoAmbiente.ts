import type { ItemOrcamento } from './ItemOrcamento';

export interface RevisaoAmbiente {
  id: string;
  etapaId: string;
  nome: string;
  ordem: number;
  itens: ItemOrcamento[];
}
