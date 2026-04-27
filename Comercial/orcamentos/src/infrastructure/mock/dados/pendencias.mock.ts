import type { Pendencia } from '../../../domain/entities/Pendencia';

export const mockPendencias: Pendencia[] = [
  {
    id: 'pen1',
    orcamentoId: 'orc1',
    descricao:
      'Solicitar memorial descritivo atualizado ao cliente antes da emissão da nota fiscal.',
    status: 'resolvida',
    responsavel: 'Paulo Confar',
    prazo: '2024-01-28',
    criadaEm: '2024-01-26T17:00:00Z',
  },
  {
    id: 'pen2',
    orcamentoId: 'orc2',
    descricao:
      'Confirmar acesso ao local com o setor de segurança da Indústria Beta para visita técnica de levantamento hidrossanitário.',
    status: 'aberta',
    responsavel: 'Paulo Confar',
    prazo: '2024-01-30',
    criadaEm: '2024-01-20T11:30:00Z',
  },
  {
    id: 'pen3',
    orcamentoId: 'orc2',
    descricao:
      'Verificar disponibilidade de materiais (tubulações e conexões) com fornecedor Hydro Suprimentos antes de fechar os preços do orçamento.',
    status: 'aberta',
    responsavel: 'Paulo Confar',
    prazo: '2024-02-05',
    criadaEm: '2024-01-22T09:00:00Z',
  },
  // orc3 — pendência aberta: plantas do Bloco B
  {
    id: 'pen4',
    orcamentoId: 'orc3',
    descricao:
      'Solicitar plantas baixas atualizadas do Bloco B ao cliente — necessárias para revisão do escopo do quadro de distribuição.',
    status: 'aberta',
    responsavel: 'Lucas Mendes',
    prazo: '2026-03-20',
    criadaEm: '2026-03-10T09:30:00Z',
  },
];
