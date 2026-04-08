import { supabase } from './supabase'

/**
 * Envia email via Edge Function send-email (SMTP Office 365)
 *
 * Tipos disponíveis:
 *   perfil_atualizado  → avisa usuário que seu perfil foi alterado
 *   medicao_aprovada   → avisa usuário que medição foi aprovada
 *   obra_finalizada    → avisa usuário que obra foi finalizada
 *
 * Para notificações de solicitação de acesso, use diretamente:
 *   { tipo: 'nova_solicitacao', solicitacao_id }
 *   { tipo: 'resposta_solicitacao', solicitacao_id }
 */
export const emailService = {

  async _invocar(payload) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!data.ok) console.error('[EMAIL] Erro:', data.erros)
      return data.ok
    } catch (err) {
      console.error('[EMAIL] Erro ao invocar função:', err.message)
      return false
    }
  },

  /**
   * Notifica usuário quando seu perfil é alterado
   * @param {string} to - Email do destinatário
   * @param {string} nome - Nome do usuário
   * @param {string} novoPerfil - Novo perfil atribuído
   */
  async notificarPerfilAtualizado(to, nome, novoPerfil) {
    return this._invocar({ tipo: 'perfil_atualizado', to, nome, perfil: novoPerfil })
  },

  /**
   * Notifica quando medição é aprovada
   * @param {string} to - Email do destinatário
   * @param {string} nome - Nome do usuário
   * @param {string} obra - Nome da obra
   * @param {string} valor - Valor formatado da medição
   */
  async notificarMedicaoAprovada(to, nome, obra, valor) {
    return this._invocar({ tipo: 'medicao_aprovada', to, nome, obra, valor })
  },

  /**
   * Notifica quando obra é finalizada
   * @param {string} to - Email do destinatário
   * @param {string} nome - Nome do usuário
   * @param {string} obra - Nome da obra
   */
  async notificarObraFinalizada(to, nome, obra) {
    return this._invocar({ tipo: 'obra_finalizada', to, nome, obra })
  },
}
