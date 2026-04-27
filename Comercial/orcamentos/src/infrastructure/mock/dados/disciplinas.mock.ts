import type { Disciplina } from '../../../domain/entities/Disciplina';

export const mockDisciplinas: Disciplina[] = [
  { id: 'disc1', codigo: 'ELE', nome: 'Elétrica de Força', especialidade: 'eletrica', ativa: true },
  { id: 'disc2', codigo: 'CAB', nome: 'Cabeamento Estruturado', especialidade: 'eletrica', ativa: true },
  { id: 'disc3', codigo: 'HID', nome: 'Hidrossanitário', especialidade: 'hidrossanitario', ativa: true },
  { id: 'disc4', codigo: 'ILU', nome: 'Iluminação', especialidade: 'eletrica', ativa: true },
  { id: 'disc5', codigo: 'CLI', nome: 'Climatização', especialidade: 'climatizacao', ativa: true },
];
