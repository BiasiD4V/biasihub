import type { RevisaoEtapa } from './RevisaoEtapa';

export interface RevisaoDisciplina {
  id: string;
  revisaoId: string;
  disciplinaId: string;
  nomeSnapshot?: string;
  ordem: number;
  etapas: RevisaoEtapa[];
}
