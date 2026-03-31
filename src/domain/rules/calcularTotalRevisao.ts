import type { RevisaoOrcamento } from '../entities/RevisaoOrcamento';
import { calcularBDI } from './calcularBDI';

export interface TotaisRevisao {
  custosDiretos: number;
  percentualBDI: number;
  totalComBDI: number;
}

export function calcularTotalRevisao(revisao: RevisaoOrcamento): TotaisRevisao {
  let custosDiretos = 0;

  for (const disciplina of revisao.disciplinas) {
    for (const etapa of disciplina.etapas) {
      for (const ambiente of etapa.ambientes) {
        for (const item of ambiente.itens) {
          if (item.tipo !== 'textoLivre' && item.tipo !== 'subtotalManual') {
            custosDiretos += item.quantidade * item.valorUnitario;
          }
        }
      }
    }
  }

  const percentualBDI = calcularBDI(revisao.bdi);
  const totalComBDI = custosDiretos * (1 + percentualBDI / 100);

  return { custosDiretos, percentualBDI, totalComBDI };
}
