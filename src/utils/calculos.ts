import { ItemOrcamento } from '../types';

export function calcularSubtotal(item: ItemOrcamento): number {
  return item.quantidade * item.valorUnitario;
}

export function calcularTotal(itens: ItemOrcamento[]): number {
  return itens.reduce((acc, item) => acc + calcularSubtotal(item), 0);
}

export function calcularTotalComDesconto(itens: ItemOrcamento[], descontoPercent: number): number {
  const total = calcularTotal(itens);
  return total * (1 - descontoPercent / 100);
}

export function formatarMoeda(valor: number | null | undefined, semDecimais = false): string {
  if (valor == null) return '—';
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    ...(semDecimais && { maximumFractionDigits: 0 }),
  });
}

export function formatarData(dataIso: string | null | undefined): string {
  if (!dataIso) return '—';
  try {
    return new Date(dataIso + 'T12:00:00').toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

export function formatarDataHora(dataIso: string | null | undefined): string {
  if (!dataIso) return '—';
  try {
    return new Date(dataIso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
