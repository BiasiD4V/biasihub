import type { TipoObra } from '../../../domain/entities/TipoObra';

export const mockTiposObra: TipoObra[] = [
  { id: 'to1', nome: 'Industrial', descricao: 'Galpões, fábricas e plantas industriais', ativo: true },
  { id: 'to2', nome: 'Hospitalar', descricao: 'Hospitais, clínicas e unidades de saúde', ativo: true },
  { id: 'to3', nome: 'Comercial', descricao: 'Escritórios, lojas e centros comerciais', ativo: true },
  { id: 'to4', nome: 'Residencial', descricao: 'Edificações residenciais e condomínios', ativo: true },
  { id: 'to5', nome: 'Infraestrutura', descricao: 'Obras públicas e de infraestrutura urbana', ativo: true },
];
