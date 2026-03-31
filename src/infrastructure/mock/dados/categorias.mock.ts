import type { Categoria } from '../../../domain/entities/Categoria';

export const mockCategorias: Categoria[] = [
  { id: 'cat1', nome: 'Material Elétrico', tipo: 'insumo' },
  { id: 'cat2', nome: 'Material Hidráulico', tipo: 'insumo' },
  { id: 'cat3', nome: 'Mão de Obra', tipo: 'servico' },
  { id: 'cat4', nome: 'Equipamento de Medição', tipo: 'equipamento' },
  { id: 'cat5', nome: 'Ferramenta Especializada', tipo: 'equipamento' },
];
