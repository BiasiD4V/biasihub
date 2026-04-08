// Script para aplicar migrations SQL no Supabase via Management API
// Execute: node database/apply-migration.js migration_003_notificacoes_usuario.sql

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PROJECT_REF = 'mzepeedobbbmmlidzsob'
const migrationFile = process.argv[2] || 'schema.sql'
const MIGRATION_PATH = resolve(__dirname, migrationFile)

// Lê o token do Supabase CLI
const tokenFile = resolve(homedir(), 'AppData/Roaming/supabase/access-token')
let ACCESS_TOKEN = ''

if (existsSync(tokenFile)) {
  ACCESS_TOKEN = readFileSync(tokenFile, 'utf8').trim()
} else {
  console.error('❌ Token não encontrado. Execute: npx supabase login')
  process.exit(1)
}

if (!existsSync(MIGRATION_PATH)) {
  console.error(`❌ Arquivo não encontrado: ${MIGRATION_PATH}`)
  process.exit(1)
}

const sql = readFileSync(MIGRATION_PATH, 'utf8')

console.log(`📝 Aplicando ${migrationFile}...`)

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const data = await res.json()

if (res.ok) {
  console.log(`✅ ${migrationFile} aplicado com sucesso!`)
  if (data.result && data.result.length > 0) {
    console.log('📊 Resultado:', data.result)
  }
} else {
  console.error(`❌ Erro ao aplicar ${migrationFile}:`, JSON.stringify(data, null, 2))
  process.exit(1)
}
