import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios.',
    'Verifique as variáveis de ambiente no Vercel ou no arquivo .env local.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export function sanitizeFilterValue(value: string): string {
  return value.replace(/[,()]/g, '')
}
