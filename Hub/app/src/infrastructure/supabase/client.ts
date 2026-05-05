import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_TIMEOUT_MS = 20000

if (!supabaseUrl || !supabaseAnonKey) {
  // Loga em vermelho pra ficar visível no DevTools (Vercel/Capacitor).
  // Mantém o cliente subindo com placeholder pra não derrubar o app inteiro,
  // mas todas as queries vão falhar — login e listagens vão ficar vazios.
  // eslint-disable-next-line no-console
  console.error(
    '%c[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes — login vai falhar.',
    'color:#fff;background:#c0392b;padding:4px 8px;font-weight:bold'
  );
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS)
  const onAbort = () => controller.abort()

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort()
    } else {
      init.signal.addEventListener('abort', onAbort, { once: true })
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
    if (init?.signal) {
      init.signal.removeEventListener('abort', onAbort)
    }
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      // Defensivo: explicita defaults pra garantir comportamento igual em todos
      // os ambientes (Vercel/web, Electron, Capacitor APK).
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // NÃO mexer em storageKey — usa default do Supabase pra manter sessão
      // compartilhada entre Hub e Almoxarifado.
    },
    global: {
      fetch: fetchWithTimeout,
    },
  }
)

export function sanitizeFilterValue(value: string): string {
  return value.replace(/[,()]/g, '')
}
