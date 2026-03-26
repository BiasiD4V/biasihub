const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Ler dados dos arquivos com métodos simples
function lerExcelComPython(caminhoArquivo) {
  const { execSync } = require('child_process')
  try {
    // Usar Python se disponível
    const pythonCode = `
import openpyxl
import json
import sys

workbook = openpyxl.load_workbook('${caminhoArquivo}')
sheet = workbook.active
dados = []
headers = None

for i, row in enumerate(sheet.iter_rows(values_only=True)):
    if i == 0:
        headers = row
    else:
        if any(cell is not None for cell in row):
            dados.append(dict(zip(headers, row)))

print(json.dumps(dados))
`
    
    const resultado = execSync(`python -c "${pythonCode.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' })
    return JSON.parse(resultado)
  } catch (err) {
    console.error('❌ Python não disponível ou erro ao ler:', err.message)
    return []
  }
}

// Carregar .env
const envPath = path.join(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = env.VITE_SUPABASE_URL || ''
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Normalizar nome
function normalizarNome(nome) {
  if (!nome) return ''
  return String(nome)
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(palavra => {
      if (
        palavra.toUpperCase() === 'LTDA' ||
        palavra.toUpperCase() === 'SA' ||
        palavra.toUpperCase() === 'EPP' ||
        palavra.toUpperCase() === 'ME'
      ) {
        return palavra.toUpperCase()
      }
      return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase()
    })
    .join(' ')
}

async function executar() {
  console.log('🚀 Iniciando importação de dados...\n')

  // Fornecedores
  console.log('📦 Importando fornecedores...\n')
  const caminhoFornecedores = path.join(process.cwd(), 'FORNECEDORES BIASI.xlsx')
  const fornecedoresData = lerExcelComPython(caminhoFornecedores)

  if (fornecedoresData.length > 0) {
    console.log(`✅ ${fornecedoresData.length} fornecedores lidos do Excel`)
    
    let inseridos = 0
    for (const forn of fornecedoresData) {
      try {
        const nome = normalizarNome(forn.Nome || forn.nome || '')
        if (!nome) continue

        const { error } = await supabase
          .from('fornecedores')
          .insert({
            nome,
            tipo: forn.Tipo || forn.tipo || 'PJ',
            cidade: forn.Cidade || forn.cidade || null,
            estado: forn.Estado || forn.estado || forn.UF || null,
            contato_nome: forn.Contato || forn.contato || null,
            contato_email: forn.Email || forn.email || null,
            contato_telefone: forn.Telefone || forn.telefone || null,
            ativo: true,
          })
          .select()
          .single()

        if (!error) {
          inseridos++
          console.log(`✅ ${nome}`)
        } else if (error.code !== 'PGRST116') {
          console.error(`❌ ${nome}:`, error.message)
        }
      } catch (err) {
        console.error('Erro:', err.message)
      }
    }
    console.log(`\n📦 Fornecedores inseridos: ${inseridos}`)
  }

  // Clientes
  console.log('\n👥 Atualizando clientes...\n')
  const caminhoClientes = path.join(process.cwd(), 'CLIENTES BIASI - DETALHADO.xlsx')
  const clientesData = lerExcelComPython(caminhoClientes)

  if (clientesData.length > 0) {
    console.log(`✅ ${clientesData.length} clientes lidos do Excel\n`)
    
    let atualizados = 0
    let novos = 0
    
    for (const cli of clientesData) {
      try {
        const nome = normalizarNome(cli.Nome || cli.nome || '')
        if (!nome) continue

        const { data: existente } = await supabase
          .from('clientes')
          .select('*')
          .ilike('nome', nome)
          .single()

        const dados = {
          nome,
          tipo: cli.Tipo || cli.tipo || 'PJ',
          cidade: cli.Cidade || cli.cidade || null,
          estado: cli.Estado || cli.estado || cli.UF || null,
          contato_nome: cli.Contato || cli.contato || null,
          contato_email: cli.Email || cli.email || null,
          contato_telefone: cli.Telefone || cli.telefone || null,
          ativo: cli.ativo !== false && cli.Ativo !== false,
        }

        if (existente) {
          const { error } = await supabase
            .from('clientes')
            .update(dados)
            .eq('id', existente.id)

          if (!error) {
            atualizados++
            console.log(`🔄 ${nome}`)
          }
        } else {
          const { error } = await supabase
            .from('clientes')
            .insert(dados)

          if (!error) {
            novos++
            console.log(`✨ ${nome}`)
          }
        }
      } catch (err) {
        // Ignorar erros de duplicatas
      }
    }
    console.log(`\n👥 Clientes: ${atualizados} atualizados, ${novos} novos`)
  }

  console.log('\n✅ Importação completa!')
  process.exit(0)
}

executar().catch(err => {
  console.error('❌ Erro:', err)
  process.exit(1)
})
