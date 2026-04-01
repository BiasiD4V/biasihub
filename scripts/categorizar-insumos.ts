/**
 * categorizar-insumos.ts
 * Lê todos os insumos do Supabase e preenche categoria + subcategoria
 * via regras de palavras-chave nas descrições.
 *
 * Uso: npx tsx scripts/categorizar-insumos.ts
 */

const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co'
// Service Role Key — não commitar em produção
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o'

const HEADERS: Record<string, string> = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
}

// ─── Tipos ────────────────────────────────────────────────────
interface Insumo {
  id: string
  descricao: string
}

interface Classificacao {
  categoria: string
  subcategoria: string
}

// ─── Regras de categorização ──────────────────────────────────
// Avaliadas em ordem: a primeira que bater vence.
type Regra = {
  palavras: string[]   // qualquer das palavras na descrição (upper-case)
  categoria: string
  subcategoria: string
}

const REGRAS: Regra[] = [
  // ── Cabeamento ──────────────────────────────────────
  { palavras: ['CABO PP'],               categoria: 'Cabeamento', subcategoria: 'Cabos Multipolares' },
  { palavras: ['CABO XHHW', 'CABO THW', 'CABO THHN', 'CABO 90'], categoria: 'Cabeamento', subcategoria: 'Cabos de Energia' },
  { palavras: ['CABO COAXIAL', 'CABO COAX', 'CABO RG'],           categoria: 'Cabeamento', subcategoria: 'Cabos Coaxiais' },
  { palavras: ['CABO UTP', 'CABO FTP', 'CABO CAT'],               categoria: 'Cabeamento', subcategoria: 'Cabos de Rede' },
  { palavras: ['FIO FLEX', 'FIO SOLIDO', 'FIO SÓLIDO', 'FIO 750'],categoria: 'Cabeamento', subcategoria: 'Fios Flexíveis' },
  { palavras: ['CABO DE AÇO', 'CABO ACO'],                        categoria: 'SPDA', subcategoria: 'Cabos de Aço' },
  { palavras: ['FIO COBREADO', 'FIO NU', 'CABO NU', 'CABO BC'],   categoria: 'Cabeamento', subcategoria: 'Cabos Nus' },
  { palavras: ['FIO', 'CABO', 'CONDUT'],                          categoria: 'Cabeamento', subcategoria: 'Cabos e Fios' },

  // ── Infraestrutura ───────────────────────────────────
  { palavras: ['ELETROCALHA', 'CALHA PERF'],                      categoria: 'Infraestrutura', subcategoria: 'Eletrocalhas' },
  { palavras: ['PERFILADO', 'PERFIL DE AÇO', 'PERFIL METÁLICO'],  categoria: 'Infraestrutura', subcategoria: 'Perfilados' },
  { palavras: ['ELETRODUTO FLEX', 'ELETRODUTO SEALTITE'],         categoria: 'Infraestrutura', subcategoria: 'Eletrodutos Flexíveis' },
  { palavras: ['ELETRODUTO RÍGIDO', 'ELETRODUTO GALV', 'ELETRODUTO PVC', 'ELETRODUTO'],
                                                                   categoria: 'Infraestrutura', subcategoria: 'Eletrodutos' },
  { palavras: ['BANDEJA'],                                         categoria: 'Infraestrutura', subcategoria: 'Bandejas' },
  { palavras: ['ABRAÇADEIRA', 'SUPORTE', 'HASTE ROSCADA', 'CANTONEIRA'],
                                                                   categoria: 'Infraestrutura', subcategoria: 'Fixação e Suportes' },
  { palavras: ['BUCHA', 'LUVA', 'CURVA', 'JOELHO', 'ADAPTADOR', 'CONECTOR FLEX'],
                                                                   categoria: 'Infraestrutura', subcategoria: 'Conexões e Acessórios' },

  // ── Proteção ─────────────────────────────────────────
  { palavras: ['DISJUNTOR TRIPOLAR', 'DISJ TRIPOLAR', 'DISJUNTOR 3P'],
                                                                   categoria: 'Proteção', subcategoria: 'Disjuntores Tripolares' },
  { palavras: ['DISJUNTOR BIPOLAR', 'DISJ BIPOLAR', 'DISJUNTOR 2P'],
                                                                   categoria: 'Proteção', subcategoria: 'Disjuntores Bipolares' },
  { palavras: ['DISJUNTOR', 'DISJ'],                              categoria: 'Proteção', subcategoria: 'Disjuntores' },
  { palavras: ['DR ', ' DR', 'IDR', 'RCCB', 'DIFERENCIAL RESIDUAL'],
                                                                   categoria: 'Proteção', subcategoria: 'Diferenciais Residuais' },
  { palavras: ['IHM', 'CHAVE SECCIONADORA', 'SECCIONADORA'],      categoria: 'Proteção', subcategoria: 'Seccionadoras' },
  { palavras: ['FUSIVEL', 'FUSÍVEL', 'PORTA FUSIVEL'],            categoria: 'Proteção', subcategoria: 'Fusíveis' },
  { palavras: ['SURTO', 'DPS', 'PARA-RAIO', 'PARARAIO'],         categoria: 'Proteção', subcategoria: 'Proteção Contra Surtos' },
  { palavras: ['RELÉ', 'RELE'],                                   categoria: 'Proteção', subcategoria: 'Relés' },

  // ── Acionamento e Controle ────────────────────────────
  { palavras: ['CONTATOR', 'CONTATORA'],                          categoria: 'Acionamento', subcategoria: 'Contatores' },
  { palavras: ['INVERSOR', 'VFD', 'VARIADOR'],                    categoria: 'Acionamento', subcategoria: 'Inversores de Frequência' },
  { palavras: ['TEMPORIZADOR', 'TIMER'],                          categoria: 'Acionamento', subcategoria: 'Temporizadores' },
  { palavras: ['SOFT STARTER', 'SOFTSTARTER'],                    categoria: 'Acionamento', subcategoria: 'Soft Starters' },
  { palavras: ['CHAVE BOIA', 'BOIA'],                             categoria: 'Acionamento', subcategoria: 'Chaves e Sensores' },

  // ── Quadros e Painéis ─────────────────────────────────
  { palavras: ['QUADRO DE DISTRIBUICAO', 'QUADRO DE DISTRIBUIÇÃO', 'QDC', 'QDF', 'QGBT'],
                                                                   categoria: 'Quadros', subcategoria: 'Quadros de Distribuição' },
  { palavras: ['QUADRO MEDIÇÃO', 'MEDIÇÃO'],                      categoria: 'Quadros', subcategoria: 'Quadros de Medição' },
  { palavras: ['PAINEL', 'ARMARIO ELÉTRICO', 'ARMARIO ELETRICO'], categoria: 'Quadros', subcategoria: 'Painéis e Armários' },
  { palavras: ['BARRAMENTO', 'BARRA'],                            categoria: 'Quadros', subcategoria: 'Barramentos' },
  { palavras: ['TRILHO DIN', 'CALHA DIN'],                        categoria: 'Quadros', subcategoria: 'Acessórios para Quadros' },

  // ── Iluminação ────────────────────────────────────────
  { palavras: ['LUMINÁRIA', 'LUMINARIA'],                         categoria: 'Iluminação', subcategoria: 'Luminárias' },
  { palavras: ['REFLETOR'],                                        categoria: 'Iluminação', subcategoria: 'Refletores' },
  { palavras: ['SPOT', 'DOWNLIGHT'],                              categoria: 'Iluminação', subcategoria: 'Spots e Downlights' },
  { palavras: ['LÂMPADA', 'LAMPADA', 'LED'],                      categoria: 'Iluminação', subcategoria: 'Lâmpadas' },
  { palavras: ['REATOR', 'DRIVER LED', 'FONTE LED'],              categoria: 'Iluminação', subcategoria: 'Reatores e Drivers' },
  { palavras: ['FITA LED', 'PERFIL LED'],                         categoria: 'Iluminação', subcategoria: 'Fitas e Perfis LED' },

  // ── Acabamentos ───────────────────────────────────────
  { palavras: ['TOMADA 2P', 'TOMADA 3P', 'TOMADA USB', 'TOMADA'],categoria: 'Acabamentos', subcategoria: 'Tomadas' },
  { palavras: ['INTERRUPTOR', 'DIMMER'],                          categoria: 'Acabamentos', subcategoria: 'Interruptores' },
  { palavras: ['PLACA', 'ESPELHO', 'MÓDULO'],                     categoria: 'Acabamentos', subcategoria: 'Placas e Espelhos' },
  { palavras: ['CAIXA DE PASSAGEM', 'CAIXA OCTAGONA', 'CAIXA 4X2', 'CAIXA 4X4'],
                                                                   categoria: 'Acabamentos', subcategoria: 'Caixas de Passagem' },
  { palavras: ['CONDULETE', 'ELETRODUTO METÁLICO'],               categoria: 'Acabamentos', subcategoria: 'Condulete' },

  // ── SPDA ─────────────────────────────────────────────
  { palavras: ['HASTE', 'CAPTORA', 'FRANKLIN'],                   categoria: 'SPDA', subcategoria: 'Hastes de Captação' },
  { palavras: ['MALHA', 'ATERRAMENTO', 'TERRA', 'CABO TERRA'],    categoria: 'SPDA', subcategoria: 'Aterramento' },
  { palavras: ['CONECTOR SPDA', 'GRAMPO SPDA'],                   categoria: 'SPDA', subcategoria: 'Conectores SPDA' },

  // ── Automação ─────────────────────────────────────────
  { palavras: ['SENSOR', 'DETECTOR'],                             categoria: 'Automação', subcategoria: 'Sensores e Detectores' },
  { palavras: ['PRESENÇA', 'MOVIMENTO'],                          categoria: 'Automação', subcategoria: 'Sensores de Presença' },
  { palavras: ['CFTV', 'CÂMERA', 'CAMERA'],                       categoria: 'Automação', subcategoria: 'CFTV' },
  { palavras: ['CLP', 'PLC', 'CONTROLADOR'],                      categoria: 'Automação', subcategoria: 'Controladores' },

  // ── Materiais Gerais ──────────────────────────────────
  { palavras: ['PARAFUSO', 'PORCA', 'ARRUELA', 'CHUMBADOR'],      categoria: 'Materiais Gerais', subcategoria: 'Fixação' },
  { palavras: ['FITA ISOLANTE', 'FITA AUTO FUSÃO', 'FITA'],       categoria: 'Materiais Gerais', subcategoria: 'Fitas e Vedação' },
  { palavras: ['TERMINAL', 'CONECTOR CABO'],                      categoria: 'Materiais Gerais', subcategoria: 'Terminais e Conectores' },
  { palavras: ['IDENTIFICACAO', 'IDENTIFICAÇÃO', 'ETIQUETA', 'CABO GUIA'],
                                                                   categoria: 'Materiais Gerais', subcategoria: 'Identificação' },
]

// ─── Função de classificação ──────────────────────────────────
function classificar(descricao: string): Classificacao {
  const upper = descricao.toUpperCase()

  for (const regra of REGRAS) {
    for (const palavra of regra.palavras) {
      if (upper.includes(palavra)) {
        return { categoria: regra.categoria, subcategoria: regra.subcategoria }
      }
    }
  }

  return { categoria: 'Geral', subcategoria: 'Materiais Diversos' }
}

// ─── HTTP helpers ─────────────────────────────────────────────
async function fetchJSON(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { ...HEADERS, ...(opts.headers as Record<string, string> ?? {}) },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function listarInsumos(): Promise<Insumo[]> {
  const url = `${SUPABASE_URL}/rest/v1/insumos?select=id,descricao&limit=5000`
  return (await fetchJSON(url)) as Insumo[]
}

async function atualizarLote(
  lote: Array<{ id: string; categoria: string; subcategoria: string }>
) {
  // Supabase não suporta bulk update por ID, fazemos PATCH individual em paralelo
  await Promise.all(
    lote.map((item) =>
      fetchJSON(`${SUPABASE_URL}/rest/v1/insumos?id=eq.${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          categoria: item.categoria,
          subcategoria: item.subcategoria,
        }),
      })
    )
  )
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Buscando insumos...')
  const insumos = await listarInsumos()
  console.log(`📦 ${insumos.length} insumos encontrados\n`)

  // Classificar todos
  const classificados = insumos.map((ins) => ({
    id: ins.id,
    descricao: ins.descricao,
    ...classificar(ins.descricao),
  }))

  // Estatísticas por categoria
  const stats: Record<string, number> = {}
  for (const c of classificados) {
    stats[c.categoria] = (stats[c.categoria] ?? 0) + 1
  }
  console.log('📊 Distribuição por categoria:')
  for (const [cat, count] of Object.entries(stats).sort()) {
    const pct = ((count / insumos.length) * 100).toFixed(1)
    console.log(`   ${cat.padEnd(25)} ${String(count).padStart(5)}  (${pct}%)`)
  }
  console.log()

  // Atualizar em lotes de 100
  const LOTE = 100
  let atualizados = 0
  for (let i = 0; i < classificados.length; i += LOTE) {
    const lote = classificados.slice(i, i + LOTE)
    await atualizarLote(lote)
    atualizados += lote.length
    process.stdout.write(`\r⬆  Atualizando... ${atualizados}/${insumos.length}`)
  }

  console.log('\n\n✅ Categorização concluída!')
  console.log(`   ${classificados.filter((c) => c.categoria !== 'Geral').length} itens categorizados`)
  console.log(`   ${classificados.filter((c) => c.categoria === 'Geral').length} itens em "Geral/Materiais Diversos"`)
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
