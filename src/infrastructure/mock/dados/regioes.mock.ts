import type { Regiao } from '../../../domain/entities/Regiao';

export const mockRegioes: Regiao[] = [
  { id: 'r1', nome: 'Grande São Paulo', uf: 'SP', municipios: ['São Paulo', 'Guarulhos', 'Osasco', 'Santo André'] },
  { id: 'r2', nome: 'Interior SP', uf: 'SP', municipios: ['Campinas', 'Ribeirão Preto', 'São José dos Campos'] },
  { id: 'r3', nome: 'Rio de Janeiro', uf: 'RJ', municipios: ['Rio de Janeiro', 'Niterói', 'Nova Iguaçu'] },
  { id: 'r4', nome: 'Minas Gerais', uf: 'MG', municipios: ['Belo Horizonte', 'Uberlândia', 'Contagem'] },
];
