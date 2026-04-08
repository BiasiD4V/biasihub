import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const resendApiKey = Deno.env.get('RESEND_API_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function enviarPorResend(email: { id: string; to_email: string; subject: string; html_content: string }) {
  console.log('[PROCESS-EMAIL] Enviando para:', email.to_email)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@biasiobras.vercel.app',
      to: email.to_email,
      subject: email.subject,
      html: email.html_content,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(JSON.stringify(error))
  }

  const result = await response.json()
  return result
}

serve(async (req: Request) => {
  console.log('[PROCESS-EMAIL] Iniciando processamento de fila')

  try {
    // 1. Buscar emails não enviados
    const { data: emails, error: selectErr } = await supabase
      .from('email_queue')
      .select('*')
      .eq('enviado', false)
      .lt('tentativas', 3)
      .order('created_at', { ascending: true })
      .limit(10)

    if (selectErr) throw selectErr

    console.log('[PROCESS-EMAIL] Encontrados', emails?.length || 0, 'emails na fila')

    let enviados = 0
    let erros = 0

    for (const email of emails || []) {
      try {
        const resultado = await enviarPorResend(email)

        // Marcar como enviado
        const { error: updateErr } = await supabase
          .from('email_queue')
          .update({ enviado: true, sent_at: new Date().toISOString() })
          .eq('id', email.id)

        if (updateErr) throw updateErr

        console.log('[PROCESS-EMAIL] ✅ Enviado:', email.to_email, 'ID:', resultado.id)
        enviados++
      } catch (err) {
        console.error('[PROCESS-EMAIL] ❌ Erro ao enviar para', email.to_email, ':', err.message)

        // Incrementar tentativas
        const { error: updateErr } = await supabase
          .from('email_queue')
          .update({
            tentativas: (email.tentativas || 0) + 1,
            erro_msg: err.message,
          })
          .eq('id', email.id)

        if (updateErr) console.error('Erro ao atualizar tentativas:', updateErr.message)
        erros++
      }
    }

    return new Response(
      JSON.stringify({ sucesso: true, enviados, erros, total: emails?.length || 0 }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('[PROCESS-EMAIL] Erro:', error.message)
    return new Response(
      JSON.stringify({ erro: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
