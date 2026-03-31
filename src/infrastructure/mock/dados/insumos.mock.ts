import type { Insumo } from '../../../domain/entities/Insumo';

export const mockInsumos: Insumo[] = [
  { id: 'ins1', codigo: 'ELE-001', descricao: 'Disjuntor bipolar 30A', unidadeId: 'un1', categoriaId: 'cat1', ativo: true },
  { id: 'ins2', codigo: 'ELE-002', descricao: 'Tomada 2P+T 20A', unidadeId: 'un1', categoriaId: 'cat1', ativo: true },
  { id: 'ins3', codigo: 'ELE-003', descricao: 'Eletroduto rígido PVC 3/4"', unidadeId: 'un2', categoriaId: 'cat1', ativo: true },
  { id: 'ins4', codigo: 'ELE-004', descricao: 'Cabo flexível 2,5mm²', unidadeId: 'un2', categoriaId: 'cat1', ativo: true },
  { id: 'ins5', codigo: 'HID-001', descricao: 'Tubo PVC soldável 25mm', unidadeId: 'un2', categoriaId: 'cat2', ativo: true },
  { id: 'ins6', codigo: 'HID-002', descricao: 'Registro de gaveta 3/4"', unidadeId: 'un1', categoriaId: 'cat2', ativo: true },
  { id: 'ins7', codigo: 'ILU-001', descricao: 'Luminária LED embutir 25W', unidadeId: 'un1', categoriaId: 'cat1', ativo: true },
  { id: 'ins8', codigo: 'CAB-001', descricao: 'Cabo UTP Cat6 4 pares', unidadeId: 'un2', categoriaId: 'cat1', ativo: true },
];
