import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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

// Criar cliente diretamente aqui
const supabaseUrl = env.VITE_SUPABASE_URL || ''
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  console.error('URL:', supabaseUrl ? '✓' : '✗')
  console.error('KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Normalizar nome: remover caracteres extras, capitalizar corretamente
function normalizarNome(nome: string, aplicarFormatacao = false): string {
  if (!nome) return ''

  // Remover espaços extras
  let limpo = nome.trim().replace(/\s+/g, ' ')

  // Remover caracteres especiais perigosos
  limpo = limpo.replace(/['"<>]/g, '')

  if (!aplicarFormatacao) {
    // Apenas normalizar para comparação
    return limpo.toLowerCase()
  }

  // Aplicar capitalização correta (Title Case)
  limpo = limpo
    .split(' ')
    .map(palavra => {
      if (palavra.length === 0) return ''
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

  return limpo
}

// Script pra limpar dados do Supabase - remove duplicados e formata nomes
async function limparClientes() {
  try {
    console.log('🧹 Iniciando limpeza de clientes...\n')

    // Buscar todos os clientes
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error

    // Mapear para encontrar duplicados (mesmo nome normalizado)
    const clientesNormalizados = new Map<string, (typeof clientes)[0][]>()

    clientes?.forEach(cli => {
      const nomeLimpo = normalizarNome(cli.nome)
      if (!clientesNormalizados.has(nomeLimpo)) {
        clientesNormalizados.set(nomeLimpo, [])
      }
      clientesNormalizados.get(nomeLimpo)?.push(cli)
    })

    console.log(`📊 Total de clientes: ${clientes?.length}`)
    console.log(`🔍 Clientes únicos após normalização: ${clientesNormalizados.size}`)

    // Encontrar duplicados
    const duplicados: string[] = []
    clientesNormalizados.forEach((grupo, nome) => {
      if (grupo.length > 1) {
        console.log(`\n⚠️ Duplicado encontrado: "${nome}"`)
        grupo.forEach((cli, idx) => {
          console.log(`   [${idx + 1}] ID: ${cli.id} | Nome: "${cli.nome}"`)
          if (idx > 0) duplicados.push(cli.id) // Manter o primeiro, deletar outros
        })
      }
    })

    if (duplicados.length > 0) {
      console.log(`\n🗑️ Deletando ${duplicados.length} registros duplicados...`)

      // Deletar duplicados
      for (const id of duplicados) {
        const { error: deleteError } = await supabase
          .from('clientes')
          .delete()
          .eq('id', id)

        if (deleteError) {
          console.error(`❌ Erro ao deletar ${id}:`, deleteError)
        } else {
          console.log(`✅ Deletado: ${id}`)
        }
      }
    } else {
      console.log('✅ Nenhum duplicado encontrado!')
    }

    // Atualizar nomes desformatados
    console.log('\n📝 Formatando nomes desformatados...')
    const { data: clientesRestantes } = await supabase
      .from('clientes')
      .select('*')

    let atualizados = 0
    for (const cli of clientesRestantes || []) {
      const nomeFormatado = normalizarNome(cli.nome, true)
      if (nomeFormatado !== cli.nome) {
        const { error: updateError } = await supabase
          .from('clientes')
          .update({ nome: nomeFormatado })
          .eq('id', cli.id)

        if (updateError) {
          console.error(`❌ Erro ao atualizar ${cli.id}:`, updateError)
        } else {
          console.log(`✅ "${cli.nome.substring(0, 40)}..." → "${nomeFormatado.substring(0, 40)}..."`)
          atualizados++
        }
      }
    }

    console.log(`\n✅ Limpeza concluída! (${atualizados} nomes formatados)`)
  } catch (error) {
    console.error('❌ Erro na limpeza:', error)
    process.exit(1)
  }
}

// Executar
limparClientes().then(() => process.exit(0))
