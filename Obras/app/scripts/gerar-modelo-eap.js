// scripts/gerar-modelo-eap.js
// Gera o arquivo Excel modelo para importação de EAP — Biasi Engenharia
// Executar: node scripts/gerar-modelo-eap.js

import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT = path.join(__dirname, '../public/downloads/modelo-eap-biasi.xlsx')

// ─── Cores ────────────────────────────────────────────────────────────────────
const COR = {
  CC_BG:    '0D2B4E',
  CC_TEXT:  'FFFFFF',
  E_BG:     '1A5276',
  E_TEXT:   'FFFFFF',
  SE_BG:    'D6E4F0',
  SE_TEXT:  '0D2B4E',
  S_BG:     'FFFFFF',
  S_TEXT:   '000000',
  HEADER_BG:'2C3E50',
  HEADER_TX:'FFFFFF',
  INST_BG:  'EBF5FB',
  INST_TTL: '0D2B4E',
}

// ─── Dados de exemplo ─────────────────────────────────────────────────────────
const EXEMPLOS = [
  { tipo: 'CC', codigo: '1',       nome: 'INSTALAÇÕES ELÉTRICAS — VESTIÁRIOS',  qtd: '',  un: '',   dur: '' },
  { tipo: 'E',  codigo: '1.1',     nome: 'INFRAESTRUTURA',                      qtd: '',  un: '',   dur: '' },
  { tipo: 'SE', codigo: '1.1.1',   nome: 'ELETROCALHA',                         qtd: '',  un: '',   dur: '' },
  { tipo: 'S',  codigo: '1.1.1.1', nome: 'ELETROCALHA LISA - 100X100 - #18',    qtd: 150, un: 'M',  dur: 5  },
  { tipo: 'S',  codigo: '1.1.1.2', nome: 'ELETROCALHA PERFURADA - 200X100 - #18',qtd: 80, un: 'M',  dur: 3  },
  { tipo: 'SE', codigo: '1.1.2',   nome: 'CONDUÍTE',                            qtd: '',  un: '',   dur: '' },
  { tipo: 'S',  codigo: '1.1.2.1', nome: 'CONDUÍTE FLEXÍVEL 1" - METRO',        qtd: 200, un: 'M',  dur: 2  },
  { tipo: 'E',  codigo: '1.2',     nome: 'QUADROS E DISTRIBUIÇÃO',              qtd: '',  un: '',   dur: '' },
  { tipo: 'SE', codigo: '1.2.1',   nome: 'QUADRO DE DISTRIBUIÇÃO',              qtd: '',  un: '',   dur: '' },
  { tipo: 'S',  codigo: '1.2.1.1', nome: 'QDF 32 CIRCUITOS EMBUTIR',            qtd: 2,   un: 'UN', dur: 3  },
]

function aplicarEstiloLinha(row, tipo) {
  const estilos = {
    CC: { bg: COR.CC_BG, fg: COR.CC_TEXT, bold: true },
    E:  { bg: COR.E_BG,  fg: COR.E_TEXT,  bold: true },
    SE: { bg: COR.SE_BG, fg: COR.SE_TEXT, bold: true },
    S:  { bg: COR.S_BG,  fg: COR.S_TEXT,  bold: false },
  }
  const s = estilos[tipo] || estilos.S
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + s.bg } }
    cell.font   = { bold: s.bold, color: { argb: 'FF' + s.fg }, name: 'Calibri', size: 10 }
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left:   { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right:  { style: 'thin', color: { argb: 'FFCCCCCC' } },
    }
  })
}

async function gerarModelo() {
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'Biasi Engenharia'
  wb.created  = new Date()
  wb.modified = new Date()

  // ══════════════════════════════════════════════════════════════════════════
  // ABA 1 — EAP
  // ══════════════════════════════════════════════════════════════════════════
  const ws = wb.addWorksheet('EAP', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  })

  // Larguras
  ws.getColumn('A').width = 8
  ws.getColumn('B').width = 12
  ws.getColumn('C').width = 55
  ws.getColumn('D').width = 10
  ws.getColumn('E').width = 8
  ws.getColumn('F').width = 8

  // Congelar linha 1
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  // ── Cabeçalho ──
  const header = ws.addRow(['TIPO', 'CÓDIGO', 'NOME / DESCRIÇÃO', 'QTD', 'UN', 'DUR (dias)'])
  header.height = 22
  header.eachCell(cell => {
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.HEADER_BG } }
    cell.font      = { bold: true, color: { argb: 'FF' + COR.HEADER_TX }, name: 'Calibri', size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border    = {
      top:    { style: 'medium', color: { argb: 'FF' + COR.HEADER_BG } },
      bottom: { style: 'medium', color: { argb: 'FF' + COR.HEADER_BG } },
      left:   { style: 'thin',   color: { argb: 'FF555555' } },
      right:  { style: 'thin',   color: { argb: 'FF555555' } },
    }
  })

  // ── Linhas de exemplo ──
  EXEMPLOS.forEach(ex => {
    const row = ws.addRow([ex.tipo, ex.codigo, ex.nome, ex.qtd || '', ex.un || '', ex.dur || ''])
    row.height = 18
    // Alinhamento por coluna
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(2).alignment = { horizontal: 'left',   vertical: 'middle' }
    row.getCell(3).alignment = { horizontal: 'left',   vertical: 'middle' }
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }
    aplicarEstiloLinha(row, ex.tipo)
  })

  // ── 100 linhas em branco para preenchimento ──
  for (let i = 0; i < 100; i++) {
    const row = ws.addRow(['', '', '', '', '', ''])
    row.height = 18
    row.eachCell({ includeEmpty: true }, cell => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left:   { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right:  { style: 'thin', color: { argb: 'FFDDDDDD' } },
      }
      cell.font = { name: 'Calibri', size: 10 }
    })
  }

  // ── Data Validations ──
  const ultimaLinha = 2 + EXEMPLOS.length + 100

  // Coluna A: lista TIPO
  ws.dataValidations.add(`A2:A${ultimaLinha}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"CC,E,SE,S"'],
    showErrorMessage: true,
    errorTitle: 'Tipo inválido',
    error: 'Use: CC, E, SE ou S',
  })

  // Coluna E: lista UNIDADE
  ws.dataValidations.add(`E2:E${ultimaLinha}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"M,M²,M³,UN,PC,VB,HR,KG,L"'],
    showErrorMessage: true,
    errorTitle: 'Unidade inválida',
    error: 'Selecione uma unidade da lista',
  })

  // Coluna F: inteiro positivo
  ws.dataValidations.add(`F2:F${ultimaLinha}`, {
    type: 'whole',
    operator: 'greaterThan',
    allowBlank: true,
    formulae: [0],
    showErrorMessage: true,
    errorTitle: 'Duração inválida',
    error: 'Informe um número inteiro maior que 0',
  })

  // Coluna D: decimal positivo
  ws.dataValidations.add(`D2:D${ultimaLinha}`, {
    type: 'decimal',
    operator: 'greaterThan',
    allowBlank: true,
    formulae: [0],
    showErrorMessage: true,
    errorTitle: 'Quantidade inválida',
    error: 'Informe um número maior que 0',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // ABA 2 — Instruções
  // ══════════════════════════════════════════════════════════════════════════
  const wi = wb.addWorksheet('Instruções', {
    properties: { tabColor: { argb: 'FF1A5276' } },
  })
  wi.getColumn('A').width = 14
  wi.getColumn('B').width = 70

  const addTitulo = (texto) => {
    wi.mergeCells(`A${wi.rowCount + 1}:B${wi.rowCount + 1}`)
    const row = wi.lastRow
    row.height = 26
    const cell = row.getCell(1)
    cell.value = texto
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.INST_TTL } }
    cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13, name: 'Calibri' }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  }

  const addSubtitulo = (texto) => {
    wi.mergeCells(`A${wi.rowCount + 1}:B${wi.rowCount + 1}`)
    const row = wi.lastRow
    row.height = 20
    const cell = row.getCell(1)
    cell.value = texto
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COR.INST_BG } }
    cell.font  = { bold: true, color: { argb: 'FF' + COR.INST_TTL }, size: 11, name: 'Calibri' }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  }

  const addLinha = (col1, col2, bg = 'FFFFFFFF') => {
    const row = wi.addRow([col1, col2])
    row.height = 18
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      cell.font = { name: 'Calibri', size: 10 }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
    row.getCell(1).font = { bold: true, name: 'Calibri', size: 10, color: { argb: 'FF' + COR.INST_TTL } }
  }

  addTitulo('MODELO DE IMPORTAÇÃO EAP — BIASI ENGENHARIA')
  addSubtitulo('Instruções de preenchimento')
  wi.addRow([])

  addSubtitulo('TIPOS DE ITEM')
  addLinha('CC', 'Célula Construtiva — agrupa Etapas. Não preencher QTD / UN / DUR.', 'FFF0F8FF')
  addLinha('E',  'Etapa — agrupa Sub-etapas. Não preencher QTD / UN / DUR.', 'FFFFFFFF')
  addLinha('SE', 'Sub-etapa — agrupa Serviços. Não preencher QTD / UN / DUR.', 'FFF0F8FF')
  addLinha('S',  'Serviço / Tarefa — preencher QTD, UN e DUR (dias) quando disponível.', 'FFFFFFFF')
  wi.addRow([])

  addSubtitulo('UNIDADES ACEITAS')
  addLinha('M',   'Metro linear', 'FFF0F8FF')
  addLinha('M²',  'Metro quadrado', 'FFFFFFFF')
  addLinha('M³',  'Metro cúbico', 'FFF0F8FF')
  addLinha('UN',  'Unidade', 'FFFFFFFF')
  addLinha('PC',  'Peça', 'FFF0F8FF')
  addLinha('VB',  'Verba (valor global)', 'FFFFFFFF')
  addLinha('HR',  'Hora', 'FFF0F8FF')
  addLinha('KG',  'Quilograma', 'FFFFFFFF')
  addLinha('L',   'Litro', 'FFF0F8FF')
  wi.addRow([])

  addSubtitulo('REGRAS DE PREENCHIMENTO')
  addLinha('1.', 'Manter hierarquia: CC → E → SE → S (não pular níveis)', 'FFF0F8FF')
  addLinha('2.', 'Não alterar o cabeçalho (linha 1)', 'FFFFFFFF')
  addLinha('3.', 'Não deixar linhas em branco entre os itens', 'FFF0F8FF')
  addLinha('4.', 'O código deve refletir a hierarquia: 1 / 1.1 / 1.1.1 / 1.1.1.1', 'FFFFFFFF')
  addLinha('5.', 'Após preencher: selecionar os dados (sem o cabeçalho), copiar (Ctrl+C) e colar no campo de importação da plataforma', 'FFF0F8FF')
  addLinha('6.', 'Para copiar incluindo o cabeçalho: use Ctrl+A → Ctrl+C → colar na plataforma (o parser ignora a primeira linha se ela contiver "TIPO")', 'FFFFFFFF')

  // Proteger aba de instruções
  wi.protect('biasi2024', {
    selectLockedCells:   true,
    selectUnlockedCells: true,
    formatCells:         false,
    formatColumns:       false,
    formatRows:          false,
    insertColumns:       false,
    insertRows:          false,
    deleteColumns:       false,
    deleteRows:          false,
    sort:                false,
    autoFilter:          false,
  })

  // ── Salvar ──
  await wb.xlsx.writeFile(OUTPUT)
  console.log(`✅ Modelo gerado: ${OUTPUT}`)
}

gerarModelo().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
