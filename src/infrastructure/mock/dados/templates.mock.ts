import type { Template } from '../../../domain/entities/Template';
import type { TemplateVersao } from '../../../domain/entities/TemplateVersao';

export const mockTemplates: Template[] = [
  {
    id: 'tmpl1',
    nome: 'Template Padrão Elétrico Industrial',
    especialidade: 'eletrica',
    ativa: true,
    versaoAtualId: 'tv1',
    criadaEm: '2024-01-01T00:00:00Z',
    criadoPor: 'u1',
  },
];

export const mockTemplateVersoes: TemplateVersao[] = [
  {
    id: 'tv1',
    templateId: 'tmpl1',
    numeroVersao: '1.0',
    status: 'ativa',
    estrutura: {
      disciplinas: [
        {
          nome: 'Elétrica de Força',
          etapas: [
            { nome: 'Infraestrutura', ambientes: ['Área técnica', 'Corredor principal'] },
            { nome: 'Acabamento', ambientes: ['Sala de reunião', 'Escritório'] },
          ],
        },
      ],
    },
    itensPreDefinidos: [],
    publicadaEm: '2024-01-01T00:00:00Z',
    publicadaPor: 'u1',
  },
];
