/* ═══════════════════════════════════════════════════════════
   CLASSIFICAÇÃO HIERÁRQUICA DE INSUMOS + FORNECEDORES A/B/C
   ═══════════════════════════════════════════════════════════ */

// ────────── Tipos ──────────
export interface CategoriaConfig {
  nome: string
  icone: string
  subcategorias: Record<string, string[]>
}

export type ClasseFornecedor = 'A' | 'B' | 'C'

export interface ClassificacaoFornecedor {
  classe: ClasseFornecedor
  label: string
  descricao: string
  cor: string
  corBg: string
  corBorder: string
}

// ────────── Categorias e subcategorias ──────────
export const CATEGORIAS: Record<string, CategoriaConfig> = {
  Cabeamento: {
    nome: 'Cabeamento',
    icone: 'Cable',
    subcategorias: {
      'Cabos de Energia': [
        'CABO FLEX', 'CABO PP', 'CABO SINTENAX', 'CABO HEPR',
        'CABO EPR', 'CABO MULTIPLEX', 'CABO ANTI-CHAMA',
        'CABO AFUMEX', 'CABO ISOL', 'CABO ALUMINIO', 'CABO COBRE',
        'CABO ANTI CHAMA', 'CABO COZINHA', 'CABO CHUVEIRO',
        'CABO BLINDADO', 'CABO CONTROLE',
      ],
      'Cabos de Dados': [
        'CABO UTP', 'CABO HDMI', 'CABO COAXIAL', 'CABO REDE',
        'CABO TELEFON', 'CABO CCI', 'CABO CI', 'CABO DROP',
        'CABO FIBRA', 'CABO CAT',
      ],
      'Fios': ['FIO FLEX', 'FIO SOLID', 'FIO RIGIDO', 'FIO '],
      'Terminais': ['TERMINAL'],
      'Conectores de Cabo': ['CONECTOR', 'EMENDA'],
      'Cordoalhas': ['CORDOALHA'],
    },
  },
  Infraestrutura: {
    nome: 'Infraestrutura',
    icone: 'Construction',
    subcategorias: {
      Eletrocalhas: ['ELETROCALHA'],
      Perfilados: ['PERFILADO'],
      Leitos: ['LEITO'],
      Eletrodutos: ['ELETRODUTO'],
      Canaletas: ['CANALETA'],
      Conduítes: ['CONDULETE', 'CONDUITE'],
      Uniduts: ['UNIDUT'],
    },
  },
  'Hidráulica': {
    nome: 'Hidráulica',
    icone: 'Droplets',
    subcategorias: {
      'Tubos PVC/PPR/CPVC': [
        'TUBO PVC', 'TUBO PPR', 'TUBO CPVC', 'TUBO SOLD',
        'TUBO ROSCAVEL', 'TUBO ESGOTO', 'TUBO SILENTIUM',
        'TOPHIDRO', 'PPR ',
      ],
      'Conexões': [
        'CURVA', 'JOELHO', 'TE ', 'TÊ ', 'LUVA', 'UNIAO ',
        'UNIÃO', 'JUNCAO', 'JUNÇÃO', 'CAP ', 'REDUCAO',
        'REDUÇÃO', 'NIPLE', 'COTOVELO', 'CRUZETA',
        'BUCHA RED', 'BUCHA DE RED',
      ],
      'Válvulas e Registros': [
        'VALVULA', 'VÁLVULA', 'REGISTRO', 'BVA',
      ],
      Adaptadores: ['ADAPTADOR'],
      Ralos: ['RALO', 'GRELHA'],
      Caixas: [
        'CAIXA SIFON', 'CAIXA GORDURA', 'CAIXA INSPECAO',
        'CAIXA INSPEÇÃO', 'CAIXA DAGUA', "CAIXA D'AGUA",
      ],
      'Esgoto / Drenagem': [
        'ABRACADEIRA ESGOTO', 'ANEL ORING ESGOTO',
        'CORPO SIFONADO', 'SIFAO',
      ],
      Adesivos: [
        'ADESIVO PVC', 'ADESIVO CPVC', 'PASTA LUBRIFICANTE',
        'SOLUCAO LIMPADORA', 'FITA VEDA',
      ],
    },
  },
  'Elétrica': {
    nome: 'Elétrica',
    icone: 'Zap',
    subcategorias: {
      Disjuntores: ['DISJUNTOR'],
      Contatores: ['CONTATOR'],
      'Tomadas e Interruptores': ['TOMADA', 'MODULO', 'MÓDULO'],
      Placas: ['PLACA'],
      'Suportes e Espelhos': ['SUPORTE'],
      'Quadros e Painéis': ['QUADRO', 'CENTRO DE DIST', 'BARRAMENTO'],
      Bornes: ['BORNE'],
      Chaves: ['CHAVE'],
      'Relés e Temporizadores': ['RELE ', 'RELÉ', 'TEMPORIZADOR'],
      'Prensa Cabos': ['PRENSA CABO', 'PRENSA-CABO'],
    },
  },
  'Incêndio': {
    nome: 'Incêndio',
    icone: 'Flame',
    subcategorias: {
      'Detecção e Alarme': [
        'ACIONADOR', 'DETECTOR', 'SIRENE', 'CENTRAL DE ALARME',
        'MODULO ENDEREÇ',
      ],
      'Combate': [
        'EXTINTOR', 'ABRIGO', 'MANGUEIRA INCEND',
        'HIDRANTE', 'ESGUICHO',
      ],
      Sprinklers: ['SPRINKLER', 'BICO DE SPRINKLER'],
      Acoplamentos: [
        'ACOPLAMENTO RIGIDO', 'ACOPLAMENTO REDUÇÃO',
        'ACOPLAMENTO RANHURADO', 'ADAPTADOR RANHURA',
        'ADAPTADOR RANHURADO',
      ],
    },
  },
  'Iluminação': {
    nome: 'Iluminação',
    icone: 'Lightbulb',
    subcategorias: {
      Luminárias: ['LUMINARIA', 'LUMINÁRIA'],
      Postes: ['POSTE'],
      Reatores: ['REATOR'],
      Lâmpadas: ['LAMPADA', 'LÂMPADA'],
      'Acessórios Iluminação': ['REFLETOR', 'SOQUETE', 'PENDENTE'],
    },
  },
  'Fixação e Suporte': {
    nome: 'Fixação e Suporte',
    icone: 'Wrench',
    subcategorias: {
      Abraçadeiras: ['ABRACADEIRA', 'ABRAÇADEIRA'],
      Parafusos: ['PARAFUSO'],
      Buchas: ['BUCHA S', 'BUCHA NYLON', 'BUCHA QUIMICA', 'CHUMBADOR'],
      Arruela: ['ARRUELA'],
      'Hastes e Vergalhões': ['HASTE', 'VERGALHAO'],
      Anilhas: ['ANILHA'],
    },
  },
  'Transformadores e Motores': {
    nome: 'Transformadores e Motores',
    icone: 'Cpu',
    subcategorias: {
      Transformadores: ['TRANSFORMADOR'],
      Motores: ['MOTOR'],
      Bombas: ['BOMBA', 'MOTOBOMBA'],
    },
  },
}

// ────────── Classificação de fornecedores (A/B/C) ──────────
const FORNECEDOR_CLASSE: Record<string, ClasseFornecedor> = {
  // A - Premium: Alta qualidade, preço mais alto, indicado para obras exigentes
  ELECON: 'A',
  NEXANS: 'A',
  PRYSMIAN: 'A',
  COBRECOM: 'A',
  AMANCO: 'A',
  WILO: 'A',
  RIMAR: 'A',
  DINAMICA: 'A',
  ASTRA: 'A',
  LUMICENTER: 'A',
  'GP CABOS': 'A',

  // B - Standard: Qualidade boa, preço competitivo, atende maioria das obras
  DISPAN: 'B',
  'BIASI MATERIAIS': 'B',
  SIBRATEC: 'B',
  TOPFUSION: 'B',
  DIMENSIONAL: 'B',
  PARATEC: 'B',
  POTENZA: 'B',
  ASCAEL: 'B',
  BEGHIM: 'B',
  CONDEX: 'B',
  INDUSCABOS: 'B',
  CONCREFER: 'B',
  TECNO_FLUIDOS: 'B',
  'TECNO FLUIDOS': 'B',
  FIOCAMP: 'B',
  CONDUSCAMP: 'B',
  ITAIPU: 'B',
  ELETROFERRO: 'B',
  'RR FERNANDES': 'B',
  SILCON: 'B',
  'BRAS DISTRIBUIDORA': 'B',
  JALYS: 'B',
  'KING REATORES': 'B',
  PARQUELUZ: 'B',
  FORLIGHT: 'B',
  ILUMICON: 'B',
  'CLP EXTINTORES': 'B',
  'MOCELIN EXTINTORES': 'B',

  // C - Econômico: Menor preço, qualidade básica, obras com foco em custo
  NANOPLASTIC: 'C',
  VGS: 'C',
  CROSSFOX: 'C',
  MEGADUTO: 'C',
  SINALPLAST: 'C',
  DEPLAST: 'C',
  MELFLEX: 'C',
  MELFEX: 'C',
  'A CABINE': 'C',
  'ROUTE 66': 'C',
  TELBRA: 'C',
  PLASTIBRAS: 'C',
  MEGALUZ: 'C',
  CCA: 'C',
  'PVC SUMARE': 'C',
  'QUALITY TUBOS': 'C',
  'KS TUBOS': 'C',
  ENERGY: 'C',
}

export const CLASSES_INFO: Record<ClasseFornecedor, ClassificacaoFornecedor> = {
  A: {
    classe: 'A',
    label: 'Premium',
    descricao: 'Maior qualidade, preço mais alto. Para obras que exigem materiais de primeira linha.',
    cor: 'text-amber-700',
    corBg: 'bg-amber-50',
    corBorder: 'border-amber-200',
  },
  B: {
    classe: 'B',
    label: 'Standard',
    descricao: 'Qualidade boa, preço competitivo. Atende a maioria das obras com equilíbrio.',
    cor: 'text-blue-700',
    corBg: 'bg-blue-50',
    corBorder: 'border-blue-200',
  },
  C: {
    classe: 'C',
    label: 'Econômico',
    descricao: 'Preço baixo, qualidade básica. Para obras focadas em custo-benefício.',
    cor: 'text-emerald-700',
    corBg: 'bg-emerald-50',
    corBorder: 'border-emerald-200',
  },
}

// ────────── Funções de classificação ──────────

export function classificarFornecedor(fornecedor: string | null): ClasseFornecedor {
  if (!fornecedor) return 'B'
  const upper = fornecedor.toUpperCase().trim()
  return FORNECEDOR_CLASSE[upper] ?? 'B'
}

export function getClasseInfo(classe: ClasseFornecedor): ClassificacaoFornecedor {
  return CLASSES_INFO[classe]
}

export function classificarInsumo(descricao: string): { categoria: string; subcategoria: string } | null {
  const desc = descricao.toUpperCase().trim()
  for (const [catKey, catCfg] of Object.entries(CATEGORIAS)) {
    for (const [subKey, patterns] of Object.entries(catCfg.subcategorias)) {
      for (const pattern of patterns) {
        if (desc.startsWith(pattern.toUpperCase()) || desc.includes(pattern.toUpperCase())) {
          return { categoria: catKey, subcategoria: subKey }
        }
      }
    }
  }
  return null
}

/**
 * Normaliza a descrição para agrupar o "mesmo produto" de fornecedores diferentes.
 * Extrai: tipo + dimensões (descarta acabamento, fornecedor-específico).
 */
export function normalizarProduto(descricao: string): string {
  let d = descricao.toUpperCase().trim()

  // Remove informações de comprimento (PEÇA COM 3 METROS, 6MTS, etc)
  d = d.replace(/\s*-?\s*PE[ÇC]A\s*COM\s*\d+\s*METROS?/gi, '')
  d = d.replace(/\s*-?\s*\d+\s*MTS?$/gi, '')

  // Remove acabamento (PZ, GF, GE)
  d = d.replace(/\s*-?\s*(PZ|GF|GE)\s*-?\s*/g, ' ')

  // Remove chapa (#14, #16, #18, #20, #22)
  d = d.replace(/\s*-?\s*#\d+\s*-?\s*/g, ' ')

  // Remove "NBR XXXX"
  d = d.replace(/\s*NBR\s*\d+/g, '')

  // Remove "PINTADA NA COR PRETA" etc
  d = d.replace(/\s*-?\s*PINTAD[AO]\s*NA\s*COR\s*\w+/g, '')

  // Remove "C -" (tipo C), "C/"
  d = d.replace(/\s+-\s+C\s+-\s+/g, ' ')
  d = d.replace(/\s+C\s+-\s+/g, ' ')

  // Remove "CB" no final (caixa branca)
  d = d.replace(/\s+CB\s*$/g, '')

  // Limpa espaços extras e traços soltos
  d = d.replace(/\s*-\s*$/g, '')
  d = d.replace(/\s+/g, ' ').trim()

  return d
}

/**
 * Extrai dimensão/bitola do nome do produto para usar como agrupador de nível 3.
 * Ex: "ELETROCALHA PERFURADA 200X100" → "200X100"
 * Ex: "CABO FLEX 2.5MM²" → "2.5MM²"
 */
export function extrairDimensao(descricao: string): string {
  const d = descricao.toUpperCase()

  // Dimensões tipo 200X100, 100X50X3000
  const dimMatch = d.match(/(\d+)\s*X\s*(\d+)(?:\s*X\s*\d+)?/)
  if (dimMatch) return `${dimMatch[1]}x${dimMatch[2]}`

  // DN + número (diâmetro nominal)
  const dnMatch = d.match(/DN\s*(\d+)/)
  if (dnMatch) return `DN${dnMatch[1]}`

  // Polegadas: 1/2", 3/4", 1", 2.1/2"
  const polMatch = d.match(/(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)\s*["'']/)
  if (polMatch) return `${polMatch[1]}"`

  // MM² (seção de cabo)
  const mmMatch = d.match(/(\d+(?:[.,]\d+)?)\s*MM[²2]?/)
  if (mmMatch) return `${mmMatch[1]}mm²`

  // MM simples (diâmetro eletroduto)
  const mmSimples = d.match(/(\d+)\s*MM\b/)
  if (mmSimples) return `${mmSimples[1]}mm`

  // AWG
  const awgMatch = d.match(/(\d+(?:\/\d+)?)\s*AWG/)
  if (awgMatch) return `${awgMatch[1]} AWG`

  // Tamanhos em polegadas sem aspas: 1/2, 3/4, etc (no final ou antes de traço)
  const fracMatch = d.match(/\b(\d+\s*\d*\/\d+)\b/)
  if (fracMatch) return fracMatch[1].replace(/\s+/g, '')

  return 'Geral'
}

// ────────── Tipos para UI ──────────

export interface InsumoResumido {
  id: string
  descricao: string
  fornecedor: string | null
  custo_atual: number
  unidade: string
  data_ultimo_preco: string | null
  dias_sem_atualizar: number | null
}

export interface GrupoProduto {
  chave: string           // Descrição normalizada
  dimensao: string        // Dimensão extraída
  itens: InsumoResumido[] // Todos os fornecedores deste produto
  menorPreco: number
  maiorPreco: number
  qtdFornecedores: number
}

export interface SubcategoriaAgrupada {
  nome: string
  produtos: GrupoProduto[]
  qtdItens: number
}

export interface CategoriaAgrupada {
  nome: string
  icone: string
  subcategorias: SubcategoriaAgrupada[]
  qtdItens: number
}

/**
 * Agrupa insumos em hierarquia: Categoria > Subcategoria > Produto > Fornecedores
 */
export function agruparInsumos(insumos: InsumoResumido[]): {
  categorias: CategoriaAgrupada[]
  semCategoria: InsumoResumido[]
} {
  const catMap = new Map<string, Map<string, Map<string, InsumoResumido[]>>>()
  const semCategoria: InsumoResumido[] = []

  for (const ins of insumos) {
    const classificacao = classificarInsumo(ins.descricao)
    if (!classificacao) {
      semCategoria.push(ins)
      continue
    }

    const { categoria, subcategoria } = classificacao
    if (!catMap.has(categoria)) catMap.set(categoria, new Map())
    const subMap = catMap.get(categoria)!
    if (!subMap.has(subcategoria)) subMap.set(subcategoria, new Map())
    const prodMap = subMap.get(subcategoria)!

    const chave = normalizarProduto(ins.descricao)
    if (!prodMap.has(chave)) prodMap.set(chave, [])
    prodMap.get(chave)!.push(ins)
  }

  const categorias: CategoriaAgrupada[] = []

  for (const [catNome, catCfg] of Object.entries(CATEGORIAS)) {
    const subMap = catMap.get(catNome)
    if (!subMap || subMap.size === 0) continue

    const subcategorias: SubcategoriaAgrupada[] = []
    let catTotal = 0

    for (const [subNome, prodMap] of subMap.entries()) {
      const produtos: GrupoProduto[] = []

      for (const [chave, itens] of prodMap.entries()) {
        const precos = itens.map((i) => i.custo_atual).filter((p) => p > 0)
        const dimensao = extrairDimensao(chave)

        produtos.push({
          chave,
          dimensao,
          itens: itens.sort((a, b) => a.custo_atual - b.custo_atual),
          menorPreco: precos.length ? Math.min(...precos) : 0,
          maiorPreco: precos.length ? Math.max(...precos) : 0,
          qtdFornecedores: new Set(itens.map((i) => i.fornecedor).filter(Boolean)).size,
        })
      }

      produtos.sort((a, b) => a.dimensao.localeCompare(b.dimensao, 'pt-BR', { numeric: true }))
      const qtdItens = produtos.reduce((s, p) => s + p.itens.length, 0)
      catTotal += qtdItens
      subcategorias.push({ nome: subNome, produtos, qtdItens })
    }

    subcategorias.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

    categorias.push({
      nome: catNome,
      icone: catCfg.icone,
      subcategorias,
      qtdItens: catTotal,
    })
  }

  categorias.sort((a, b) => b.qtdItens - a.qtdItens)

  return { categorias, semCategoria }
}
