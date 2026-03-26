import { supabase } from './client'

// Script pra limpar dados do Supabase - remove duplicados e formata nomes

export async function limparClientes() {
  try {
    console.log('🧹 Iniciando limpeza de clientes...')
    
    // Buscar todos os clientes
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error

    // Mapear para encontrar duplicados (mesmo nome normalizado)
    const clientesNormalizados = new Map<string, typeof clientes[0][]>()
    
    clientes?.forEach((cli) => {
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

    if (duplicados.length === 0) {
      console.log('✅ Nenhum duplicado encontrado!')
      return
    }

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

    // Atualizar nomes desformatados
    console.log('\n📝 Formatando nomes desformatados...')
    const { data: clientesRestantes } = await supabase
      .from('clientes')
      .select('*')

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
          console.log(`✅ ${cli.nome.substring(0, 30)}... → ${nomeFormatado.substring(0, 30)}...`)
        }
      }
    }

    console.log('\n✅ Limpeza concluída!')
  } catch (error) {
    console.error('❌ Erro na limpeza:', error)
  }
}

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
      if (palavra.toUpperCase() === 'LTDA' || palavra.toUpperCase() === 'SA' || 
          palavra.toUpperCase() === 'EPP' || palavra.toUpperCase() === 'ME') {
        return palavra.toUpperCase()
      }
      return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase()
    })
    .join(' ')
  
  return limpo
}
