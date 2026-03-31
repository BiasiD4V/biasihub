/**
 * @deprecated Este arquivo não é mais fonte ativa do sistema.
 * Os dados foram migrados para src/infrastructure/mock/dados/:
 *   - mockClientes   → clientes.mock.ts
 *   - mockCatalogo   → catalogo.mock.ts
 *   - mockOrcamentos → prototipo.mock.ts
 * Mantido apenas para referência. Não importar em código novo.
 */
import type { Cliente, Orcamento } from '../types';

export const mockClientes: Cliente[] = [
  { id: '1', nome: 'Construtora Alpha Ltda', email: 'contato@alpha.com.br', telefone: '(11) 3456-7890' },
  { id: '2', nome: 'Indústria Beta S.A.', email: 'obras@beta.com.br', telefone: '(11) 9876-5432' },
  { id: '3', nome: 'Condomínio Parque das Flores', email: 'admin@parqueflores.com.br', telefone: '(11) 2345-6789' },
  { id: '4', nome: 'Hospital São Lucas', email: 'manutencao@saolucas.com.br', telefone: '(11) 5678-9012' },
  { id: '5', nome: 'Shopping Center Norte', email: 'engenharia@centronorte.com.br', telefone: '(11) 8901-2345' },
];

export const mockCatalogo = [
  { descricao: 'Instalação elétrica – quadro de distribuição', unidade: 'un', valorUnitario: 1850.0 },
  { descricao: 'Cabeamento estruturado Cat6 – por ponto', unidade: 'pt', valorUnitario: 380.0 },
  { descricao: 'Instalação hidráulica – banheiro completo', unidade: 'un', valorUnitario: 2400.0 },
  { descricao: 'Eletroduto rígido 3/4″ – instalado', unidade: 'm', valorUnitario: 45.0 },
  { descricao: 'Tomada 2P+T 20A – instalada', unidade: 'un', valorUnitario: 120.0 },
  { descricao: 'Disjuntor bipolar 30A – instalado', unidade: 'un', valorUnitario: 95.0 },
  { descricao: 'Luminária LED embutir 25W – instalada', unidade: 'un', valorUnitario: 310.0 },
  { descricao: 'Ramal de água fria – por ponto', unidade: 'pt', valorUnitario: 280.0 },
];

export const mockOrcamentos: Orcamento[] = [
  {
    id: '1',
    numero: 'ORC-2024-001',
    cliente: mockClientes[0],
    status: 'aprovado',
    dataCriacao: '2024-01-10',
    observacoes: 'Reforma elétrica completa do galpão 2.',
    itens: [
      { id: 'i1', descricao: 'Instalação elétrica – quadro de distribuição', unidade: 'un', quantidade: 2, valorUnitario: 1850.0 },
      { id: 'i2', descricao: 'Cabeamento estruturado Cat6 – por ponto', unidade: 'pt', quantidade: 24, valorUnitario: 380.0 },
      { id: 'i3', descricao: 'Tomada 2P+T 20A – instalada', unidade: 'un', quantidade: 16, valorUnitario: 120.0 },
    ],
  },
  {
    id: '2',
    numero: 'ORC-2024-002',
    cliente: mockClientes[1],
    status: 'enviado',
    dataCriacao: '2024-01-18',
    observacoes: 'Instalação hidráulica dos banheiros do setor administrativo.',
    itens: [
      { id: 'i4', descricao: 'Instalação hidráulica – banheiro completo', unidade: 'un', quantidade: 3, valorUnitario: 2400.0 },
      { id: 'i5', descricao: 'Ramal de água fria – por ponto', unidade: 'pt', quantidade: 12, valorUnitario: 280.0 },
    ],
  },
  {
    id: '3',
    numero: 'ORC-2024-003',
    cliente: mockClientes[2],
    status: 'rascunho',
    dataCriacao: '2024-02-05',
    observacoes: '',
    itens: [
      { id: 'i6', descricao: 'Luminária LED embutir 25W – instalada', unidade: 'un', quantidade: 40, valorUnitario: 310.0 },
      { id: 'i7', descricao: 'Eletroduto rígido 3/4″ – instalado', unidade: 'm', quantidade: 80, valorUnitario: 45.0 },
    ],
  },
  {
    id: '4',
    numero: 'ORC-2024-004',
    cliente: mockClientes[3],
    status: 'reprovado',
    dataCriacao: '2024-02-12',
    observacoes: 'Modernização do painel elétrico da UTI.',
    itens: [
      { id: 'i8', descricao: 'Instalação elétrica – quadro de distribuição', unidade: 'un', quantidade: 1, valorUnitario: 1850.0 },
      { id: 'i9', descricao: 'Disjuntor bipolar 30A – instalado', unidade: 'un', quantidade: 8, valorUnitario: 95.0 },
    ],
  },
  {
    id: '5',
    numero: 'ORC-2024-005',
    cliente: mockClientes[4],
    status: 'aprovado',
    dataCriacao: '2024-03-01',
    observacoes: 'Expansão da rede de dados – área de food court.',
    itens: [
      { id: 'i10', descricao: 'Cabeamento estruturado Cat6 – por ponto', unidade: 'pt', quantidade: 48, valorUnitario: 380.0 },
      { id: 'i11', descricao: 'Tomada 2P+T 20A – instalada', unidade: 'un', quantidade: 30, valorUnitario: 120.0 },
    ],
  },
];
