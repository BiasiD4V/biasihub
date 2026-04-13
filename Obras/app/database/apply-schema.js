// Script para aplicar o schema.sql no Supabase via Management API
// Execute: node database/apply-schema.js

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PROJECT_REF = 'mzepeedobbbmmlidzsob'
const SCHEMA_FILE = resolve(__dirname, 'schema.sql')

// Lê o token do Supabase CLI (salvo após o 'supabase login')
import { homedir } from 'os'
import { existsSync } from 'fs'

const tokenFile = resolve(homedir(), 'AppData/Roaming/supabase/access-token')
let ACCESS_TOKEN = ''

if (existsSync(tokenFile)) {
  ACCESS_TOKEN = readFileSync(tokenFile, 'utf8').trim()
} else {
  console.error('Token não encontrado. Execute: npx supabase login')
  process.exit(1)
}

const sql = readFileSync(SCHEMA_FILE, 'utf8')

console.log('Aplicando schema.sql no Supabase...')

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
  console.log('✅ Schema aplicado com sucesso!')
} else {
  console.error('❌ Erro:', JSON.stringify(data, null, 2))
}
