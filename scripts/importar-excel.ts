import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'

// Carregar .env manualmente
const envPath = path.join(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}

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

// Helper para ler Excel
function lerExcel(caminhoArquivo: string) {
  const workbook = xlsx.readFile(caminhoArquivo)
  const primeiraAba = workbook.SheetNames[0]
  const sheet = workbook.Sheets[primeiraAba]
  const dados = xlsx.utils.sheet_to_json(sheet)
  return dados
}

// Normalizar nome
function normalizarNome(nome: string): string {
  if (!nome) return ''
  return nome
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

// Importar fornecedores
async function importarFornecedores() {
  console.log('\n📦 Importando fornecedores...\n')

  try {
    const caminhoFornecedores = path.join(process.cwd(), 'FORNECEDORES BIASI.xlsx')
    const fornecedoresData = lerExcel(caminhoFornecedores)

    console.log(`📊 Total de fornecedores encontrados: ${fornecedoresData.length}`)

    // Verificar estrutura dos dados
    if (fornecedoresData.length > 0) {
      console.log('📋 Colunas encontradas:', Object.keys(fornecedoresData[0]))
    }

    let inseridos = 0
    let erros = 0

    for (const fornecedor of fornecedoresData) {
      try {
        const nomeFormatado = normalizarNome(fornecedor.nome || fornecedor.Nome || '')

        if (!nomeFormatado) {
          console.log('⚠️ Fornecedor sem nome, pulando...')
          continue
        }

        // Verificar se já existe
        const { data: existente } = await supabase
          .from('fornecedores')
          .select('id')
          .ilike('nome', nomeFormatado)
          .single()

        if (existente) {
          console.log(`ℹ️ Fornecedor já existe: ${nomeFormatado}`)
          continue
        }

        // Inserir fornecedor
        const { data, error } = await supabase
          .from('fornecedores')
          .insert({
            nome: nomeFormatado,
            tipo: fornecedor.tipo || fornecedor.Tipo || 'PJ',
            cidade: fornecedor.cidade || fornecedor.Cidade || null,
            estado: fornecedor.estado || fornecedor.Estado || null,
            contato_nome: fornecedor.contato || fornecedor.Contato || null,
            contato_email: fornecedor.email || fornecedor.Email || null,
            contato_telefone: fornecedor.telefone || fornecedor.Telefone || null,
            ativo: true,
          })
          .select()
          .single()

        if (error) {
          console.error(`❌ Erro ao inserir ${nomeFormatado}:`, error.message)
          erros++
        } else {
          console.log(`✅ Inserido: ${nomeFormatado}`)
          inseridos++
        }
      } catch (err) {
        console.error('❌ Erro ao processar fornecedor:', err)
        erros++
      }
    }

    console.log(`\n📦 Fornecedores: ${inseridos} inseridos, ${erros} erros`)
  } catch (err) {
    console.error('❌ Erro ao importar fornecedores:', err)
  }
}

// Atualizar clientes com dados detalhados
async function atualizarClientes() {
  console.log('\n👥 Atualizando clientes com dados detalhados...\n')

  try {
    const caminhoClientes = path.join(process.cwd(), 'CLIENTES BIASI - DETALHADO.xlsx')
    const clientesData = lerExcel(caminhoClientes)

    console.log(`📊 Total de clientes detalhados encontrados: ${clientesData.length}`)

    if (clientesData.length > 0) {
      console.log('📋 Colunas encontradas:', Object.keys(clientesData[0]))
    }

    let atualizados = 0
    let novos = 0
    let erros = 0

    for (const clienteData of clientesData) {
      try {
        const nomeFormatado = normalizarNome(clienteData.nome || clienteData.Nome || '')

        if (!nomeFormatado) {
          console.log('⚠️ Cliente sem nome, pulando...')
          continue
        }

        // Procurar cliente existente por nome similar
        const { data: existente } = await supabase
          .from('clientes')
          .select('*')
          .ilike('nome', nomeFormatado)
          .single()

        const dadosAtualizados = {
          nome: nomeFormatado,
          tipo: clienteData.tipo || clienteData.Tipo || 'PJ',
          cidade: clienteData.cidade || clienteData.Cidade || null,
          estado: clienteData.estado || clienteData.Estado || clienteData.UF || null,
          contato_nome: clienteData.contato || clienteData.Contato || null,
          contato_email: clienteData.email || clienteData.Email || null,
          contato_telefone: clienteData.telefone || clienteData.Telefone || null,
          ativo: clienteData.ativo !== false,
        }

        if (existente) {
          // Atualizar cliente existente
          const { error } = await supabase
            .from('clientes')
            .update(dadosAtualizados)
            .eq('id', existente.id)

          if (error) {
            console.error(`❌ Erro ao atualizar ${nomeFormatado}:`, error.message)
            erros++
          } else {
            console.log(`🔄 Atualizado: ${nomeFormatado}`)
            atualizados++
          }
        } else {
          // Inserir novo cliente
          const { error } = await supabase
            .from('clientes')
            .insert(dadosAtualizados)

          if (error) {
            console.error(`❌ Erro ao inserir ${nomeFormatado}:`, error.message)
            erros++
          } else {
            console.log(`✨ Novo: ${nomeFormatado}`)
            novos++
          }
        }
      } catch (err) {
        console.error('❌ Erro ao processar cliente:', err)
        erros++
      }
    }

    console.log(`\n👥 Clientes: ${atualizados} atualizados, ${novos} novos, ${erros} erros`)
  } catch (err) {
    console.error('❌ Erro ao atualizar clientes:', err)
  }
}

// Executar ambos
async function executar() {
  console.log('🚀 Iniciando importação de dados...')
  await importarFornecedores()
  await atualizarClientes()
  console.log('\n✅ Importação concluída!')
  process.exit(0)
}

executar().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
