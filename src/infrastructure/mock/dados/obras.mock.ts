import type { Obra } from '../../../domain/entities/Obra';

export const mockObras: Obra[] = [
  { id: 'o1', codigo: 'OBR-2024-001', nome: 'Galpão Industrial Alpha', clienteId: 'c1', municipio: 'Guarulhos', uf: 'SP', tipologia: 'Industrial', ativa: true },
  { id: 'o2', codigo: 'OBR-2024-002', nome: 'Ampliação Hospital São Lucas', clienteId: 'c4', municipio: 'São Paulo', uf: 'SP', tipologia: 'Hospitalar', ativa: true },
  { id: 'o3', codigo: 'OBR-2024-003', nome: 'Reforma Shopping Center Norte', clienteId: 'c5', municipio: 'São Paulo', uf: 'SP', tipologia: 'Comercial', ativa: true },
];
