import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_TIMEOUT_MS = 12000

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios.',
    'Verifique as variáveis de ambiente no Vercel ou no arquivo .env local.'
  );
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  const onAbort = () => controller.abort();

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', onAbort, { once: true });
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
    if (init?.signal) {
      init.signal.removeEventListener('abort', onAbort);
    }
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  }
)

/** Sanitize a value for use inside PostgREST `.or()` filter strings.
 *  Commas and parentheses are PostgREST delimiters and must be stripped
 *  to prevent filter injection when interpolating user input. */
export function sanitizeFilterValue(value: string): string {
  return value.replace(/[,()]/g, '')
}
