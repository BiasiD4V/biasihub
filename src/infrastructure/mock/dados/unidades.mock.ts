import type { Unidade } from '../../../domain/entities/Unidade';

export const mockUnidades: Unidade[] = [
  { id: 'un1', simbolo: 'un', descricao: 'Unidade', tipo: 'unidade' },
  { id: 'un2', simbolo: 'm', descricao: 'Metro linear', tipo: 'comprimento' },
  { id: 'un3', simbolo: 'm²', descricao: 'Metro quadrado', tipo: 'area' },
  { id: 'un4', simbolo: 'm³', descricao: 'Metro cúbico', tipo: 'volume' },
  { id: 'un5', simbolo: 'pt', descricao: 'Ponto', tipo: 'unidade' },
  { id: 'un6', simbolo: 'cx', descricao: 'Caixa', tipo: 'unidade' },
  { id: 'un7', simbolo: 'vb', descricao: 'Verba', tipo: 'outro' },
];
