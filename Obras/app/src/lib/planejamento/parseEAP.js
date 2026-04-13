// ============================================================================
// lib/planejamento/parseEAP.js
// Parser da lista CC/E/SE/S colada do Excel — SPEC-PLN-002-2026
// Separador: TAB entre colunas. Linhas em branco e iniciadas por # são ignoradas.
//
// Formato mínimo:
//   CC [TAB] 1       [TAB] INSTALAÇÕES ELÉTRICAS — VESTIÁRIOS
//   S  [TAB] 1.1.1.1 [TAB] ELETROCALHA LISA - 100X100 - #18
//
// Formato estendido (colunas D/E/F do modelo Excel):
//   S  [TAB] 1.1.1.1 [TAB] ELETROCALHA LISA - 100X100 [TAB] 150 [TAB] M [TAB] 5
//
// A linha de cabeçalho é ignorada automaticamente se a coluna A for "TIPO".
// ============================================================================

export const TIPO_NIVEL = { CC: 1, E: 2, SE: 3, S: 4 }
export const NIVEL_TIPO = { 1: 'CC', 2: 'E', 3: 'SE', 4: 'S' }
export const COR_TIPO = { CC: '#7c3aed', E: '#2563eb', SE: '#0d9488', S: '#64748b' }
export const LABEL_TIPO = {
  CC: 'Célula Construtiva',
  E: 'Etapa',
  SE: 'Sub-etapa',
  S: 'Serviço',
}

/**
 * parseEAP(texto)
 *
 * Recebe o texto colado do Excel e retorna:
 *   { itens: EAPItem[], erros: string[] }
 *
 * EAPItem = { tipo, codigo, nome, nivel, parentCodigo,
 *             quantidade, unidade, duracao_dias }
 */
export function parseEAP(texto) {
  const erros = []
  const itens = []
  const codigosVistos = new Set()

  if (!texto || !texto.trim()) {
    return { itens: [], erros: ['Texto vazio. Cole a lista do Excel.'] }
  }

  const linhas = texto.split('\n')

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    const numLinha = i + 1

    // Ignorar linhas em branco e comentários
    if (!linha.trim() || linha.trim().startsWith('#')) continue

    // Separar por TAB
    let partes = linha.split('\t').map(p => p.trim())

    if (partes.length < 3) {
      // Tentar separar por múltiplos espaços como fallback
      const partesEspaco = linha.trim().split(/\s{2,}/)
      if (partesEspaco.length >= 3) {
        partes = partesEspaco
      } else {
        erros.push(`Linha ${numLinha}: formato inválido (esperado TIPO [TAB] CÓDIGO [TAB] NOME)`)
        continue
      }
    }

    const tipoRaw = partes[0].toUpperCase().trim()
    const codigo  = partes[1].trim()

    // Ignorar linha de cabeçalho (quando usuário copia incluindo o header)
    if (tipoRaw === 'TIPO') continue

    const nome = partes[2]?.trim() || ''

    // Colunas D/E/F — opcionais, somente para tipo S
    const qtdRaw = partes[3]?.trim() || ''
    const unRaw  = partes[4]?.trim() || ''
    const durRaw = partes[5]?.trim() || ''

    // Validar tipo
    if (!TIPO_NIVEL[tipoRaw]) {
      erros.push(`Linha ${numLinha}: tipo "${tipoRaw}" inválido (use CC, E, SE ou S)`)
      continue
    }

    // Validar código não vazio
    if (!codigo) {
      erros.push(`Linha ${numLinha}: código vazio`)
      continue
    }

    // Validar nome não vazio
    if (!nome) {
      erros.push(`Linha ${numLinha}: nome vazio para código ${codigo}`)
      continue
    }

    // Código duplicado
    if (codigosVistos.has(codigo)) {
      erros.push(`Linha ${numLinha}: código "${codigo}" duplicado`)
      continue
    }
    codigosVistos.add(codigo)

    // Calcular parentCodigo pela hierarquia do código
    const nivel = TIPO_NIVEL[tipoRaw]
    const partesCodigoNum = codigo.split('.')
    const parentCodigo = partesCodigoNum.length > 1
      ? partesCodigoNum.slice(0, -1).join('.')
      : null

    // Campos extras (somente tipo S; CC/E/SE ignoram mesmo se preenchidos)
    let quantidade   = null
    let unidade      = null
    let duracao_dias = null

    if (tipoRaw === 'S') {
      if (qtdRaw !== '') {
        const n = Number(qtdRaw.replace(',', '.'))
        quantidade = isNaN(n) ? null : n
      }
      if (unRaw !== '') unidade = unRaw
      if (durRaw !== '') {
        const d = parseInt(durRaw, 10)
        duracao_dias = isNaN(d) ? null : d
      }
    }

    itens.push({ tipo: tipoRaw, codigo, nome, nivel, parentCodigo,
                 quantidade, unidade, duracao_dias })
  }

  if (itens.length === 0 && erros.length === 0) {
    erros.push('Nenhum item válido encontrado. Verifique o formato.')
  }

  return { itens, erros }
}

/**
 * validarHierarquia(itens)
 *
 * Valida que cada item tem seu pai cadastrado.
 * Retorna array de erros adicionais.
 */
export function validarHierarquia(itens) {
  const erros = []
  const codigosSet = new Set(itens.map(i => i.codigo))

  for (const item of itens) {
    if (!item.parentCodigo) continue // CC raiz, ok

    if (!codigosSet.has(item.parentCodigo)) {
      erros.push(
        `Item "${item.codigo}" (${item.nome}): pai "${item.parentCodigo}" não encontrado na EAP`
      )
    }

    // Validar nível coerente com pai
    const pai = itens.find(i => i.codigo === item.parentCodigo)
    if (pai && pai.nivel !== item.nivel - 1) {
      erros.push(
        `Item "${item.codigo}" (${LABEL_TIPO[item.tipo]}): pai "${item.parentCodigo}" deveria ser ${LABEL_TIPO[NIVEL_TIPO[item.nivel - 1]]}`
      )
    }
  }

  // Verificar que todo E tem CC pai, todo SE tem E pai, todo S tem SE pai
  const tiposNecessarios = { E: 'CC', SE: 'E', S: 'SE' }
  for (const item of itens) {
    const tipoEsperadoDoPai = tiposNecessarios[item.tipo]
    if (!tipoEsperadoDoPai) continue

    const pai = itens.find(i => i.codigo === item.parentCodigo)
    if (pai && pai.tipo !== tipoEsperadoDoPai) {
      erros.push(
        `Item "${item.codigo}" (${item.tipo}): pai deve ser ${tipoEsperadoDoPai}, encontrado ${pai.tipo}`
      )
    }
  }

  return erros
}

/**
 * construirArvore(itens)
 *
 * Transforma a lista plana em árvore hierárquica para preview.
 * Retorna array de nós raiz com filhos aninhados.
 */
export function construirArvore(itens) {
  const mapa = {}
  for (const item of itens) {
    mapa[item.codigo] = { ...item, filhos: [] }
  }

  const raizes = []
  for (const item of itens) {
    if (!item.parentCodigo || !mapa[item.parentCodigo]) {
      raizes.push(mapa[item.codigo])
    } else {
      mapa[item.parentCodigo].filhos.push(mapa[item.codigo])
    }
  }

  return raizes
}

/**
 * contarPorTipo(itens)
 *
 * Retorna { CC: n, E: n, SE: n, S: n }
 */
export function contarPorTipo(itens) {
  return itens.reduce((acc, item) => {
    acc[item.tipo] = (acc[item.tipo] || 0) + 1
    return acc
  }, { CC: 0, E: 0, SE: 0, S: 0 })
}

/**
 * Texto de exemplo para o textarea de importação
 */
export const EXEMPLO_EAP = `CC\t1\tINSTALAÇÕES ELÉTRICAS — VESTIÁRIOS
E\t1.1\tINFRAESTRUTURA
SE\t1.1.1\tELETROCALHA
S\t1.1.1.1\tELETROCALHA LISA - 100X100 - #18\t150\tM\t5
S\t1.1.1.2\tELETROCALHA PERFURADA - 200X100 - #18\t80\tM\t3
SE\t1.1.2\tCONDUÍTE
S\t1.1.2.1\tCONDUÍTE FLEXÍVEL 1" - METRO\t200\tM\t2
E\t1.2\tQUADROS E DISTRIBUIÇÃO
SE\t1.2.1\tQUADRO DE DISTRIBUIÇÃO
S\t1.2.1.1\tQDF 32 CIRCUITOS EMBUTIR\t2\tUN\t3`
