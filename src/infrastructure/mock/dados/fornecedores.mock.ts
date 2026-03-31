import type { Fornecedor } from '../../../domain/entities/Fornecedor';

export const mockFornecedores: Fornecedor[] = [
  { id: 'f1', razaoSocial: 'Elétrica Distribuidora SP Ltda', nomeFantasia: 'EletroSP', cnpj: '12.345.678/0001-90', contato: '(11) 4567-8901', ativo: true },
  { id: 'f2', razaoSocial: 'Hidro Materiais e Equipamentos S.A.', nomeFantasia: 'HidroMat', cnpj: '98.765.432/0001-10', contato: '(11) 3210-9876', ativo: true },
  { id: 'f3', razaoSocial: 'Cabos e Fios Nacional Ltda', nomeFantasia: 'CabosNac', cnpj: '11.222.333/0001-44', contato: '(11) 2109-8765', ativo: true },
];
