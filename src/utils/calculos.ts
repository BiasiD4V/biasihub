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

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}
