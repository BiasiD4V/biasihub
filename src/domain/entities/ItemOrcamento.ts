import type { TipoItem } from '../value-objects/TipoItem';
import type { ComposicaoSnapshot } from './ComposicaoSnapshot';
import type { Excecao } from './Excecao';

export interface ItemOrcamento {
  id: string;
  ambienteId: string;
  tipo: TipoItem;
  composicaoSnapshot?: ComposicaoSnapshot;
  descricao?: string;
  unidade?: string;
  quantidade: number;
  valorUnitario: number;
  excecoes: Excecao[];
  ordem: number;
}
