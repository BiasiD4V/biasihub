import type { PoliticaComercial } from '../../../domain/entities/PoliticaComercial';

export const mockPoliticasComerciais: PoliticaComercial[] = [
  {
    id: 'pc1',
    vigenciaInicio: '2024-01-01',
    vigenciaFim: '2024-12-31',
    bdiPadrao: {
      administracaoCentral: 4.0,
      seguroRisco: 0.97,
      despesasFinanceiras: 1.2,
      lucro: 7.5,
      tributos: 9.65,
    },
    descontoMaximo: 10,
    observacoes: 'Política vigente para contratos 2024.',
  },
];
