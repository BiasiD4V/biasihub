import type { FollowUp } from '../../../domain/entities/FollowUp';

export const mockFollowUps: FollowUp[] = [
  {
    id: 'fu1',
    orcamentoId: 'orc1',
    tipo: 'ligacao',
    data: '2024-01-12T10:30:00Z',
    responsavel: 'Paulo Confar',
    resumo:
      'Ligação inicial com engenheiro da Construtora Alpha para alinhar escopo da reforma elétrica do Galpão 2. Cliente confirmou interesse e solicitou proposta formal com cronograma.',
    proximaAcao: 'Enviar proposta detalhada por e-mail',
    dataProximaAcao: '2024-01-15',
  },
  {
    id: 'fu2',
    orcamentoId: 'orc1',
    tipo: 'email',
    data: '2024-01-15T14:00:00Z',
    responsavel: 'Paulo Confar',
    resumo:
      'Proposta enviada por e-mail com planilha de orçamento detalhada, memorial descritivo e cronograma físico-financeiro. Aguardando retorno em até 5 dias úteis.',
    proximaAcao: 'Follow-up por WhatsApp se não houver resposta até sexta',
    dataProximaAcao: '2024-01-22',
  },
  {
    id: 'fu3',
    orcamentoId: 'orc1',
    tipo: 'reuniao',
    data: '2024-01-24T09:00:00Z',
    responsavel: 'Paulo Confar',
    resumo:
      'Reunião presencial nas instalações da Construtora Alpha. Foram negociados valores e prazos. Cliente aprovou orçamento com ajuste de 5% no BDI. Assinatura da proposta prevista para a semana.',
    proximaAcao: 'Emitir proposta final com ajuste de BDI e enviar para assinatura',
    dataProximaAcao: '2024-01-26',
  },
  {
    id: 'fu4',
    orcamentoId: 'orc1',
    tipo: 'whatsapp',
    data: '2024-01-26T16:45:00Z',
    responsavel: 'Paulo Confar',
    resumo:
      'Confirmação via WhatsApp de que o cliente recebeu, revisou e assinou a proposta final. Orçamento aprovado. Processo de venda concluído com sucesso.',
  },
  {
    id: 'fu5',
    orcamentoId: 'orc2',
    tipo: 'ligacao',
    data: '2024-01-20T11:00:00Z',
    responsavel: 'Paulo Confar',
    resumo:
      'Primeiro contato com equipe técnica da Indústria Beta para levantamento de requisitos hidrossanitários dos banheiros administrativos. Cliente solicitou visita técnica in loco antes da elaboração do orçamento.',
    proximaAcao: 'Agendar visita técnica e confirmar acesso ao local',
    dataProximaAcao: '2024-01-25',
  },
  // orc3 — proposta enviada, mas ação vencida: dataProximaAcao no passado
  {
    id: 'fu6',
    orcamentoId: 'orc3',
    tipo: 'email',
    data: '2025-11-20T14:00:00Z',
    responsavel: 'Lucas Mendes',
    resumo:
      'Proposta enviada ao Shopping Center Guarulhos. Planilha de orçamento do quadro de distribuição do Bloco B anexada. Aguardando aprovação da gerência de engenharia.',
    proximaAcao: 'Ligar para confirmar recebimento da proposta',
    dataProximaAcao: '2025-11-25',
  },
  {
    id: 'fu7',
    orcamentoId: 'orc3',
    tipo: 'whatsapp',
    data: '2026-03-10T09:30:00Z',
    responsavel: 'Lucas Mendes',
    resumo:
      'Cliente retomou contato após pausa. Interesse reativado — aguarda reunião para alinhar escopo e prazo de execução. Solicitou plantas atualizadas do Bloco B.',
    proximaAcao: 'Enviar solicitação formal de plantas atualizadas ao cliente',
    dataProximaAcao: '2026-03-14',
  },
];
