// ============================================================
// ERP Biasi — Edge Function: Gerenciamento de Usuários
// Requer service_role key (executada server-side)
// POST /functions/v1/manage-user
// Body: { action: 'create' | 'delete' | 'reset-password', ...params }
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Decodifica o sub (user_id) do JWT sem precisar chamar getUser()
 *  JWT usa base64url (- e _ em vez de + e /) — precisa converter antes de atob() */
function jwtUserId(authHeader: string): string | null {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const payload = token.split('.')[1]
    // base64url → base64 padrão
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(base64))
    return decoded.sub ?? null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Extrai user_id do JWT (gateway já validou assinatura)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
    const callerId = jwtUserId(authHeader)
    if (!callerId) {
      return jsonResp({ error: 'Token ausente ou inválido' }, 401)
    }

    // Verifica perfil admin no banco
    const { data: perfil, error: perfilCheckErr } = await supabaseAdmin
      .from('perfis')
      .select('perfil')
      .eq('id', callerId)
      .single()

    if (perfilCheckErr) {
      return jsonResp({ error: 'Erro ao verificar perfil: ' + perfilCheckErr.message }, 500)
    }
    if (perfil?.perfil !== 'admin' && perfil?.perfil !== 'master') {
      return jsonResp({ error: 'Apenas administradores podem gerenciar usuários' }, 403)
    }

    const body = await req.json()
    const { action } = body

    // ─── CREATE ───────────────────────────────────────────────
    if (action === 'create') {
      const { nome, email, senha, perfilAcesso } = body

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { full_name: nome },
      })
      if (authErr) return jsonResp({ error: authErr.message }, 400)

      const avatar = nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

      // Upsert: cobre tanto race condition (trigger ainda não rodou) quanto conflito
      const { data: novoPerfil, error: perfilErr } = await supabaseAdmin
        .from('perfis')
        .upsert(
          { id: authData.user.id, nome, email, perfil: perfilAcesso, avatar, ativo: true },
          { onConflict: 'id' }
        )
        .select()
        .single()

      if (perfilErr) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return jsonResp({ error: perfilErr.message }, 400)
      }

      return jsonResp({ usuario: novoPerfil })
    }

    // ─── DELETE ───────────────────────────────────────────────
    if (action === 'delete') {
      const { userId } = body
      if (userId === callerId) {
        return jsonResp({ error: 'Você não pode excluir sua própria conta' }, 400)
      }

      await supabaseAdmin.from('usuario_obra').delete().eq('usuario_id', userId)

      await Promise.allSettled([
        supabaseAdmin.from('obras').update({ responsavel_id: null }).eq('responsavel_id', userId),
        supabaseAdmin.from('medicoes').update({ criado_por: null }).eq('criado_por', userId),
        supabaseAdmin.from('medicoes').update({ enviado_por: null }).eq('enviado_por', userId),
        supabaseAdmin.from('medicoes').update({ aprovado_por: null }).eq('aprovado_por', userId),
        supabaseAdmin.from('contratos').update({ criado_por: null }).eq('criado_por', userId),
        supabaseAdmin.from('contratos').update({ aprovado_por: null }).eq('aprovado_por', userId),
        supabaseAdmin.from('tarefas').update({ responsavel_id: null }).eq('responsavel_id', userId),
        supabaseAdmin.from('tarefas').update({ criado_por: null }).eq('criado_por', userId),
        supabaseAdmin.from('obra_planejamentos').update({ importado_por: null }).eq('importado_por', userId),
        supabaseAdmin.from('obra_planejamentos').update({ congelado_por: null }).eq('congelado_por', userId),
        supabaseAdmin.from('obra_planejamentos').update({ deletado_por: null }).eq('deletado_por', userId),
        supabaseAdmin.from('mo_planejamento').update({ created_by: null }).eq('created_by', userId),
        supabaseAdmin.from('reprogramacoes').update({ solicitado_por: null }).eq('solicitado_por', userId),
        supabaseAdmin.from('reprogramacoes').update({ aprovado_por: null }).eq('aprovado_por', userId),
        supabaseAdmin.from('avancos_fisicos').update({ registrado_por: null }).eq('registrado_por', userId),
      ])

      await supabaseAdmin.from('perfis').delete().eq('id', userId)
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (delErr) return jsonResp({ error: delErr.message }, 400)

      return jsonResp({ ok: true })
    }

    // ─── RESET PASSWORD ───────────────────────────────────────
    if (action === 'reset-password') {
      const { userId, novaSenha } = body
      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: novaSenha })
      if (resetErr) return jsonResp({ error: resetErr.message }, 400)
      return jsonResp({ ok: true })
    }

    return jsonResp({ error: 'Ação desconhecida' }, 400)

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

