// ============================================================
// ERP Biasi — Edge Function: send-email
// Envia emails via SMTP Office 365 (smtp.office365.com:587)
//
// Variáveis de ambiente necessárias (Supabase Dashboard > Settings > Edge Functions):
//   SMTP_HOST    = smtp.office365.com
//   SMTP_PORT    = 587
//   SMTP_USER    = email@biasiengenharia.com.br
//   SMTP_PASS    = senha da conta kiosk
//   EMAIL_FROM   = email@biasiengenharia.com.br
//   URL_SISTEMA  = https://biasiobras.vercel.app
//
// Tipos aceitos:
//   tipo: 'nova_solicitacao'     → avisa admins que alguém pediu acesso
//   tipo: 'resposta_solicitacao' → avisa o usuário que pedido foi aprovado/negado
//   tipo: 'perfil_atualizado'    → avisa usuário que seu perfil foi alterado
//   tipo: 'medicao_aprovada'     → avisa usuário que medição foi aprovada
//   tipo: 'obra_finalizada'      → avisa usuário que obra foi finalizada
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Template base HTML ─────────────────────────────────────
function templateBase(titulo: string, corpo: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Cabeçalho azul -->
        <tr>
          <td style="background:#233772;padding:24px 32px;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">
              biasi <span style="color:#FFC82D;">·</span> PCO
            </p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.55);font-size:12px;">
              Planejamento e Controle de Obras
            </p>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#233772;font-size:18px;font-weight:700;">${titulo}</h2>
            ${corpo}
          </td>
        </tr>

        <!-- Rodapé -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              E-mail automático do sistema PCO Biasi. Não responda a este e-mail.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Template: nova solicitação (para admins) ───────────────
function htmlNovaSolicitacao(
  nomeUsuario: string, emailUsuario: string,
  pagina: string, mensagem: string | null, urlSistema: string
) {
  return templateBase('Solicitação de Acesso Recebida', `
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      O usuário <strong>${nomeUsuario}</strong>
      <span style="color:#94a3b8;">(${emailUsuario})</span>
      solicitou acesso a uma página restrita no sistema PCO.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
          Página solicitada
        </p>
        <p style="margin:0 0 ${mensagem ? '12px' : '0'};font-size:14px;font-weight:700;
                  color:#233772;font-family:monospace;">${pagina}</p>
        ${mensagem ? `
        <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
          Justificativa
        </p>
        <p style="margin:0;font-size:13px;color:#374151;font-style:italic;">"${mensagem}"</p>
        ` : ''}
      </td></tr>
    </table>

    <a href="${urlSistema}/usuarios"
      style="display:inline-block;background:#233772;color:#fff;text-decoration:none;
             padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
      Ver Solicitações Pendentes →
    </a>
  `)
}

// ─── Template: resposta ao solicitante ─────────────────────
function htmlRespostaSolicitacao(
  nomeUsuario: string, pagina: string, aprovado: boolean, urlSistema: string
) {
  const cor   = aprovado ? '#16a34a' : '#dc2626'
  const bgCor = aprovado ? '#f0fdf4' : '#fef2f2'
  const bdCor = aprovado ? '#bbf7d0' : '#fecaca'
  const icone = aprovado ? '✅' : '❌'
  const label = aprovado ? 'Aprovado' : 'Negado'

  return templateBase(`Solicitação de Acesso ${label}`, `
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Olá, <strong>${nomeUsuario}</strong>! Sua solicitação foi revisada.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:${bgCor};border:1.5px solid ${bdCor};border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:20px;text-align:center;">
        <p style="margin:0 0 6px;font-size:28px;">${icone}</p>
        <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:${cor};">Acesso ${label}</p>
        <p style="margin:0;font-size:13px;color:#374151;">
          Página: <strong style="font-family:monospace;">${pagina}</strong>
        </p>
      </td></tr>
    </table>

    ${aprovado
      ? `<p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6;">
           Seu acesso foi liberado. Se a página ainda aparecer como restrita,
           faça logout e entre novamente.
         </p>
         <a href="${urlSistema}"
           style="display:inline-block;background:#233772;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
           Acessar o Sistema →
         </a>`
      : `<p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
           Para mais informações, entre em contato com o administrador do sistema.
         </p>`
    }
  `)
}

// ─── Template: perfil atualizado ────────────────────────────
function htmlPerfilAtualizado(nome: string, novoPerfil: string, urlSistema: string) {
  return templateBase('Seu Perfil Foi Atualizado', `
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Olá, <strong>${nome}</strong>! Houve uma alteração no seu perfil de acesso no sistema PCO.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#eff2fc;border:1px solid #c7d2f5;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Novo Perfil</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#233772;text-transform:capitalize;">${novoPerfil}</p>
      </td></tr>
    </table>
    <a href="${urlSistema}"
      style="display:inline-block;background:#233772;color:#fff;text-decoration:none;
             padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
      Acessar o Sistema →
    </a>
  `)
}

// ─── Template: medição aprovada ─────────────────────────────
function htmlMedicaoAprovada(nome: string, obra: string, valor: string, urlSistema: string) {
  return templateBase('Medição Aprovada', `
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Olá, <strong>${nome}</strong>! Uma medição foi aprovada no sistema PCO.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Obra</p>
        <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#233772;">${obra}</p>
        <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Valor Aprovado</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#16a34a;">${valor}</p>
      </td></tr>
    </table>
    <a href="${urlSistema}"
      style="display:inline-block;background:#233772;color:#fff;text-decoration:none;
             padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
      Ver no Sistema →
    </a>
  `)
}

// ─── Template: obra finalizada ──────────────────────────────
function htmlObraFinalizada(nome: string, obra: string, urlSistema: string) {
  return templateBase('Obra Finalizada', `
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Olá, <strong>${nome}</strong>! A obra abaixo foi marcada como finalizada no sistema PCO.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Obra</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#233772;">🏗️ ${obra}</p>
      </td></tr>
    </table>
    <a href="${urlSistema}"
      style="display:inline-block;background:#233772;color:#fff;text-decoration:none;
             padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
      Ver no Sistema →
    </a>
  `)
}

// ─── Handler Principal ──────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SMTP_HOST   = Deno.env.get('SMTP_HOST')   ?? 'smtp.office365.com'
  const SMTP_PORT   = parseInt(Deno.env.get('SMTP_PORT') ?? '587')
  const SMTP_USER   = Deno.env.get('SMTP_USER')   ?? ''
  const SMTP_PASS   = Deno.env.get('SMTP_PASS')   ?? ''
  const EMAIL_FROM  = Deno.env.get('EMAIL_FROM')  ?? SMTP_USER
  const URL_SISTEMA = Deno.env.get('URL_SISTEMA') ?? 'https://biasiobras.vercel.app'

  if (!SMTP_USER || !SMTP_PASS) {
    console.error('[send-email] SMTP não configurado')
    return new Response(JSON.stringify({ ok: false, error: 'SMTP não configurado' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ ok: false, error: 'Body JSON inválido' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  }) }

  const { tipo } = body

  if (!tipo) {
    return new Response(JSON.stringify({ ok: false, error: 'tipo é obrigatório' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Cria transporter SMTP Office 365
  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: false,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
    tls:    { ciphers: 'SSLv3', rejectUnauthorized: false },
  })

  const erros: string[] = []
  let enviados = 0

  // ── Tipos de solicitação de acesso (usam solicitacao_id) ──
  if (tipo === 'nova_solicitacao' || tipo === 'resposta_solicitacao') {
    const { solicitacao_id } = body

    if (!solicitacao_id) {
      return new Response(JSON.stringify({ ok: false, error: 'solicitacao_id é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: sol, error: solErr } = await supabase
      .from('solicitacoes_acesso')
      .select('*, usuario:perfis!solicitacoes_acesso_usuario_id_fkey(id, nome, email)')
      .eq('id', solicitacao_id)
      .single()

    if (solErr || !sol) {
      return new Response(JSON.stringify({ ok: false, error: 'Solicitação não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (tipo === 'nova_solicitacao') {
      const { data: admins } = await supabase
        .from('perfis')
        .select('email, nome')
        .in('perfil', ['admin', 'master', 'diretor'])
        .eq('ativo', true)
        .not('email', 'is', null)

      for (const admin of (admins ?? [])) {
        try {
          await transporter.sendMail({
            from:    `"PCO Biasi" <${EMAIL_FROM}>`,
            to:      admin.email,
            subject: `[PCO] Solicitação de acesso — ${sol.usuario.nome}`,
            html:    htmlNovaSolicitacao(sol.usuario.nome, sol.usuario.email, sol.pagina, sol.mensagem, URL_SISTEMA),
          })
          enviados++
        } catch (e: any) {
          erros.push(`${admin.email}: ${e.message}`)
        }
      }
    }

    if (tipo === 'resposta_solicitacao') {
      const aprovado = sol.status === 'aprovado'
      try {
        await transporter.sendMail({
          from:    `"PCO Biasi" <${EMAIL_FROM}>`,
          to:      sol.usuario.email,
          subject: aprovado ? '[PCO] ✅ Seu acesso foi aprovado!' : '[PCO] Atualização sobre sua solicitação de acesso',
          html:    htmlRespostaSolicitacao(sol.usuario.nome, sol.pagina, aprovado, URL_SISTEMA),
        })
        enviados++
      } catch (e: any) {
        erros.push(`${sol.usuario.email}: ${e.message}`)
      }
    }
  }

  // ── Tipos diretos (passam to, nome e dados) ───────────────
  if (['perfil_atualizado', 'medicao_aprovada', 'obra_finalizada'].includes(tipo)) {
    const { to, nome, perfil, obra, valor } = body

    if (!to || !nome) {
      return new Response(JSON.stringify({ ok: false, error: 'to e nome são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let subject = ''
    let html = ''

    if (tipo === 'perfil_atualizado') {
      subject = '[PCO] Seu perfil foi atualizado'
      html = htmlPerfilAtualizado(nome, perfil ?? 'visualizador', URL_SISTEMA)
    } else if (tipo === 'medicao_aprovada') {
      subject = `[PCO] ✅ Medição aprovada — ${obra}`
      html = htmlMedicaoAprovada(nome, obra ?? '—', valor ?? '—', URL_SISTEMA)
    } else if (tipo === 'obra_finalizada') {
      subject = `[PCO] 🏗️ Obra finalizada — ${obra}`
      html = htmlObraFinalizada(nome, obra ?? '—', URL_SISTEMA)
    }

    try {
      await transporter.sendMail({ from: `"PCO Biasi" <${EMAIL_FROM}>`, to, subject, html })
      enviados++
      console.log(`[send-email] ✓ ${tipo} enviado para ${to}`)
    } catch (e: any) {
      console.error(`[send-email] ✗ Falha ${tipo} para ${to}:`, e.message)
      erros.push(`${to}: ${e.message}`)
    }
  }

  return new Response(JSON.stringify({ ok: erros.length === 0, enviados, erros }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
