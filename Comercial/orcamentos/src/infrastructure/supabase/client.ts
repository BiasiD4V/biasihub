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

/** Sanitize a value for use inside PostgREST `.or()` filter strings.
 *  Commas and parentheses are PostgREST delimiters and must be stripped
 *  to prevent filter injection when interpolating user input. */
export function sanitizeFilterValue(value: string): string {
  return value.replace(/[,()]/g, '')
}
