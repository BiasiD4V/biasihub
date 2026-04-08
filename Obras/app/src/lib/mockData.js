// ============================================================
// MOCK DATA — ERP Biasi Engenharia
// Dados realistas para demonstração e desenvolvimento
// ============================================================

export const usuarios = [
  {
    id: 'u0',
    nome: 'Rodrigo Gonçalves Santos',
    email: 'rodrigo@biasi.com.br',
    senha: '123456',
    perfil: 'admin',
    obras_vinculadas: [],
    ultimo_acesso: '2026-04-01T08:00:00',
    ativo: true,
    avatar: 'RG',
  },
  {
    id: 'u1',
    nome: 'Carlos Eduardo Biasi',
    email: 'carlos.biasi@biasi.eng.br',
    senha: '123456',
    perfil: 'diretor',
    obras_vinculadas: [], // acesso a todas
    ultimo_acesso: '2025-09-15T08:30:00',
    ativo: true,
    avatar: 'CB',
  },
  {
    id: 'u2',
    nome: 'Mariana Fernandes',
    email: 'mariana.fernandes@biasi.eng.br',
    senha: '123456',
    perfil: 'gerente',
    obras_vinculadas: [], // acesso a todas
    ultimo_acesso: '2025-09-15T09:15:00',
    ativo: true,
    avatar: 'MF',
  },
  {
    id: 'u3',
    nome: 'Ricardo Alves',
    email: 'ricardo.alves@biasi.eng.br',
    senha: '123456',
    perfil: 'gerente',
    obras_vinculadas: [],
    ultimo_acesso: '2025-09-14T16:45:00',
    ativo: true,
    avatar: 'RA',
  },
  {
    id: 'u4',
    nome: 'Thiago Santos',
    email: 'thiago.santos@biasi.eng.br',
    senha: '123456',
    perfil: 'supervisor',
    obras_vinculadas: ['obra1', 'obra2'],
    ultimo_acesso: '2025-09-15T07:55:00',
    ativo: true,
    avatar: 'TS',
  },
  {
    id: 'u5',
    nome: 'Priscila Moura',
    email: 'priscila.moura@biasi.eng.br',
    senha: '123456',
    perfil: 'supervisor',
    obras_vinculadas: ['obra3', 'obra4', 'obra5'],
    ultimo_acesso: '2025-09-13T11:20:00',
    ativo: true,
    avatar: 'PM',
  },
]

// Período de referência atual: Setembro/2025 (índice 8, base 0)
export const PERIODO_ATUAL = 8

export const periodos = [
  { id: 'p01', label: 'Jan/25', mes: 1, ano: 2025 },
  { id: 'p02', label: 'Fev/25', mes: 2, ano: 2025 },
  { id: 'p03', label: 'Mar/25', mes: 3, ano: 2025 },
  { id: 'p04', label: 'Abr/25', mes: 4, ano: 2025 },
  { id: 'p05', label: 'Mai/25', mes: 5, ano: 2025 },
  { id: 'p06', label: 'Jun/25', mes: 6, ano: 2025 },
  { id: 'p07', label: 'Jul/25', mes: 7, ano: 2025 },
  { id: 'p08', label: 'Ago/25', mes: 8, ano: 2025 },
  { id: 'p09', label: 'Set/25', mes: 9, ano: 2025 },
  { id: 'p10', label: 'Out/25', mes: 10, ano: 2025 },
  { id: 'p11', label: 'Nov/25', mes: 11, ano: 2025 },
  { id: 'p12', label: 'Dez/25', mes: 12, ano: 2025 },
]

// ============================================================
// OBRAS
// ============================================================
export const obras = [
  {
    id: 'obra1',
    codigo: 'SE-138kV-ITQ-001',
    nome: 'Subestação 138kV — Itaquaquecetuba',
    cliente: 'Enel Distribuição SP',
    contrato: 'CTR-2024-0089',
    data_inicio: '2025-01-15',
    data_fim: '2025-12-31',
    valor_contrato: 8750000,
    status: 'em_andamento',
    responsavel_id: 'u4',
    responsavel_nome: 'Thiago Santos',
    descricao: 'Implantação de subestação blindada 138kV com 3 transformadores 138/13,8kV, incluindo obras civis, montagem eletromecânica e comissionamento.',
    localizacao: 'Itaquaquecetuba, SP',
    tipo: 'Subestação',
    foto_url: null,
  },
  {
    id: 'obra2',
    codigo: 'LT-69kV-TR1-002',
    nome: 'LTMT 69kV — Trecho 1',
    cliente: 'ISA CTEEP',
    contrato: 'CTR-2024-0112',
    data_inicio: '2025-02-01',
    data_fim: '2025-10-31',
    valor_contrato: 4200000,
    status: 'em_andamento',
    responsavel_id: 'u4',
    responsavel_nome: 'Thiago Santos',
    descricao: 'Construção de linha de transmissão 69kV em dupla terna, extensão de 28km, incluindo fundações, montagem de torres e lançamento de cabos.',
    localizacao: 'Interior de SP',
    tipo: 'Linha de Transmissão',
    foto_url: null,
  },
  {
    id: 'obra3',
    codigo: 'CCO-SP-003',
    nome: 'Centro de Controle de Operações — São Paulo',
    cliente: 'CPFL Energia',
    contrato: 'CTR-2025-0021',
    data_inicio: '2025-03-01',
    data_fim: '2025-11-30',
    valor_contrato: 6100000,
    status: 'em_andamento',
    responsavel_id: 'u5',
    responsavel_nome: 'Priscila Moura',
    descricao: 'Construção e modernização do CCO com instalação de sistema SCADA, painéis de controle, infraestrutura de TI e sistema de videowall.',
    localizacao: 'São Paulo, SP',
    tipo: 'CCO / Sistemas',
    foto_url: null,
  },
  {
    id: 'obra4',
    codigo: 'BC-GRU-004',
    nome: 'Banco de Capacitores — Guarulhos',
    cliente: 'Eletropaulo S.A.',
    contrato: 'CTR-2025-0034',
    data_inicio: '2025-04-01',
    data_fim: '2025-09-30',
    valor_contrato: 1850000,
    status: 'em_andamento',
    responsavel_id: 'u5',
    responsavel_nome: 'Priscila Moura',
    descricao: 'Instalação de banco de capacitores 13,8kV — 6 Mvar para correção do fator de potência na subestação Guarulhos Norte.',
    localizacao: 'Guarulhos, SP',
    tipo: 'Equipamentos',
    foto_url: null,
  },
  {
    id: 'obra5',
    codigo: 'RSE-NORTE-005',
    nome: 'Reforma Subestação SE-Norte',
    cliente: 'EDP Energias do Brasil',
    contrato: 'CTR-2025-0051',
    data_inicio: '2025-05-01',
    data_fim: '2025-12-15',
    valor_contrato: 3300000,
    status: 'em_andamento',
    responsavel_id: 'u5',
    responsavel_nome: 'Priscila Moura',
    descricao: 'Reforma geral da SE-Norte incluindo substituição de transformadores, modernização de proteções, pintura e obras civis complementares.',
    localizacao: 'São Paulo, SP — Zona Norte',
    tipo: 'Reforma',
    foto_url: null,
  },
]

// ============================================================
// EAP — Estrutura Analítica do Projeto
// ============================================================

// Helper para criar item EAP
const eapItem = (id, obra_id, codigo, descricao, nivel, pai_id, peso, valor_orcado, tipo = 'servico') => ({
  id, obra_id, codigo, descricao, nivel, pai_id, peso, valor_orcado, tipo,
  status: 'LIBERADO',
})

export const eap_itens = [
  // =========================================================
  // OBRA 1 — Subestação 138kV Itaquaquecetuba (R$ 8.750.000)
  // =========================================================
  eapItem('e1_01', 'obra1', '1', 'SUBESTAÇÃO 138kV — ITAQUAQUECETUBA', 1, null, 100, 8750000, 'grupo'),
  eapItem('e1_02', 'obra1', '1.1', 'Obras Civis', 2, 'e1_01', 28, 2450000, 'grupo'),
  eapItem('e1_03', 'obra1', '1.1.1', 'Terraplenagem e drenagem', 3, 'e1_02', 8, 700000, 'servico'),
  eapItem('e1_04', 'obra1', '1.1.2', 'Fundações dos equipamentos', 3, 'e1_02', 10, 875000, 'servico'),
  eapItem('e1_05', 'obra1', '1.1.3', 'Edificações (Casa de relés e controle)', 3, 'e1_02', 10, 875000, 'servico'),
  eapItem('e1_06', 'obra1', '1.2', 'Montagem Eletromecânica', 2, 'e1_01', 42, 3675000, 'grupo'),
  eapItem('e1_07', 'obra1', '1.2.1', 'Estruturas metálicas e barramentos', 3, 'e1_06', 12, 1050000, 'servico'),
  eapItem('e1_08', 'obra1', '1.2.2', 'Instalação de transformadores 138/13,8kV', 3, 'e1_06', 18, 1575000, 'servico'),
  eapItem('e1_09', 'obra1', '1.2.3', 'Disjuntores e seccionadoras 138kV', 3, 'e1_06', 8, 700000, 'servico'),
  eapItem('e1_10', 'obra1', '1.2.4', 'Cabos de potência e aterramento', 3, 'e1_06', 4, 350000, 'servico'),
  eapItem('e1_11', 'obra1', '1.3', 'Sistemas de Proteção e Controle', 2, 'e1_01', 20, 1750000, 'grupo'),
  eapItem('e1_12', 'obra1', '1.3.1', 'Painéis de proteção e controle', 3, 'e1_11', 12, 1050000, 'servico'),
  eapItem('e1_13', 'obra1', '1.3.2', 'Cabeamento de controle e instrumentação', 3, 'e1_11', 8, 700000, 'servico'),
  eapItem('e1_14', 'obra1', '1.4', 'Comissionamento e Testes', 2, 'e1_01', 10, 875000, 'grupo'),
  eapItem('e1_15', 'obra1', '1.4.1', 'Testes de equipamentos', 3, 'e1_14', 5, 437500, 'servico'),
  eapItem('e1_16', 'obra1', '1.4.2', 'Comissionamento integrado e energização', 3, 'e1_14', 5, 437500, 'servico'),

  // =========================================================
  // OBRA 2 — LTMT 69kV Trecho 1 (R$ 4.200.000)
  // =========================================================
  eapItem('e2_01', 'obra2', '1', 'LTMT 69kV — TRECHO 1', 1, null, 100, 4200000, 'grupo'),
  eapItem('e2_02', 'obra2', '1.1', 'Obras Preliminares', 2, 'e2_01', 10, 420000, 'grupo'),
  eapItem('e2_03', 'obra2', '1.1.1', 'Abertura de faixa e acessos', 3, 'e2_02', 6, 252000, 'servico'),
  eapItem('e2_04', 'obra2', '1.1.2', 'Locação e topografia das torres', 3, 'e2_02', 4, 168000, 'servico'),
  eapItem('e2_05', 'obra2', '1.2', 'Fundações de Torres', 2, 'e2_01', 30, 1260000, 'grupo'),
  eapItem('e2_06', 'obra2', '1.2.1', 'Fundações tipo radier', 3, 'e2_05', 15, 630000, 'servico'),
  eapItem('e2_07', 'obra2', '1.2.2', 'Fundações tipo tubulão', 3, 'e2_05', 15, 630000, 'servico'),
  eapItem('e2_08', 'obra2', '1.3', 'Montagem de Torres', 2, 'e2_01', 30, 1260000, 'grupo'),
  eapItem('e2_09', 'obra2', '1.3.1', 'Montagem torres autoportantes', 3, 'e2_08', 20, 840000, 'servico'),
  eapItem('e2_10', 'obra2', '1.3.2', 'Montagem torres estaiadas', 3, 'e2_08', 10, 420000, 'servico'),
  eapItem('e2_11', 'obra2', '1.4', 'Lançamento de Cabos', 2, 'e2_01', 25, 1050000, 'grupo'),
  eapItem('e2_12', 'obra2', '1.4.1', 'Lançamento cabo OPGW', 3, 'e2_11', 10, 420000, 'servico'),
  eapItem('e2_13', 'obra2', '1.4.2', 'Lançamento cabos condutores', 3, 'e2_11', 15, 630000, 'servico'),
  eapItem('e2_14', 'obra2', '1.5', 'Conexões e Testes', 2, 'e2_01', 5, 210000, 'grupo'),
  eapItem('e2_15', 'obra2', '1.5.1', 'Regulagem e conectores', 3, 'e2_14', 3, 126000, 'servico'),
  eapItem('e2_16', 'obra2', '1.5.2', 'Testes e entrega', 3, 'e2_14', 2, 84000, 'servico'),

  // =========================================================
  // OBRA 3 — CCO São Paulo (R$ 6.100.000)
  // =========================================================
  eapItem('e3_01', 'obra3', '1', 'CENTRO DE CONTROLE DE OPERAÇÕES — SP', 1, null, 100, 6100000, 'grupo'),
  eapItem('e3_02', 'obra3', '1.1', 'Obras Civis e Arquitetura', 2, 'e3_01', 22, 1342000, 'grupo'),
  eapItem('e3_03', 'obra3', '1.1.1', 'Demolições e preparação do espaço', 3, 'e3_02', 5, 305000, 'servico'),
  eapItem('e3_04', 'obra3', '1.1.2', 'Piso elevado e forro técnico', 3, 'e3_02', 10, 610000, 'servico'),
  eapItem('e3_05', 'obra3', '1.1.3', 'Climatização e pressurização', 3, 'e3_02', 7, 427000, 'servico'),
  eapItem('e3_06', 'obra3', '1.2', 'Infraestrutura Elétrica e TI', 2, 'e3_01', 30, 1830000, 'grupo'),
  eapItem('e3_07', 'obra3', '1.2.1', 'Quadros elétricos e UPS', 3, 'e3_06', 12, 732000, 'servico'),
  eapItem('e3_08', 'obra3', '1.2.2', 'Cabeamento estruturado CAT6A', 3, 'e3_06', 10, 610000, 'servico'),
  eapItem('e3_09', 'obra3', '1.2.3', 'Fibra óptica interna e patch panels', 3, 'e3_06', 8, 488000, 'servico'),
  eapItem('e3_10', 'obra3', '1.3', 'Sistema SCADA e Automação', 2, 'e3_01', 35, 2135000, 'grupo'),
  eapItem('e3_11', 'obra3', '1.3.1', 'Servidores e workstations SCADA', 3, 'e3_10', 15, 915000, 'servico'),
  eapItem('e3_12', 'obra3', '1.3.2', 'Software de supervisão e licenças', 3, 'e3_10', 12, 732000, 'servico'),
  eapItem('e3_13', 'obra3', '1.3.3', 'Integração e configuração de pontos', 3, 'e3_10', 8, 488000, 'servico'),
  eapItem('e3_14', 'obra3', '1.4', 'Videowall e Consoles de Operação', 2, 'e3_01', 13, 793000, 'grupo'),
  eapItem('e3_15', 'obra3', '1.4.1', 'Painéis LED videowall', 3, 'e3_14', 8, 488000, 'servico'),
  eapItem('e3_16', 'obra3', '1.4.2', 'Consoles e mobiliário operacional', 3, 'e3_14', 5, 305000, 'servico'),

  // =========================================================
  // OBRA 4 — Banco de Capacitores Guarulhos (R$ 1.850.000)
  // =========================================================
  eapItem('e4_01', 'obra4', '1', 'BANCO DE CAPACITORES — GUARULHOS', 1, null, 100, 1850000, 'grupo'),
  eapItem('e4_02', 'obra4', '1.1', 'Obras Civis', 2, 'e4_01', 20, 370000, 'grupo'),
  eapItem('e4_03', 'obra4', '1.1.1', 'Preparação de base e fundação', 3, 'e4_02', 12, 222000, 'servico'),
  eapItem('e4_04', 'obra4', '1.1.2', 'Cercamento e sinalização', 3, 'e4_02', 8, 148000, 'servico'),
  eapItem('e4_05', 'obra4', '1.2', 'Fornecimento e Montagem', 2, 'e4_01', 55, 1017500, 'grupo'),
  eapItem('e4_06', 'obra4', '1.2.1', 'Banco de capacitores 6 Mvar', 3, 'e4_05', 30, 555000, 'servico'),
  eapItem('e4_07', 'obra4', '1.2.2', 'Estrutura metálica suporte', 3, 'e4_05', 10, 185000, 'servico'),
  eapItem('e4_08', 'obra4', '1.2.3', 'Chave seccionadora 15kV', 3, 'e4_05', 8, 148000, 'servico'),
  eapItem('e4_09', 'obra4', '1.2.4', 'Fusíveis e proteções internas', 3, 'e4_05', 7, 129500, 'servico'),
  eapItem('e4_10', 'obra4', '1.3', 'Sistemas de Controle', 2, 'e4_01', 18, 333000, 'grupo'),
  eapItem('e4_11', 'obra4', '1.3.1', 'Painel de controle e proteção', 3, 'e4_10', 10, 185000, 'servico'),
  eapItem('e4_12', 'obra4', '1.3.2', 'Cabeamento de controle', 3, 'e4_10', 8, 148000, 'servico'),
  eapItem('e4_13', 'obra4', '1.4', 'Comissionamento', 2, 'e4_01', 7, 129500, 'grupo'),
  eapItem('e4_14', 'obra4', '1.4.1', 'Testes de isolamento e funcionais', 3, 'e4_13', 4, 74000, 'servico'),
  eapItem('e4_15', 'obra4', '1.4.2', 'Energização e ajuste de proteções', 3, 'e4_13', 3, 55500, 'servico'),

  // =========================================================
  // OBRA 5 — Reforma SE-Norte (R$ 3.300.000)
  // =========================================================
  eapItem('e5_01', 'obra5', '1', 'REFORMA SUBESTAÇÃO SE-NORTE', 1, null, 100, 3300000, 'grupo'),
  eapItem('e5_02', 'obra5', '1.1', 'Obras Civis e Reforma', 2, 'e5_01', 25, 825000, 'grupo'),
  eapItem('e5_03', 'obra5', '1.1.1', 'Demolições e retirada de equipamentos', 3, 'e5_02', 8, 264000, 'servico'),
  eapItem('e5_04', 'obra5', '1.1.2', 'Reforma civil e pintura geral', 3, 'e5_02', 10, 330000, 'servico'),
  eapItem('e5_05', 'obra5', '1.1.3', 'Sistema de drenagem e impermeabilização', 3, 'e5_02', 7, 231000, 'servico'),
  eapItem('e5_06', 'obra5', '1.2', 'Substituição de Transformadores', 2, 'e5_01', 35, 1155000, 'grupo'),
  eapItem('e5_07', 'obra5', '1.2.1', 'Retirada de transformadores antigos', 3, 'e5_06', 10, 330000, 'servico'),
  eapItem('e5_08', 'obra5', '1.2.2', 'Instalação novos transformadores', 3, 'e5_06', 20, 660000, 'servico'),
  eapItem('e5_09', 'obra5', '1.2.3', 'Sistemas de refrigeração e acessórios', 3, 'e5_06', 5, 165000, 'servico'),
  eapItem('e5_10', 'obra5', '1.3', 'Modernização de Proteções', 2, 'e5_01', 28, 924000, 'grupo'),
  eapItem('e5_11', 'obra5', '1.3.1', 'Novos relés de proteção digitais', 3, 'e5_10', 15, 495000, 'servico'),
  eapItem('e5_12', 'obra5', '1.3.2', 'Cabeamento e conexões', 3, 'e5_10', 8, 264000, 'servico'),
  eapItem('e5_13', 'obra5', '1.3.3', 'Parametrização e testes de proteção', 3, 'e5_10', 5, 165000, 'servico'),
  eapItem('e5_14', 'obra5', '1.4', 'Comissionamento Final', 2, 'e5_01', 12, 396000, 'grupo'),
  eapItem('e5_15', 'obra5', '1.4.1', 'Testes integrados pré-energização', 3, 'e5_14', 7, 231000, 'servico'),
  eapItem('e5_16', 'obra5', '1.4.2', 'Energização e relatório final', 3, 'e5_14', 5, 165000, 'servico'),
]

// ============================================================
// CRONOGRAMA (BASELINE) — % acumulado previsto por período
// Para itens de nível 3 (folhas) de cada obra
// Lógica: distribuição em curva S realista ao longo dos meses
// ============================================================

// Obra 1 — 12 meses (Jan-Dez 2025) — itens nível 3
// Alguns itens têm início tardio de acordo com sequência construtiva
export const cronograma = {
  // OBRA 1
  e1_03: [5, 20, 50, 80, 100, 100, 100, 100, 100, 100, 100, 100],
  e1_04: [0, 5, 20, 50, 80, 100, 100, 100, 100, 100, 100, 100],
  e1_05: [0, 0, 5, 15, 40, 70, 90, 100, 100, 100, 100, 100],
  e1_07: [0, 0, 0, 10, 30, 55, 80, 100, 100, 100, 100, 100],
  e1_08: [0, 0, 0, 0, 10, 25, 50, 70, 90, 100, 100, 100],
  e1_09: [0, 0, 0, 0, 5, 20, 45, 70, 90, 100, 100, 100],
  e1_10: [0, 0, 0, 0, 0, 10, 30, 60, 85, 100, 100, 100],
  e1_12: [0, 0, 0, 0, 0, 0, 20, 50, 80, 100, 100, 100],
  e1_13: [0, 0, 0, 0, 0, 0, 15, 40, 70, 95, 100, 100],
  e1_15: [0, 0, 0, 0, 0, 0, 0, 0, 20, 60, 90, 100],
  e1_16: [0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 70, 100],

  // OBRA 2
  e2_03: [10, 50, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  e2_04: [5, 30, 80, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  e2_06: [0, 10, 30, 60, 90, 100, 100, 100, 100, 100, 100, 100],
  e2_07: [0, 5, 20, 50, 80, 100, 100, 100, 100, 100, 100, 100],
  e2_09: [0, 0, 10, 30, 55, 80, 100, 100, 100, 100, 100, 100],
  e2_10: [0, 0, 5, 20, 45, 70, 90, 100, 100, 100, 100, 100],
  e2_12: [0, 0, 0, 10, 30, 60, 85, 100, 100, 100, 100, 100],
  e2_13: [0, 0, 0, 5, 20, 50, 80, 95, 100, 100, 100, 100],
  e2_15: [0, 0, 0, 0, 0, 0, 30, 70, 100, 100, 100, 100],
  e2_16: [0, 0, 0, 0, 0, 0, 0, 20, 70, 100, 100, 100],

  // OBRA 3 — início em março (períodos 0 e 1 zerados)
  e3_03: [0, 0, 20, 70, 100, 100, 100, 100, 100, 100, 100, 100],
  e3_04: [0, 0, 5, 30, 65, 90, 100, 100, 100, 100, 100, 100],
  e3_05: [0, 0, 0, 10, 40, 75, 100, 100, 100, 100, 100, 100],
  e3_07: [0, 0, 0, 5, 25, 55, 80, 100, 100, 100, 100, 100],
  e3_08: [0, 0, 0, 0, 15, 40, 70, 90, 100, 100, 100, 100],
  e3_09: [0, 0, 0, 0, 10, 35, 65, 88, 100, 100, 100, 100],
  e3_11: [0, 0, 0, 0, 0, 20, 50, 75, 95, 100, 100, 100],
  e3_12: [0, 0, 0, 0, 0, 15, 40, 68, 90, 100, 100, 100],
  e3_13: [0, 0, 0, 0, 0, 0, 20, 50, 80, 100, 100, 100],
  e3_15: [0, 0, 0, 0, 0, 0, 0, 30, 70, 100, 100, 100],
  e3_16: [0, 0, 0, 0, 0, 0, 0, 20, 60, 95, 100, 100],

  // OBRA 4 — início em abril, término setembro (6 meses)
  e4_03: [0, 0, 0, 30, 80, 100, 100, 100, 100, 100, 100, 100],
  e4_04: [0, 0, 0, 20, 65, 100, 100, 100, 100, 100, 100, 100],
  e4_06: [0, 0, 0, 10, 40, 75, 100, 100, 100, 100, 100, 100],
  e4_07: [0, 0, 0, 15, 50, 85, 100, 100, 100, 100, 100, 100],
  e4_08: [0, 0, 0, 5, 30, 65, 95, 100, 100, 100, 100, 100],
  e4_09: [0, 0, 0, 5, 25, 60, 90, 100, 100, 100, 100, 100],
  e4_11: [0, 0, 0, 0, 20, 55, 85, 100, 100, 100, 100, 100],
  e4_12: [0, 0, 0, 0, 15, 50, 80, 100, 100, 100, 100, 100],
  e4_14: [0, 0, 0, 0, 0, 30, 75, 100, 100, 100, 100, 100],
  e4_15: [0, 0, 0, 0, 0, 20, 65, 100, 100, 100, 100, 100],

  // OBRA 5 — início em maio, término dezembro (8 meses)
  e5_03: [0, 0, 0, 0, 30, 80, 100, 100, 100, 100, 100, 100],
  e5_04: [0, 0, 0, 0, 10, 40, 75, 100, 100, 100, 100, 100],
  e5_05: [0, 0, 0, 0, 15, 50, 85, 100, 100, 100, 100, 100],
  e5_07: [0, 0, 0, 0, 20, 60, 100, 100, 100, 100, 100, 100],
  e5_08: [0, 0, 0, 0, 0, 20, 50, 80, 100, 100, 100, 100],
  e5_09: [0, 0, 0, 0, 5, 30, 65, 90, 100, 100, 100, 100],
  e5_11: [0, 0, 0, 0, 0, 10, 35, 65, 90, 100, 100, 100],
  e5_12: [0, 0, 0, 0, 0, 15, 45, 75, 95, 100, 100, 100],
  e5_13: [0, 0, 0, 0, 0, 0, 20, 55, 85, 100, 100, 100],
  e5_15: [0, 0, 0, 0, 0, 0, 0, 20, 55, 85, 100, 100],
  e5_16: [0, 0, 0, 0, 0, 0, 0, 0, 30, 70, 100, 100],
}

// ============================================================
// MEDIÇÕES — % realizado por item por período
// Período atual: Set/25 (índice 8)
// Situações variadas para mostrar atraso/adiantamento
// ============================================================

export const medicoes = {
  // OBRA 1 — Ligeiro atraso (IDP ~0.88, IDC ~0.95)
  e1_03: { realizado: 100, aprovado: true, obs: 'Concluído conforme planejado' },
  e1_04: { realizado: 95, aprovado: true, obs: 'Pequeno atraso por chuvas' },
  e1_05: { realizado: 85, aprovado: true, obs: 'Aguardando inspeção bombeiros' },
  e1_07: { realizado: 90, aprovado: true, obs: '' },
  e1_08: { realizado: 70, aprovado: true, obs: 'Transformador T2 com atraso no fornecimento' },
  e1_09: { realizado: 65, aprovado: false, obs: 'Pendência na entrega de disjuntor 145kV', status_aprovacao: 'pendente' },
  e1_10: { realizado: 75, aprovado: true, obs: '' },
  e1_12: { realizado: 55, aprovado: true, obs: 'Em andamento' },
  e1_13: { realizado: 45, aprovado: false, obs: '', status_aprovacao: 'pendente' },
  e1_15: { realizado: 0, aprovado: true, obs: 'Não iniciado — aguarda equipamentos' },
  e1_16: { realizado: 0, aprovado: true, obs: 'Não iniciado' },

  // OBRA 2 — Bem adiantada (IDP ~1.10, IDC ~1.05)
  e2_03: { realizado: 100, aprovado: true, obs: '' },
  e2_04: { realizado: 100, aprovado: true, obs: '' },
  e2_06: { realizado: 100, aprovado: true, obs: '' },
  e2_07: { realizado: 100, aprovado: true, obs: '' },
  e2_09: { realizado: 100, aprovado: true, obs: 'Adiantado — equipe reforçada' },
  e2_10: { realizado: 100, aprovado: true, obs: 'Adiantado' },
  e2_12: { realizado: 100, aprovado: true, obs: '' },
  e2_13: { realizado: 100, aprovado: false, obs: '', status_aprovacao: 'pendente' },
  e2_15: { realizado: 80, aprovado: true, obs: 'Adiantado em relação ao baseline' },
  e2_16: { realizado: 55, aprovado: false, obs: 'Testes em andamento', status_aprovacao: 'pendente' },

  // OBRA 3 — Atraso significativo (IDP ~0.75, IDC ~0.82) — zona vermelha
  e3_03: { realizado: 100, aprovado: true, obs: '' },
  e3_04: { realizado: 80, aprovado: true, obs: 'Atraso no fornecimento de piso elevado' },
  e3_05: { realizado: 60, aprovado: true, obs: 'Projeto de climatização em revisão' },
  e3_07: { realizado: 55, aprovado: true, obs: 'UPS com entrega adiada' },
  e3_08: { realizado: 45, aprovado: true, obs: 'IMPEDIMENTO CIVIL — piso não concluído' },
  e3_09: { realizado: 40, aprovado: false, obs: '', status_aprovacao: 'pendente' },
  e3_11: { realizado: 30, aprovado: true, obs: 'Aguardando liberação civil' },
  e3_12: { realizado: 20, aprovado: true, obs: 'Licenças com atraso no cliente' },
  e3_13: { realizado: 10, aprovado: false, obs: 'CRÍTICO — dependente de outros serviços', status_aprovacao: 'pendente' },
  e3_15: { realizado: 0, aprovado: true, obs: 'Não iniciado' },
  e3_16: { realizado: 0, aprovado: true, obs: 'Não iniciado' },

  // OBRA 4 — Em dia / levemente adiantada (IDP ~1.02, IDC ~0.98)
  e4_03: { realizado: 100, aprovado: true, obs: '' },
  e4_04: { realizado: 100, aprovado: true, obs: '' },
  e4_06: { realizado: 100, aprovado: true, obs: '' },
  e4_07: { realizado: 100, aprovado: true, obs: '' },
  e4_08: { realizado: 100, aprovado: true, obs: '' },
  e4_09: { realizado: 95, aprovado: true, obs: 'Pequeno ajuste pendente' },
  e4_11: { realizado: 90, aprovado: true, obs: '' },
  e4_12: { realizado: 85, aprovado: false, obs: '', status_aprovacao: 'pendente' },
  e4_14: { realizado: 50, aprovado: true, obs: 'Em andamento' },
  e4_15: { realizado: 20, aprovado: false, obs: 'Aguardando janela de manutenção', status_aprovacao: 'pendente' },

  // OBRA 5 — Atraso moderado (IDP ~0.83, IDC ~0.90) — zona amarela
  e5_03: { realizado: 100, aprovado: true, obs: '' },
  e5_04: { realizado: 55, aprovado: true, obs: 'Aprovação do projeto de pintura em atraso' },
  e5_05: { realizado: 60, aprovado: true, obs: '' },
  e5_07: { realizado: 80, aprovado: true, obs: '' },
  e5_08: { realizado: 25, aprovado: true, obs: 'Transformador novo com atraso na fábrica' },
  e5_09: { realizado: 30, aprovado: false, obs: '', status_aprovacao: 'pendente' },
  e5_11: { realizado: 15, aprovado: true, obs: 'PENDÊNCIA INFRA — aguarda quadro' },
  e5_12: { realizado: 20, aprovado: true, obs: '' },
  e5_13: { realizado: 5, aprovado: false, obs: '', status_aprovacao: 'pendente' },
  e5_15: { realizado: 0, aprovado: true, obs: 'Não iniciado' },
  e5_16: { realizado: 0, aprovado: true, obs: 'Não iniciado' },
}

// ============================================================
// FUNÇÕES AUXILIARES para busca
// ============================================================

export function getObra(id) {
  return obras.find(o => o.id === id)
}

export function getEapByObra(obraId) {
  return eap_itens.filter(e => e.obra_id === obraId)
}

export function getEapFolhas(obraId) {
  const itens = getEapByObra(obraId)
  const pais = new Set(itens.filter(i => i.pai_id).map(i => i.pai_id))
  return itens.filter(i => !pais.has(i.id))
}

export function getCronogramaItem(itemId) {
  return cronograma[itemId] || Array(12).fill(0)
}

export function getMedicaoItem(itemId) {
  return medicoes[itemId] || { realizado: 0, aprovado: false, obs: '' }
}

export function getUsuario(id) {
  return usuarios.find(u => u.id === id)
}

export function getObrasByUsuario(usuario) {
  if (!usuario) return []
  if (['admin', 'diretor', 'gerente'].includes(usuario.perfil)) {
    return obras
  }
  return obras.filter(o => (usuario.obras_vinculadas || []).includes(o.id))
}

// Retorna % previsto acumulado no período atual para um item
export function getPrevistoPeriodoAtual(itemId) {
  const crono = getCronogramaItem(itemId)
  return crono[PERIODO_ATUAL] || 0
}

// Retorna % realizado atual para um item
export function getRealizadoAtual(itemId) {
  const med = getMedicaoItem(itemId)
  return med.realizado || 0
}

// Calcula resumo de uma obra para o período atual
export function calcularResumoObra(obraId) {
  const folhas = getEapFolhas(obraId)
  if (folhas.length === 0) return null

  const totalOrcado = folhas.reduce((sum, i) => sum + i.valor_orcado, 0)

  let vp = 0 // Valor Planejado (BCWS)
  let va = 0 // Valor Agregado (BCWP)

  folhas.forEach(item => {
    const previsto = getPrevistoPeriodoAtual(item.id) / 100
    const realizado = getRealizadoAtual(item.id) / 100
    vp += item.valor_orcado * previsto
    va += item.valor_orcado * realizado
  })

  const percPrevisto = totalOrcado > 0 ? (vp / totalOrcado) * 100 : 0
  const percRealizado = totalOrcado > 0 ? (va / totalOrcado) * 100 : 0

  // IDC e IDP simplificados (usando % da obra)
  const idc = va > 0 && vp > 0 ? va / vp : (va === vp ? 1 : 0)
  const idp = vp > 0 ? va / vp : 0

  return {
    obraId,
    totalOrcado,
    percPrevisto: Math.round(percPrevisto * 10) / 10,
    percRealizado: Math.round(percRealizado * 10) / 10,
    desvioFisico: Math.round((percRealizado - percPrevisto) * 10) / 10,
    idc: Math.round(idc * 100) / 100,
    idp: Math.round(idp * 100) / 100,
    vp: Math.round(vp),
    va: Math.round(va),
    bac: totalOrcado,
  }
}
