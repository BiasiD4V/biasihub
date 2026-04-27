/**
 * Script de enriquecimento de clientes via BrasilAPI
 * Preenche dados faltantes (cidade, endereço, nome fantasia, etc.)
 * para clientes PJ com CNPJ cadastrado.
 *
 * Execução: npx tsx scripts/enriquecer-clientes.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vzaabtzcilyoknksvhrc.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

interface ClienteRow {
  id: string
  nome: string
  cnpj_cpf: string | null
  nome_fantasia: string | null
  cidade: string | null
  estado: string | null
  endereco: string | null
  bairro: string | null
  cep: string | null
  contato_telefone: string | null
  tipo_pessoa: string | null
}

async function buscarCNPJ(cnpj: string) {
  const limpo = cnpj.replace(/\D/g, '')
  if (limpo.length !== 14) return null
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  console.log('🔍 Buscando clientes PJ com CNPJ...')

  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id,nome,cnpj_cpf,nome_fantasia,cidade,estado,endereco,bairro,cep,contato_telefone,tipo_pessoa')
    .not('cnpj_cpf', 'is', null)
    .order('nome')

  if (error) {
    console.error('Erro ao buscar clientes:', error.message)
    process.exit(1)
  }

  const pj = (clientes as ClienteRow[]).filter(
    (c) => c.cnpj_cpf && c.cnpj_cpf.replace(/\D/g, '').length === 14
  )

  console.log(`📋 ${pj.length} clientes PJ com CNPJ encontrados\n`)

  let atualizados = 0
  let pulados = 0
  let erros = 0

  for (let i = 0; i < pj.length; i++) {
    const c = pj[i]
    const progresso = `[${i + 1}/${pj.length}]`

    // Verifica se já tem todos os dados principais
    const temDados = c.cidade && c.estado && c.endereco
    if (temDados) {
      console.log(`⏭️  ${progresso} ${c.nome} — já tem dados, pulando`)
      pulados++
      continue
    }

    console.log(`🔎 ${progresso} ${c.nome} (${c.cnpj_cpf})...`)
    const d = await buscarCNPJ(c.cnpj_cpf!)

    if (!d) {
      console.log(`   ❌ Não encontrado na BrasilAPI`)
      erros++
      await delay(300)
      continue
    }

    const updates: Partial<ClienteRow> = {}

    if (!c.cidade && d.municipio) updates.cidade = d.municipio
    if (!c.estado && d.uf) updates.estado = d.uf
    if (!c.endereco && (d.logradouro || d.numero)) {
      updates.endereco = [d.logradouro, d.numero].filter(Boolean).join(', ')
    }
    if (!c.bairro && d.bairro) updates.bairro = d.bairro
    if (!c.cep && d.cep) {
      updates.cep = d.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2')
    }
    if (!c.nome_fantasia && d.nome_fantasia) updates.nome_fantasia = d.nome_fantasia
    if (!c.contato_telefone && d.ddd_telefone_1) {
      const tel = d.ddd_telefone_1.trim()
      updates.contato_telefone = `(${tel.slice(0, 2)}) ${tel.slice(2)}`
    }

    if (Object.keys(updates).length === 0) {
      console.log(`   ⏭️  Nada novo para atualizar`)
      pulados++
    } else {
      const { error: upErr } = await supabase
        .from('clientes')
        .update({ ...updates, atualizado_em: new Date().toISOString() })
        .eq('id', c.id)

      if (upErr) {
        console.log(`   ❌ Erro ao atualizar: ${upErr.message}`)
        erros++
      } else {
        console.log(`   ✅ Atualizado: ${Object.keys(updates).join(', ')}`)
        atualizados++
      }
    }

    await delay(300)
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`✅ Atualizados:  ${atualizados}`)
  console.log(`⏭️  Pulados:      ${pulados}`)
  console.log(`❌ Erros:        ${erros}`)
  console.log(`📊 Total:        ${pj.length}`)
}

main()
