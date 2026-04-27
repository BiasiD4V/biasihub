import type { ConfiguracaoBDI } from '../entities/ConfiguracaoBDI';

/**
 * Fórmula: [(1+AC)(1+S+R)(1+DF)(1+L) / (1-T) - 1] × 100
 */
export function calcularBDI(bdi: ConfiguracaoBDI): number {
  const AC = bdi.administracaoCentral / 100;
  const SR = bdi.seguroRisco / 100;
  const DF = bdi.despesasFinanceiras / 100;
  const L = bdi.lucro / 100;
  const T = bdi.tributos / 100;

  return (((1 + AC) * (1 + SR) * (1 + DF) * (1 + L)) / (1 - T) - 1) * 100;
}
