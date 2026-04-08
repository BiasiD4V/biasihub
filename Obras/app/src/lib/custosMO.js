// ============================================================
//  custosMaoObra.js
//  Biasi Engenharia e Instalações — ERP de Gestão de Obras
//  Baseado na metodologia Aldo Dórea Mattos
//
//  Fontes:
//    ANX001-2026_Escada_Salarial_Biasi_REV00.xlsx (Projeto Energizar · PCS REG-001/2026 · REV03)
//    CALCULO_DE_IMPOSTOS_E_BDI-12.xlsx (aba CUSTOS E PROVISÕES)
//
//  Estrutura de seleção no ERP:
//    1. Selecionar cargo (FUNCOES_BIASI[n])
//    2. Selecionar step (1 a N, conforme cargo.steps)
//    3. Informar quantidade e dias úteis
//    4. calcularCustoPeriodo() retorna breakdown completo
// ============================================================

// ─── PARÂMETROS DE ENCARGOS ──────────────────────────────────
// Fonte: linha 1 (parâmetros) da aba CUSTOS E PROVISÕES
// Atualizar conforme revisão da planilha ou novo ACT/CCT.

export const ENCARGOS_PADRAO = {
  decimoTerceiro:        8.33   / 100,  // 8,33%
  ferias:                11.11  / 100,  // 11,11%
  avisoPrevioIndenizado: 3.64   / 100,  // 3,64%
  fgts:                  8.00   / 100,  // 8,00%
  fgtsAvisoPrevio:       0.2912 / 100,  // 0,2912%
  fgtsRescisao:          4.00   / 100,  // 4,00%
  sat:                   3.00   / 100,  // 3,00%  (Seguro Acidente do Trabalho)
  salEducacao:           2.50   / 100,  // 2,50%
  sistemaS:              3.30   / 100,  // 3,30%
  // Reincidência previdenciária = (sat + salEduc + sistemaS) aplicado sobre 13º e férias
  // → calculado dinamicamente em calcularEncargos()

  diasUteisMensais:      22,            // dias úteis padrão/mês
  dsrMedio:              5,             // DSR médio mensal
  adicionalPericulosidade: 0.30,        // 30% — CLT Art. 193 + NR-16
}

// ─── BENEFÍCIOS FIXOS MENSAIS ────────────────────────────────
// Fonte: aba CUSTOS E PROVISÕES — valores fixos por colaborador/mês
// Independem do salário; atualizar conforme ACT vigente.

export const BENEFICIOS_FIXOS_PADRAO = {
  plr:               92.50,   // Participação nos Lucros e Resultados (provisão mensal)
  exames:           163.97,   // Exames médicos (admissional + periódico rateado)
  cafe:             220.00,   // Café da manhã
  ajudaCusto:       205.00,   // Ajuda de custo (transporte / deslocamento)
  planoSaude:       182.68,   // Plano de saúde
  seguroVida:        16.80,   // Seguro de vida em grupo
  cartaoAlimentacao: 462.00,  // Cartão alimentação
  ferramentas:      105.00,   // Ferramentas (média geral)
  epi:              155.00,   // EPI (média geral)
}

// ─── ESCADA SALARIAL BIASI ───────────────────────────────────
// Fonte: ANX001-2026_Escada_Salarial_Biasi_REV00.xlsx — aba Escada Salarial
//
// Campos por cargo:
//   id               → identificador único
//   familia          → família de cargo (agrupamento da escada)
//   nivel            → Nível I / II / III / IV / V / Único / Lateral
//   cargo            → nome do cargo conforme escada
//   salarioBase      → Step 1 sem periculosidade (R$)
//   steps[]          → todos os steps disponíveis { step, salario }
//                       salario = valor bruto SEM adicional de periculosidade
//   temPericulosidade→ true = cargo tem adicional de 30% (CLT Art. 193 + NR-16)
//   step1ComPeri     → Step 1 já com +30% (conferência rápida)
//   rateio           → ELÉTRICA | HIDRÁULICA | MEIOAMEIO | INDIRETA

export const FUNCOES_BIASI = [

  // ════════════════════════════════════════════════════════════
  //  ELÉTRICA
  // ════════════════════════════════════════════════════════════

  // 01 · Eletricista (Instalação)
  {
    id: 'elet-inst-i',
    familia: 'Eletricista (Instalação)',
    nivel: 'Nível I',
    cargo: 'Eletricista I (Júnior) + Peri',
    salarioBase: 3238.51,
    steps: [
      { step: 1, salario: 3238.51 },
      { step: 2, salario: 3393.96 },
      { step: 3, salario: 3549.41 },
    ],
    temPericulosidade: true,
    step1ComPeri: 4210.06,
    rateio: 'ELÉTRICA',
  },
  {
    id: 'elet-inst-ii',
    familia: 'Eletricista (Instalação)',
    nivel: 'Nível II',
    cargo: 'Eletricista II (Pleno) + Peri',
    salarioBase: 3705.25,
    steps: [
      { step: 1, salario: 3705.25 },
      { step: 2, salario: 3883.10 },
      { step: 3, salario: 4060.95 },
    ],
    temPericulosidade: true,
    step1ComPeri: 4816.82,
    rateio: 'ELÉTRICA',
  },
  {
    id: 'elet-inst-iii',
    familia: 'Eletricista (Instalação)',
    nivel: 'Nível III',
    cargo: 'Eletricista III (Sênior) + Peri',
    salarioBase: 4174.12,
    steps: [
      { step: 1, salario: 4174.12 },
      { step: 2, salario: 4349.43 },
      { step: 3, salario: 4524.75 },
      { step: 4, salario: 4700.06 },
    ],
    temPericulosidade: true,
    step1ComPeri: 5426.36,
    rateio: 'ELÉTRICA',
  },

  // 02 · Eletricista Líder
  {
    id: 'elet-lider',
    familia: 'Eletricista Líder',
    nivel: 'Único',
    cargo: 'Eletricista Líder',
    salarioBase: 4382.83,
    steps: [
      { step: 1, salario: 4382.83 },
      { step: 2, salario: 4601.97 },
      { step: 3, salario: 4821.11 },
      { step: 4, salario: 5040.25 },
      { step: 5, salario: 5259.39 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4382.83,
    rateio: 'ELÉTRICA',
  },

  // 03 · Eletricista (Força e Controle)
  {
    id: 'elet-forca-controle',
    familia: 'Eletricista (Força e Controle)',
    nivel: 'Único',
    cargo: 'Eletricista Força e Controle + Peri',
    salarioBase: 3800.00,
    steps: [
      { step: 1, salario: 3800.00 },
      { step: 2, salario: 3990.00 },
      { step: 3, salario: 4180.00 },
      { step: 4, salario: 4370.00 },
      { step: 5, salario: 4560.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3800.00,
    rateio: 'ELÉTRICA',
  },

  // 04 · Eletricista de Rede
  {
    id: 'elet-rede-i',
    familia: 'Eletricista de Rede',
    nivel: 'Nível I',
    cargo: 'Eletricista de Rede I + Peri',
    salarioBase: 3238.51,
    steps: [
      { step: 1, salario: 3238.51 },
      { step: 2, salario: 3393.96 },
      { step: 3, salario: 3549.41 },
    ],
    temPericulosidade: true,
    step1ComPeri: 4210.06,
    rateio: 'ELÉTRICA',
  },
  {
    id: 'elet-rede-ii',
    familia: 'Eletricista de Rede',
    nivel: 'Nível II',
    cargo: 'Eletricista de Rede II + Peri',
    salarioBase: 3705.25,
    steps: [
      { step: 1, salario: 3705.25 },
      { step: 2, salario: 3883.10 },
      { step: 3, salario: 4060.95 },
    ],
    temPericulosidade: true,
    step1ComPeri: 4816.82,
    rateio: 'ELÉTRICA',
  },
  {
    id: 'elet-rede-iii',
    familia: 'Eletricista de Rede',
    nivel: 'Nível III',
    cargo: 'Eletricista de Rede III + Peri',
    salarioBase: 4174.12,
    steps: [
      { step: 1, salario: 4174.12 },
      { step: 2, salario: 4349.43 },
      { step: 3, salario: 4524.75 },
      { step: 4, salario: 4700.06 },
      { step: 5, salario: 4875.37 },
    ],
    temPericulosidade: true,
    step1ComPeri: 5426.36,
    rateio: 'ELÉTRICA',
  },

  // 05 · Eletricista Montador
  {
    id: 'elet-mont-i',
    familia: 'Eletricista Montador',
    nivel: 'Nível I',
    cargo: 'Eletricista Montador I',
    salarioBase: 3185.35,
    steps: [
      { step: 1, salario: 3185.35 },
      { step: 2, salario: 3338.25 },
      { step: 3, salario: 3491.14 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3185.35,
    rateio: 'ELÉTRICA',
  },
  {
    id: 'elet-mont-ii',
    familia: 'Eletricista Montador',
    nivel: 'Nível II',
    cargo: 'Eletricista Montador II',
    salarioBase: 3744.59,
    steps: [
      { step: 1, salario: 3744.59 },
      { step: 2, salario: 3924.33 },
      { step: 3, salario: 4104.07 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3744.59,
    rateio: 'ELÉTRICA',
  },
  {
    id: 'elet-mont-iii',
    familia: 'Eletricista Montador',
    nivel: 'Nível III',
    cargo: 'Eletricista Montador III',
    salarioBase: 4040.16,
    steps: [
      { step: 1, salario: 4040.16 },
      { step: 2, salario: 4209.85 },
      { step: 3, salario: 4379.53 },
      { step: 4, salario: 4549.22 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4040.16,
    rateio: 'ELÉTRICA',
  },

  // ════════════════════════════════════════════════════════════
  //  HIDRÁULICA
  // ════════════════════════════════════════════════════════════

  // 06 · Encanador
  {
    id: 'enc-hid-i',
    familia: 'Encanador',
    nivel: 'Nível I',
    cargo: 'Encanador I',
    salarioBase: 3185.35,
    steps: [
      { step: 1, salario: 3185.35 },
      { step: 2, salario: 3338.25 },
      { step: 3, salario: 3491.14 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3185.35,
    rateio: 'HIDRÁULICA',
  },
  {
    id: 'enc-hid-ii',
    familia: 'Encanador',
    nivel: 'Nível II',
    cargo: 'Encanador II',
    salarioBase: 3744.59,
    steps: [
      { step: 1, salario: 3744.59 },
      { step: 2, salario: 3924.33 },
      { step: 3, salario: 4104.07 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3744.59,
    rateio: 'HIDRÁULICA',
  },
  {
    id: 'enc-hid-iii',
    familia: 'Encanador',
    nivel: 'Nível III',
    cargo: 'Encanador III',
    salarioBase: 4040.16,
    steps: [
      { step: 1, salario: 4040.16 },
      { step: 2, salario: 4209.85 },
      { step: 3, salario: 4379.53 },
      { step: 4, salario: 4549.22 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4040.16,
    rateio: 'HIDRÁULICA',
  },

  // 07 · Encanador Líder
  {
    id: 'enc-lider',
    familia: 'Encanador Líder',
    nivel: 'Único',
    cargo: 'Encanador Líder',
    salarioBase: 4800.00,
    steps: [
      { step: 1, salario: 4800.00 },
      { step: 2, salario: 5184.00 },
      { step: 3, salario: 5568.00 },
      { step: 4, salario: 5952.00 },
      { step: 5, salario: 6336.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4800.00,
    rateio: 'HIDRÁULICA',
  },

  // ════════════════════════════════════════════════════════════
  //  MEIOAMEIO
  // ════════════════════════════════════════════════════════════

  // 08 · Ajudante
  // Ajudantes: rateio FLEXÍVEL — definido na alocação da obra (ELÉTRICA | HIDRÁULICA | CIVIL)
  {
    id: 'ajud-geral',
    familia: 'Ajudante',
    nivel: 'Nível I',
    cargo: 'Ajudante Geral / Servente',
    salarioBase: 2348.61,
    steps: [
      { step: 1, salario: 2348.61 },
      { step: 2, salario: 2431.18 },
      { step: 3, salario: 2513.76 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2348.61,
    rateio: 'FLEXÍVEL',
    rateioOpcoes: ['ELÉTRICA', 'HIDRÁULICA', 'CIVIL'],
  },
  {
    id: 'ajud-espec',
    familia: 'Ajudante',
    nivel: 'Nível II',
    cargo: 'Ajudante Espec. Elétrica/Hidráulica',
    salarioBase: 2596.33,
    steps: [
      { step: 1, salario: 2596.33 },
      { step: 2, salario: 2778.07 },
      { step: 3, salario: 2959.82 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2596.33,
    rateio: 'FLEXÍVEL',
    rateioOpcoes: ['ELÉTRICA', 'HIDRÁULICA', 'CIVIL'],
  },

  // 09 · Pedreiro
  {
    id: 'pedreiro',
    familia: 'Pedreiro',
    nivel: 'Único',
    cargo: 'Pedreiro',
    salarioBase: 3185.35,
    steps: [
      { step: 1, salario: 3185.35 },
      { step: 2, salario: 3440.18 },
      { step: 3, salario: 3695.01 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3185.35,
    rateio: 'CIVIL',
  },

  // 10 · Liderança de Obras
  {
    id: 'encarregado-inst',
    familia: 'Liderança de Obras',
    nivel: 'Nível I',
    cargo: 'Encarregado de Instalações',
    salarioBase: 4823.74,
    steps: [
      { step: 1, salario: 4823.74 },
      { step: 2, salario: 5209.64 },
      { step: 3, salario: 5595.54 },
      { step: 4, salario: 5981.44 },
      { step: 5, salario: 6367.34 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4823.74,
    rateio: 'INDIRETA',
  },
  {
    id: 'mestre-inst',
    familia: 'Liderança de Obras',
    nivel: 'Nível II',
    cargo: 'Mestre de Instalações',
    salarioBase: 7077.72,
    steps: [
      { step: 1, salario: 7077.72 },
      { step: 2, salario: 7643.94 },
      { step: 3, salario: 8210.16 },
    ],
    temPericulosidade: false,
    step1ComPeri: 7077.72,
    rateio: 'INDIRETA',
  },

  // 11 · Operadores de Equipamentos
  {
    id: 'op-munck',
    familia: 'Operador',
    nivel: 'Único',
    cargo: 'Operador de Munck',
    salarioBase: 3567.04,
    steps: [
      { step: 1, salario: 3567.04 },
      { step: 2, salario: 3745.39 },
      { step: 3, salario: 3923.74 },
      { step: 4, salario: 4102.10 },
      { step: 5, salario: 4280.45 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3567.04,
    rateio: 'INDIRETA',
  },
  {
    id: 'op-retroesc',
    familia: 'Operador',
    nivel: 'Único',
    cargo: 'Operador de Retroescavadeira',
    salarioBase: 3567.04,
    steps: [
      { step: 1, salario: 3567.04 },
      { step: 2, salario: 3745.39 },
      { step: 3, salario: 3923.74 },
      { step: 4, salario: 4102.10 },
      { step: 5, salario: 4280.45 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3567.04,
    rateio: 'INDIRETA',
  },
  {
    id: 'op-maquinas',
    familia: 'Operador',
    nivel: 'Único',
    cargo: 'Operador de Máquinas e Equipamentos',
    salarioBase: 4239.26,
    steps: [
      { step: 1, salario: 4239.26 },
      { step: 2, salario: 4451.22 },
      { step: 3, salario: 4663.19 },
      { step: 4, salario: 4875.15 },
      { step: 5, salario: 5087.11 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4239.26,
    rateio: 'INDIRETA',
  },

  // ════════════════════════════════════════════════════════════
  //  INDIRETA
  // ════════════════════════════════════════════════════════════

  // 12 · Administrativo (Escritório)
  {
    id: 'aux-adm',
    familia: 'Administrativo (Escritório)',
    nivel: 'Nível I',
    cargo: 'Auxiliar Administrativo',
    salarioBase: 2348.61,
    steps: [
      { step: 1, salario: 2348.61 },
      { step: 2, salario: 2583.47 },
      { step: 3, salario: 2818.33 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2348.61,
    rateio: 'INDIRETA',
  },
  {
    id: 'assist-adm',
    familia: 'Administrativo (Escritório)',
    nivel: 'Nível II',
    cargo: 'Assistente Administrativo',
    salarioBase: 3100.17,
    steps: [
      { step: 1, salario: 3100.17 },
      { step: 2, salario: 3252.93 },
      { step: 3, salario: 3405.70 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3100.17,
    rateio: 'INDIRETA',
  },
  {
    id: 'anal-adm',
    familia: 'Administrativo (Escritório)',
    nivel: 'Nível III',
    cargo: 'Analista Administrativo',
    salarioBase: 3721.20,
    steps: [
      { step: 1, salario: 3721.20 },
      { step: 2, salario: 4018.90 },
      { step: 3, salario: 4316.59 },
      { step: 4, salario: 4614.29 },
      { step: 5, salario: 4911.98 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3721.20,
    rateio: 'INDIRETA',
  },

  // 13 · Comercial (Escritório)
  {
    id: 'aux-com',
    familia: 'Comercial (Escritório)',
    nivel: 'Nível I',
    cargo: 'Auxiliar Comercial',
    salarioBase: 2348.61,
    steps: [
      { step: 1, salario: 2348.61 },
      { step: 2, salario: 2583.47 },
      { step: 3, salario: 2818.33 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2348.61,
    rateio: 'INDIRETA',
  },
  {
    id: 'assist-com',
    familia: 'Comercial (Escritório)',
    nivel: 'Nível II',
    cargo: 'Assistente Comercial',
    salarioBase: 3100.17,
    steps: [
      { step: 1, salario: 3100.17 },
      { step: 2, salario: 3252.93 },
      { step: 3, salario: 3405.70 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3100.17,
    rateio: 'INDIRETA',
  },
  {
    id: 'anal-com',
    familia: 'Comercial (Escritório)',
    nivel: 'Nível III',
    cargo: 'Analista Comercial',
    salarioBase: 3721.20,
    steps: [
      { step: 1, salario: 3721.20 },
      { step: 2, salario: 4018.90 },
      { step: 3, salario: 4316.59 },
      { step: 4, salario: 4614.29 },
      { step: 5, salario: 4911.98 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3721.20,
    rateio: 'INDIRETA',
  },

  // 14 · Administrativo de Obras
  {
    id: 'adm-obras-i',
    familia: 'Administrativo de Obras',
    nivel: 'Nível I',
    cargo: 'Admin. Obras I (Jr.)',
    salarioBase: 2636.74,
    steps: [
      { step: 1, salario: 2636.74 },
      { step: 2, salario: 2847.68 },
      { step: 3, salario: 3058.62 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2636.74,
    rateio: 'INDIRETA',
  },
  {
    id: 'adm-obras-ii',
    familia: 'Administrativo de Obras',
    nivel: 'Nível II',
    cargo: 'Admin. Obras II (Pl.)',
    salarioBase: 3295.92,
    steps: [
      { step: 1, salario: 3295.92 },
      { step: 2, salario: 3559.60 },
      { step: 3, salario: 3823.27 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3295.92,
    rateio: 'INDIRETA',
  },
  {
    id: 'adm-obras-iii',
    familia: 'Administrativo de Obras',
    nivel: 'Nível III',
    cargo: 'Admin. Obras III (Sr.)',
    salarioBase: 4119.91,
    steps: [
      { step: 1, salario: 4119.91 },
      { step: 2, salario: 4367.10 },
      { step: 3, salario: 4614.30 },
      { step: 4, salario: 4861.49 },
      { step: 5, salario: 5108.68 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4119.91,
    rateio: 'INDIRETA',
  },

  // 15 · Auxiliar de Engenharia
  {
    id: 'aux-eng-i',
    familia: 'Auxiliar de Engenharia',
    nivel: 'Nível I',
    cargo: 'Auxiliar de Engenharia I (Jr.)',
    salarioBase: 2348.61,
    steps: [
      { step: 1, salario: 2348.61 },
      { step: 2, salario: 2467.71 },
      { step: 3, salario: 2586.80 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2348.61,
    rateio: 'INDIRETA',
  },
  {
    id: 'aux-eng-ii',
    familia: 'Auxiliar de Engenharia',
    nivel: 'Nível II',
    cargo: 'Auxiliar de Engenharia II (Pl.)',
    salarioBase: 2700.90,
    steps: [
      { step: 1, salario: 2700.90 },
      { step: 2, salario: 2837.86 },
      { step: 3, salario: 2974.82 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2700.90,
    rateio: 'INDIRETA',
  },
  {
    id: 'aux-eng-iii',
    familia: 'Auxiliar de Engenharia',
    nivel: 'Nível III',
    cargo: 'Auxiliar de Engenharia III (Sr.)',
    salarioBase: 3100.17,
    steps: [
      { step: 1, salario: 3100.17 },
      { step: 2, salario: 3255.18 },
      { step: 3, salario: 3410.19 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3100.17,
    rateio: 'INDIRETA',
  },

  // 16 · Assistente de Engenharia
  {
    id: 'assist-eng-i',
    familia: 'Assistente de Engenharia',
    nivel: 'Nível I',
    cargo: 'Assist. Engenharia I (Jr.)',
    salarioBase: 3500.00,
    steps: [
      { step: 1, salario: 3500.00 },
      { step: 2, salario: 3677.48 },
      { step: 3, salario: 3854.96 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3500.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'assist-eng-ii',
    familia: 'Assistente de Engenharia',
    nivel: 'Nível II',
    cargo: 'Assist. Engenharia II (Pl.)',
    salarioBase: 4025.00,
    steps: [
      { step: 1, salario: 4025.00 },
      { step: 2, salario: 4229.10 },
      { step: 3, salario: 4433.21 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4025.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'assist-eng-iii',
    familia: 'Assistente de Engenharia',
    nivel: 'Nível III',
    cargo: 'Assist. Engenharia III (Sr.)',
    salarioBase: 4628.75,
    steps: [
      { step: 1, salario: 4628.75 },
      { step: 2, salario: 4860.19 },
      { step: 3, salario: 5091.62 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4628.75,
    rateio: 'INDIRETA',
  },

  // 17 · Analista de Engenharia
  {
    id: 'anal-eng-i',
    familia: 'Analista de Engenharia',
    nivel: 'Nível I',
    cargo: 'Analista Eng. I (Jr.)',
    salarioBase: 5322.06,
    steps: [
      { step: 1, salario: 5322.06 },
      { step: 2, salario: 5508.33 },
      { step: 3, salario: 5694.60 },
    ],
    temPericulosidade: false,
    step1ComPeri: 5322.06,
    rateio: 'INDIRETA',
  },
  {
    id: 'anal-eng-ii',
    familia: 'Analista de Engenharia',
    nivel: 'Nível II',
    cargo: 'Analista Eng. II (Pl.)',
    salarioBase: 5979.33,
    steps: [
      { step: 1, salario: 5979.33 },
      { step: 2, salario: 6188.61 },
      { step: 3, salario: 6397.89 },
    ],
    temPericulosidade: false,
    step1ComPeri: 5979.33,
    rateio: 'INDIRETA',
  },
  {
    id: 'anal-eng-iii',
    familia: 'Analista de Engenharia',
    nivel: 'Nível III',
    cargo: 'Analista Eng. III (Sr.)',
    salarioBase: 6717.78,
    steps: [
      { step: 1, salario: 6717.78 },
      { step: 2, salario: 6952.90 },
      { step: 3, salario: 7188.03 },
    ],
    temPericulosidade: false,
    step1ComPeri: 6717.78,
    rateio: 'INDIRETA',
  },

  // 18 · Engenharia (Gestão)
  {
    id: 'eng-inst',
    familia: 'Engenharia (Gestão)',
    nivel: 'Nível I',
    cargo: 'Engenheiro de Instalações',
    salarioBase: 7272.00,
    steps: [
      { step: 1, salario: 7272.00 },
      { step: 2, salario: 7676.00 },
      { step: 3, salario: 8080.00 },
      { step: 4, salario: 8484.00 },
      { step: 5, salario: 8888.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 7272.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'sup-inst',
    familia: 'Engenharia (Gestão)',
    nivel: 'Nível II',
    cargo: 'Supervisor de Instalações',
    salarioBase: 9696.00,
    steps: [
      { step: 1, salario: 9696.00 },
      { step: 2, salario: 10100.00 },
      { step: 3, salario: 10504.00 },
      { step: 4, salario: 10908.00 },
      { step: 5, salario: 11312.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 9696.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'coord-inst',
    familia: 'Engenharia (Gestão)',
    nivel: 'Nível III',
    cargo: 'Coordenador de Instalações',
    salarioBase: 10908.00,
    steps: [
      { step: 1, salario: 10908.00 },
      { step: 2, salario: 11362.50 },
      { step: 3, salario: 11817.00 },
      { step: 4, salario: 12271.50 },
      { step: 5, salario: 12726.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 10908.00,
    rateio: 'INDIRETA',
  },

  // 19 · Financeiro
  {
    id: 'aux-fin',
    familia: 'Financeiro',
    nivel: 'Nível I',
    cargo: 'Auxiliar Financeiro',
    salarioBase: 2923.80,
    steps: [
      { step: 1, salario: 2923.80 },
      { step: 2, salario: 3069.99 },
      { step: 3, salario: 3216.18 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2923.80,
    rateio: 'INDIRETA',
  },
  {
    id: 'assist-fin',
    familia: 'Financeiro',
    nivel: 'Nível II',
    cargo: 'Assistente Financeiro',
    salarioBase: 3298.49,
    steps: [
      { step: 1, salario: 3298.49 },
      { step: 2, salario: 3461.03 },
      { step: 3, salario: 3623.56 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3298.49,
    rateio: 'INDIRETA',
  },
  {
    id: 'anal-fin',
    familia: 'Financeiro',
    nivel: 'Nível III',
    cargo: 'Analista Financeiro',
    salarioBase: 3721.20,
    steps: [
      { step: 1, salario: 3721.20 },
      { step: 2, salario: 4018.90 },
      { step: 3, salario: 4316.59 },
      { step: 4, salario: 4614.29 },
      { step: 5, salario: 4911.98 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3721.20,
    rateio: 'INDIRETA',
  },
  {
    id: 'coord-fin',
    familia: 'Financeiro',
    nivel: 'Nível IV',
    cargo: 'Coordenador Financeiro',
    salarioBase: 5528.64,
    steps: [
      { step: 1, salario: 5528.64 },
      { step: 2, salario: 5805.07 },
      { step: 3, salario: 6081.50 },
      { step: 4, salario: 6357.94 },
      { step: 5, salario: 6634.37 },
    ],
    temPericulosidade: false,
    step1ComPeri: 5528.64,
    rateio: 'INDIRETA',
  },

  // 20 · Recursos Humanos
  {
    id: 'aux-rh',
    familia: 'Recursos Humanos',
    nivel: 'Nível I',
    cargo: 'Auxiliar de RH',
    salarioBase: 2348.61,
    steps: [
      { step: 1, salario: 2348.61 },
      { step: 2, salario: 2466.04 },
      { step: 3, salario: 2583.47 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2348.61,
    rateio: 'INDIRETA',
  },
  {
    id: 'assist-rh',
    familia: 'Recursos Humanos',
    nivel: 'Nível II',
    cargo: 'Assistente de RH',
    salarioBase: 2935.76,
    steps: [
      { step: 1, salario: 2935.76 },
      { step: 2, salario: 3080.43 },
      { step: 3, salario: 3225.09 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2935.76,
    rateio: 'INDIRETA',
  },
  {
    id: 'anal-rh',
    familia: 'Recursos Humanos',
    nivel: 'Nível III',
    cargo: 'Analista de RH',
    salarioBase: 3669.70,
    steps: [
      { step: 1, salario: 3669.70 },
      { step: 2, salario: 3963.28 },
      { step: 3, salario: 4256.86 },
      { step: 4, salario: 4550.43 },
      { step: 5, salario: 4844.01 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3669.70,
    rateio: 'INDIRETA',
  },
  {
    id: 'coord-rh',
    familia: 'Recursos Humanos',
    nivel: 'Nível IV',
    cargo: 'Coordenador de RH',
    salarioBase: 5528.64,
    steps: [
      { step: 1, salario: 5528.64 },
      { step: 2, salario: 5805.07 },
      { step: 3, salario: 6081.50 },
      { step: 4, salario: 6357.94 },
      { step: 5, salario: 6634.37 },
    ],
    temPericulosidade: false,
    step1ComPeri: 5528.64,
    rateio: 'INDIRETA',
  },

  // 21 · Técnico de Segurança
  {
    id: 'tst-i',
    familia: 'Técnico de Segurança',
    nivel: 'Nível I',
    cargo: 'Téc. Segurança I (Jr.)',
    salarioBase: 3800.00,
    steps: [
      { step: 1, salario: 3800.00 },
      { step: 2, salario: 3994.87 },
      { step: 3, salario: 4189.74 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3800.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'tst-ii',
    familia: 'Técnico de Segurança',
    nivel: 'Nível II',
    cargo: 'Téc. Segurança II (Pl.)',
    salarioBase: 4370.00,
    steps: [
      { step: 1, salario: 4370.00 },
      { step: 2, salario: 4594.10 },
      { step: 3, salario: 4818.21 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4370.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'tst-iii',
    familia: 'Técnico de Segurança',
    nivel: 'Nível III',
    cargo: 'Téc. Segurança III (Sr.)',
    salarioBase: 5025.00,
    steps: [
      { step: 1, salario: 5025.00 },
      { step: 2, salario: 5326.50 },
      { step: 3, salario: 5628.00 },
      { step: 4, salario: 5929.50 },
      { step: 5, salario: 6231.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 5025.00,
    rateio: 'INDIRETA',
  },

  // 22 · Engenheiro de Segurança
  {
    id: 'eng-seg',
    familia: 'Eng. Segurança',
    nivel: 'Nível I',
    cargo: 'Engenheiro de Segurança',
    salarioBase: 7272.00,
    steps: [
      { step: 1, salario: 7272.00 },
      { step: 2, salario: 7676.00 },
      { step: 3, salario: 8080.00 },
      { step: 4, salario: 8484.00 },
      { step: 5, salario: 8888.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 7272.00,
    rateio: 'INDIRETA',
  },

  // 23 · Almoxarifado (Central)
  {
    id: 'aux-almox-central',
    familia: 'Almoxarifado (Central)',
    nivel: 'Nível I',
    cargo: 'Auxiliar de Almoxarifado',
    salarioBase: 2751.56,
    steps: [
      { step: 1, salario: 2751.56 },
      { step: 2, salario: 2870.07 },
      { step: 3, salario: 2988.58 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2751.56,
    rateio: 'INDIRETA',
  },
  {
    id: 'assist-almox-central',
    familia: 'Almoxarifado (Central)',
    nivel: 'Nível II',
    cargo: 'Assistente de Almoxarife',
    salarioBase: 3107.09,
    steps: [
      { step: 1, salario: 3107.09 },
      { step: 2, salario: 3107.09 },
      { step: 3, salario: 3107.09 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3107.09,
    rateio: 'INDIRETA',
  },
  {
    id: 'anal-almox-central',
    familia: 'Almoxarifado (Central)',
    nivel: 'Nível III',
    cargo: 'Analista de Almoxarife',
    salarioBase: 3107.09,
    steps: [
      { step: 1, salario: 3107.09 },
      { step: 2, salario: 3240.91 },
      { step: 3, salario: 3374.74 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3107.09,
    rateio: 'INDIRETA',
  },
  {
    id: 'almoxarife-central',
    familia: 'Almoxarifado (Central)',
    nivel: 'Nível IV',
    cargo: 'Almoxarife',
    salarioBase: 3508.56,
    steps: [
      { step: 1, salario: 3508.56 },
      { step: 2, salario: 3642.38 },
      { step: 3, salario: 3776.21 },
      { step: 4, salario: 3910.03 },
      { step: 5, salario: 4043.85 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3508.56,
    rateio: 'INDIRETA',
  },

  // 24 · Almoxarifado (Obras)
  {
    id: 'aux-almox-obras',
    familia: 'Almoxarifado (Obras)',
    nivel: 'Nível I',
    cargo: 'Auxiliar Almox. Obras',
    salarioBase: 2280.00,
    steps: [
      { step: 1, salario: 2280.00 },
      { step: 2, salario: 2390.00 },
      { step: 3, salario: 2500.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2280.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'assist-almox-obras',
    familia: 'Almoxarifado (Obras)',
    nivel: 'Nível II',
    cargo: 'Assistente Almox. Obras',
    salarioBase: 2610.00,
    steps: [
      { step: 1, salario: 2610.00 },
      { step: 2, salario: 2610.00 },
      { step: 3, salario: 2610.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2610.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'anal-almox-obras',
    familia: 'Almoxarifado (Obras)',
    nivel: 'Nível III',
    cargo: 'Analista Almox. Obras',
    salarioBase: 2610.00,
    steps: [
      { step: 1, salario: 2610.00 },
      { step: 2, salario: 2740.00 },
      { step: 3, salario: 2870.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2610.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'almoxarife-obras',
    familia: 'Almoxarifado (Obras)',
    nivel: 'Nível IV',
    cargo: 'Almoxarife de Obras',
    salarioBase: 3000.00,
    steps: [
      { step: 1, salario: 3000.00 },
      { step: 2, salario: 3130.00 },
      { step: 3, salario: 3260.00 },
      { step: 4, salario: 3390.00 },
      { step: 5, salario: 3520.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3000.00,
    rateio: 'INDIRETA',
  },

  // 25 · Suprimentos
  {
    id: 'comprador-jr',
    familia: 'Suprimentos',
    nivel: 'Nível I',
    cargo: 'Comprador Jr.',
    salarioBase: 3185.35,
    steps: [
      { step: 1, salario: 3185.35 },
      { step: 2, salario: 3344.62 },
      { step: 3, salario: 3503.88 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3185.35,
    rateio: 'INDIRETA',
  },
  {
    id: 'comprador-pl',
    familia: 'Suprimentos',
    nivel: 'Nível II',
    cargo: 'Comprador Pl.',
    salarioBase: 3744.59,
    steps: [
      { step: 1, salario: 3744.59 },
      { step: 2, salario: 3913.10 },
      { step: 3, salario: 4081.60 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3744.59,
    rateio: 'INDIRETA',
  },
  {
    id: 'comprador-sr',
    familia: 'Suprimentos',
    nivel: 'Nível III',
    cargo: 'Comprador Sr.',
    salarioBase: 4040.16,
    steps: [
      { step: 1, salario: 4040.16 },
      { step: 2, salario: 4363.37 },
      { step: 3, salario: 4686.59 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4040.16,
    rateio: 'INDIRETA',
  },
  {
    id: 'sup-suprimentos',
    familia: 'Suprimentos',
    nivel: 'Nível IV',
    cargo: 'Supervisor de Suprimentos',
    salarioBase: 5036.38,
    steps: [
      { step: 1, salario: 5036.38 },
      { step: 2, salario: 5287.23 },
      { step: 3, salario: 5538.09 },
    ],
    temPericulosidade: false,
    step1ComPeri: 5036.38,
    rateio: 'INDIRETA',
  },
  {
    id: 'coord-suprimentos',
    familia: 'Suprimentos',
    nivel: 'Nível V',
    cargo: 'Coordenador de Suprimentos',
    salarioBase: 6295.48,
    steps: [
      { step: 1, salario: 6295.48 },
      { step: 2, salario: 6799.11 },
      { step: 3, salario: 7302.75 },
      { step: 4, salario: 7806.39 },
      { step: 5, salario: 8310.03 },
    ],
    temPericulosidade: false,
    step1ComPeri: 6295.48,
    rateio: 'INDIRETA',
  },

  // 26 · Motorista
  {
    id: 'motorista-i',
    familia: 'Motorista',
    nivel: 'Nível I',
    cargo: 'Motorista I',
    salarioBase: 2810.04,
    steps: [
      { step: 1, salario: 2810.04 },
      { step: 2, salario: 3028.28 },
      { step: 3, salario: 3246.53 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2810.04,
    rateio: 'INDIRETA',
  },

  // 27 · Coordenador de Engenharia (Central)
  {
    id: 'coord-eng-central',
    familia: 'Coordenador (Central)',
    nivel: 'Lateral',
    cargo: 'Coordenador de Engenharia',
    salarioBase: 12120.00,
    steps: [
      { step: 1, salario: 12120.00 },
      { step: 2, salario: 13089.60 },
      { step: 3, salario: 14059.20 },
      { step: 4, salario: 15028.80 },
      { step: 5, salario: 15998.40 },
    ],
    temPericulosidade: false,
    step1ComPeri: 12120.00,
    rateio: 'INDIRETA',
  },

  // 28 · Gerência (Central)
  {
    id: 'ger-operacoes',
    familia: 'Gerência (Central)',
    nivel: 'Lateral',
    cargo: 'Gerente de Operações/Eng.',
    salarioBase: 14544.00,
    steps: [
      { step: 1, salario: 14544.00 },
      { step: 2, salario: 15707.52 },
      { step: 3, salario: 16871.04 },
      { step: 4, salario: 18034.56 },
      { step: 5, salario: 19198.08 },
    ],
    temPericulosidade: false,
    step1ComPeri: 14544.00,
    rateio: 'INDIRETA',
  },

  // 29 · Comercial (Gestão)
  {
    id: 'coord-comercial',
    familia: 'Comercial (Gestão)',
    nivel: 'Lateral',
    cargo: 'Coordenador Comercial',
    salarioBase: 7500.00,
    steps: [
      { step: 1, salario: 7500.00 },
      { step: 2, salario: 8100.00 },
      { step: 3, salario: 8700.00 },
      { step: 4, salario: 9300.00 },
      { step: 5, salario: 9900.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 7500.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'ger-comercial',
    familia: 'Comercial (Gestão)',
    nivel: 'Lateral',
    cargo: 'Gerente Comercial',
    salarioBase: 12000.00,
    steps: [
      { step: 1, salario: 12000.00 },
      { step: 2, salario: 12960.00 },
      { step: 3, salario: 13920.00 },
      { step: 4, salario: 14880.00 },
      { step: 5, salario: 15840.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 12000.00,
    rateio: 'INDIRETA',
  },

  // 30 · Orçamentos / Custos
  {
    id: 'orc-jr',
    familia: 'Orçamentos / Custos',
    nivel: 'Nível I',
    cargo: 'Orçamentista I (Jr.)',
    salarioBase: 3500.00,
    steps: [
      { step: 1, salario: 3500.00 },
      { step: 2, salario: 3833.33 },
      { step: 3, salario: 4166.67 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3500.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'orc-pl',
    familia: 'Orçamentos / Custos',
    nivel: 'Nível II',
    cargo: 'Orçamentista II (Pl.)',
    salarioBase: 4500.00,
    steps: [
      { step: 1, salario: 4500.00 },
      { step: 2, salario: 4933.33 },
      { step: 3, salario: 5366.67 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4500.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'orc-sr',
    familia: 'Orçamentos / Custos',
    nivel: 'Nível III',
    cargo: 'Orçamentista III (Sr.)',
    salarioBase: 5800.00,
    steps: [
      { step: 1, salario: 5800.00 },
      { step: 2, salario: 6290.67 },
      { step: 3, salario: 6781.33 },
      { step: 4, salario: 7272.00 },
      { step: 5, salario: 7762.67 },
    ],
    temPericulosidade: false,
    step1ComPeri: 5800.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'eng-custos',
    familia: 'Orçamentos / Custos',
    nivel: 'Nível IV',
    cargo: 'Engenheiro de Custos',
    salarioBase: 7272.00,
    steps: [
      { step: 1, salario: 7272.00 },
      { step: 2, salario: 7762.67 },
      { step: 3, salario: 8253.33 },
      { step: 4, salario: 8744.00 },
      { step: 5, salario: 9234.67 },
    ],
    temPericulosidade: false,
    step1ComPeri: 7272.00,
    rateio: 'INDIRETA',
  },

  // 31 · Planejamento de Obras
  {
    id: 'plan-jr',
    familia: 'Planejamento de Obras',
    nivel: 'Nível I',
    cargo: 'Planejador de Obras I (Jr.)',
    salarioBase: 3200.00,
    steps: [
      { step: 1, salario: 3200.00 },
      { step: 2, salario: 3533.33 },
      { step: 3, salario: 3866.67 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3200.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'plan-pl',
    familia: 'Planejamento de Obras',
    nivel: 'Nível II',
    cargo: 'Planejador de Obras II (Pl.)',
    salarioBase: 4200.00,
    steps: [
      { step: 1, salario: 4200.00 },
      { step: 2, salario: 4633.33 },
      { step: 3, salario: 5066.67 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4200.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'plan-sr',
    familia: 'Planejamento de Obras',
    nivel: 'Nível III',
    cargo: 'Planejador de Obras III (Sr.)',
    salarioBase: 5500.00,
    steps: [
      { step: 1, salario: 5500.00 },
      { step: 2, salario: 6166.67 },
      { step: 3, salario: 6833.33 },
      { step: 4, salario: 7500.00 },
      { step: 5, salario: 8166.67 },
    ],
    temPericulosidade: false,
    step1ComPeri: 5500.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'coord-plan',
    familia: 'Planejamento de Obras',
    nivel: 'Nível IV',
    cargo: 'Coord. de Planejamento',
    salarioBase: 7500.00,
    steps: [
      { step: 1, salario: 7500.00 },
      { step: 2, salario: 8100.00 },
      { step: 3, salario: 8700.00 },
      { step: 4, salario: 9300.00 },
      { step: 5, salario: 9900.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 7500.00,
    rateio: 'INDIRETA',
  },

  // 32 · Tecnologia da Informação
  {
    id: 'ti-sup-i',
    familia: 'Tecnologia da Informação',
    nivel: 'Nível I',
    cargo: 'Analista de Suporte/TI I (Jr.)',
    salarioBase: 2800.00,
    steps: [
      { step: 1, salario: 2800.00 },
      { step: 2, salario: 3133.33 },
      { step: 3, salario: 3466.67 },
    ],
    temPericulosidade: false,
    step1ComPeri: 2800.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'ti-sup-ii',
    familia: 'Tecnologia da Informação',
    nivel: 'Nível II',
    cargo: 'Analista de Suporte/TI II (Pl.)',
    salarioBase: 3800.00,
    steps: [
      { step: 1, salario: 3800.00 },
      { step: 2, salario: 4200.00 },
      { step: 3, salario: 4600.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 3800.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'ti-sup-iii',
    familia: 'Tecnologia da Informação',
    nivel: 'Nível III',
    cargo: 'Analista de Suporte/TI III (Sr.)',
    salarioBase: 5000.00,
    steps: [
      { step: 1, salario: 5000.00 },
      { step: 2, salario: 5300.00 },
      { step: 3, salario: 5600.00 },
      { step: 4, salario: 5900.00 },
      { step: 5, salario: 6200.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 5000.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'dev-i',
    familia: 'Tecnologia da Informação',
    nivel: 'Nível I',
    cargo: 'Desenvolvedor de Software I (Jr.)',
    salarioBase: 4000.00,
    steps: [
      { step: 1, salario: 4000.00 },
      { step: 2, salario: 4833.33 },
      { step: 3, salario: 5666.67 },
    ],
    temPericulosidade: false,
    step1ComPeri: 4000.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'dev-ii',
    familia: 'Tecnologia da Informação',
    nivel: 'Nível II',
    cargo: 'Desenvolvedor de Software II (Pl.)',
    salarioBase: 6500.00,
    steps: [
      { step: 1, salario: 6500.00 },
      { step: 2, salario: 7333.33 },
      { step: 3, salario: 8166.67 },
    ],
    temPericulosidade: false,
    step1ComPeri: 6500.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'dev-iii',
    familia: 'Tecnologia da Informação',
    nivel: 'Nível III',
    cargo: 'Desenvolvedor de Software III (Sr.)',
    salarioBase: 9000.00,
    steps: [
      { step: 1, salario: 9000.00 },
      { step: 2, salario: 9720.00 },
      { step: 3, salario: 10440.00 },
      { step: 4, salario: 11160.00 },
      { step: 5, salario: 11880.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 9000.00,
    rateio: 'INDIRETA',
  },
  {
    id: 'coord-ti',
    familia: 'Tecnologia da Informação',
    nivel: 'Lateral',
    cargo: 'Coord. de TI',
    salarioBase: 8500.00,
    steps: [
      { step: 1, salario: 8500.00 },
      { step: 2, salario: 9010.00 },
      { step: 3, salario: 9520.00 },
      { step: 4, salario: 10030.00 },
      { step: 5, salario: 10540.00 },
    ],
    temPericulosidade: false,
    step1ComPeri: 8500.00,
    rateio: 'INDIRETA',
  },
]

// ─── CONFIGURAÇÃO DE EXIBIÇÃO POR RATEIO ─────────────────────

export const RATEIO_CONFIG = {
  ELÉTRICA:   { label: 'Elétrica',   cor: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  HIDRÁULICA: { label: 'Hidráulica', cor: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  CIVIL:      { label: 'Civil',      cor: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  INDIRETA:   { label: 'Indireta',   cor: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  FLEXÍVEL:   { label: 'Flexível',   cor: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
}

// ─── COMPATIBILIDADE RETROATIVA ──────────────────────────────
// Lista plana usada em componentes antigos que importam ESCADA_SALARIAL_BIASI.
// Para novos componentes, usar FUNCOES_BIASI diretamente com seleção de step.

export const ESCADA_SALARIAL_BIASI = FUNCOES_BIASI.map(c => ({
  id:               c.id,
  cargo:            c.cargo,
  familia:          c.familia,
  nivel:            c.nivel,
  salarioBase:      c.salarioBase,   // Step 1 sem periculosidade
  temPericulosidade: c.temPericulosidade,
  rateio:           c.rateio,
  categoria:        c.familia,
  steps:            c.steps,
  step1ComPeri:     c.step1ComPeri,
}))

// ─── ENGINE DE CÁLCULO ───────────────────────────────────────

/**
 * Retorna o salário bruto de um cargo em um step específico,
 * aplicando o adicional de periculosidade (30%) quando cabível.
 *
 * @param {object} cargo       - item de FUNCOES_BIASI
 * @param {number} stepNum     - número do step desejado (1-based)
 * @param {object} enc         - parâmetros de encargos (default: ENCARGOS_PADRAO)
 * @returns {number} salário bruto efetivo em R$
 */
export function salarioEfetivoPorStep(cargo, stepNum, enc = ENCARGOS_PADRAO) {
  const stepData = cargo.steps.find(s => s.step === stepNum) ?? cargo.steps[0]
  return cargo.temPericulosidade
    ? stepData.salario * (1 + enc.adicionalPericulosidade)
    : stepData.salario
}

/**
 * Calcula o salário bruto (Step 1) com ou sem periculosidade.
 * Mantido para compatibilidade com calcularCustoMensal() legado.
 *
 * @param {number} salarioBase
 * @param {boolean} temPericulosidade
 * @param {object} enc
 * @returns {number}
 */
export function calcularSalarioBruto(salarioBase, temPericulosidade, enc = ENCARGOS_PADRAO) {
  return temPericulosidade
    ? salarioBase * (1 + enc.adicionalPericulosidade)
    : salarioBase
}

/**
 * Soma todos os benefícios fixos mensais.
 *
 * @param {object} beneficios - mapa de benefícios (default: BENEFICIOS_FIXOS_PADRAO)
 * @returns {number}
 */
export function calcularTotalBeneficios(beneficios = BENEFICIOS_FIXOS_PADRAO) {
  return Object.values(beneficios).reduce((s, v) => s + v, 0)
}

/**
 * Calcula o detalhamento completo de encargos sobre o salário bruto.
 * Segue a lógica da aba CUSTOS E PROVISÕES da Biasi.
 *
 * @param {number} salarioBruto - salário efetivo (com peri se aplicável)
 * @param {object} enc          - parâmetros de encargos
 * @returns {object}            - encargos detalhados + total
 */
export function calcularEncargos(salarioBruto, enc = ENCARGOS_PADRAO) {
  const decimoTerceiro = salarioBruto * enc.decimoTerceiro
  const ferias         = salarioBruto * enc.ferias
  const avisoPrevio    = salarioBruto * enc.avisoPrevioIndenizado
  const fgts           = salarioBruto * enc.fgts
  const fgtsAP         = salarioBruto * enc.fgtsAvisoPrevio
  const fgtsResc       = salarioBruto * enc.fgtsRescisao
  const sat            = salarioBruto * enc.sat
  const salEduc        = salarioBruto * enc.salEducacao
  const sistS          = salarioBruto * enc.sistemaS

  // Reincidência previdenciária: (SAT + SalEduc + SistemaS) aplicado sobre 13º e férias
  const baseReinc       = enc.sat + enc.salEducacao + enc.sistemaS
  const reincidencia13  = decimoTerceiro * baseReinc
  const reincidenciaFer = ferias * baseReinc

  const total =
    decimoTerceiro + ferias + avisoPrevio +
    fgts + fgtsAP + fgtsResc +
    sat + salEduc + sistS +
    reincidencia13 + reincidenciaFer

  return {
    decimoTerceiro,
    ferias,
    avisoPrevio,
    fgts,
    fgtsAP,
    fgtsResc,
    sat,
    salEduc,
    sistS,
    reincidencia13,
    reincidenciaFer,
    total,
  }
}

/**
 * Calcula o custo mensal completo por funcionário (1 pessoa, 22 dias úteis),
 * com suporte à seleção de step.
 *
 * @param {object} cargo    - item de FUNCOES_BIASI
 * @param {number} stepNum  - step escolhido (1-based; default: 1)
 * @param {object} enc      - parâmetros de encargos
 * @param {object} ben      - benefícios fixos
 * @returns {object}        - breakdown completo do custo mensal
 */
export function calcularCustoMensal(
  cargo,
  stepNum = 1,
  enc = ENCARGOS_PADRAO,
  ben = BENEFICIOS_FIXOS_PADRAO
) {
  const salarioBruto = salarioEfetivoPorStep(cargo, stepNum, enc)
  const encargosObj  = calcularEncargos(salarioBruto, enc)
  const beneficios   = calcularTotalBeneficios(ben)

  // Custo Folha = salário + encargos (sem benefícios fixos)
  const custoFolha = salarioBruto + encargosObj.total

  // Total Despesas Mensal = custo folha + benefícios
  const totalMensal = custoFolha + beneficios

  // Custo por dia útil
  const custoDiario = totalMensal / enc.diasUteisMensais

  return {
    cargo,
    stepNum,
    salarioBruto,
    encargos:           encargosObj,
    beneficios,
    beneficiosDetalhado: ben,
    custoFolha,
    totalMensal,
    custoDiario,
  }
}

/**
 * Calcula o custo para um período específico (N dias úteis, Q funcionários),
 * com suporte à seleção de step.
 *
 * @param {object} cargo       - item de FUNCOES_BIASI
 * @param {number} quantidade  - número de profissionais
 * @param {number} diasUteis   - dias úteis do período
 * @param {number} stepNum     - step escolhido (1-based; default: 1)
 * @param {object} enc         - parâmetros de encargos
 * @param {object} ben         - benefícios fixos
 * @returns {object}
 */
export function calcularCustoPeriodo(
  cargo,
  quantidade,
  diasUteis,
  stepNum = 1,
  enc = ENCARGOS_PADRAO,
  ben = BENEFICIOS_FIXOS_PADRAO
) {
  const mensal = calcularCustoMensal(cargo, stepNum, enc, ben)
  const meses  = diasUteis / enc.diasUteisMensais

  const custoFolhaMensal   = mensal.custoFolha  * quantidade
  const totalMensalQtd     = mensal.totalMensal * quantidade
  const custoFolhaPeriodo  = mensal.custoFolha  * meses * quantidade
  const totalPeriodo       = mensal.totalMensal * meses * quantidade

  return {
    cargo,
    stepNum,
    quantidade,
    diasUteis,
    meses,
    mensal,            // custo por funcionário / mês (breakdown completo)
    custoFolhaMensal,  // custo folha × quantidade / mês
    totalMensalQtd,    // total com benefícios × quantidade / mês
    custoFolhaPeriodo, // custo folha × quantidade × período
    totalPeriodo,      // total com benefícios × quantidade × período
    rateio: cargo.rateio,
  }
}

/**
 * Agrupa resultados de calcularCustoPeriodo() por categoria de rateio,
 * retornando subtotais e total geral.
 *
 * @param {Array} linhas - array de resultados de calcularCustoPeriodo()
 * @returns {object}     - { ELÉTRICA, HIDRÁULICA, MEIOAMEIO, INDIRETA, TOTAL }
 */
export function agruparPorRateio(linhas) {
  const grupos = { ELÉTRICA: [], HIDRÁULICA: [], CIVIL: [], INDIRETA: [], FLEXÍVEL: [] }

  linhas.forEach(l => {
    const g = l.rateio || 'INDIRETA'
    if (!grupos[g]) grupos[g] = []
    grupos[g].push(l)
  })

  const totalizar = lista => ({
    itens:             lista,
    custoFolhaMensal:  lista.reduce((s, l) => s + l.custoFolhaMensal,  0),
    totalMensalQtd:    lista.reduce((s, l) => s + l.totalMensalQtd,    0),
    custoFolhaPeriodo: lista.reduce((s, l) => s + l.custoFolhaPeriodo, 0),
    totalPeriodo:      lista.reduce((s, l) => s + l.totalPeriodo,      0),
  })

  const resultado = {}
  Object.keys(grupos).forEach(k => { resultado[k] = totalizar(grupos[k]) })

  resultado.TOTAL = {
    custoFolhaMensal:  linhas.reduce((s, l) => s + l.custoFolhaMensal,  0),
    totalMensalQtd:    linhas.reduce((s, l) => s + l.totalMensalQtd,    0),
    custoFolhaPeriodo: linhas.reduce((s, l) => s + l.custoFolhaPeriodo, 0),
    totalPeriodo:      linhas.reduce((s, l) => s + l.totalPeriodo,      0),
  }

  return resultado
}

// ─── HELPERS ─────────────────────────────────────────────────

/**
 * Busca um cargo pelo id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function cargoById(id) {
  return FUNCOES_BIASI.find(c => c.id === id)
}

/**
 * Filtra cargos por rateio.
 * @param {'ELÉTRICA'|'HIDRÁULICA'|'MEIOAMEIO'|'INDIRETA'} rateio
 * @returns {Array}
 */
export function cargosPorRateio(rateio) {
  return FUNCOES_BIASI.filter(c => c.rateio === rateio)
}

/**
 * Agrupa FUNCOES_BIASI por família para montar selects em cascata:
 *   1. Selecionar família
 *   2. Selecionar cargo (dentro da família)
 *   3. Selecionar step
 *
 * @returns {object} mapa { [familia]: Cargo[] }
 */
export function cargosPorFamilia() {
  return FUNCOES_BIASI.reduce((acc, c) => {
    if (!acc[c.familia]) acc[c.familia] = []
    acc[c.familia].push(c)
    return acc
  }, {})
}