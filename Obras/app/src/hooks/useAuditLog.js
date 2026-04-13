// ============================================================================
// hooks/useAuditLog.js
// Hook para registrar ações sensíveis no audit_log do Supabase.
// Uso: const { registrar } = useAuditLog()
//      await registrar({ acao: 'aprovar_medicao', modulo: 'medicoes', ... })
// ============================================================================
import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Hook que retorna a função `registrar` para inserir entradas no audit_log.
 * Falhas silenciosas — o log não deve bloquear a ação principal do usuário.
 */
export function useAuditLog() {
  const { usuario } = useAuth()

  /**
   * Registra uma ação no audit log.
   * @param {object} params
   * @param {string}  params.acao           - chave da ação (ex: 'aprovar_medicao')
   * @param {string}  params.modulo         - módulo do sistema (ex: 'medicoes')
   * @param {string}  [params.entidade_id]  - ID da entidade afetada
   * @param {string}  [params.entidade_nome]- Nome/descrição da entidade
   * @param {object}  [params.dados_antes]  - estado antes da alteração
   * @param {object}  [params.dados_apos]   - estado após a alteração
   * @param {string}  [params.detalhes]     - descrição livre
   * @param {string}  [params.obra_id]      - ID da obra relacionada
   */
  const registrar = useCallback(async ({
    acao,
    modulo,
    entidade_id,
    entidade_nome,
    dados_antes,
    dados_apos,
    detalhes,
    obra_id,
  }) => {
    if (!usuario) return // não registra se não autenticado

    try {
      await supabase.from('audit_log').insert({
        usuario_id:     usuario.id,
        usuario_nome:   usuario.nome,
        usuario_perfil: usuario.perfil,
        acao,
        modulo,
        entidade_id:    entidade_id ? String(entidade_id) : null,
        entidade_nome:  entidade_nome || null,
        dados_antes:    dados_antes || null,
        dados_apos:     dados_apos  || null,
        detalhes:       detalhes    || null,
        obra_id:        obra_id     || null,
      })
    } catch {
      // Log de auditoria nunca deve bloquear a ação principal
    }
  }, [usuario])

  return { registrar }
}

// ─── Constantes de ações para evitar strings soltas ──────────────────────────
export const ACOES = {
  // Usuários
  LOGIN:                    'login',
  LOGOUT:                   'logout',
  CRIAR_USUARIO:            'criar_usuario',
  EDITAR_USUARIO:           'editar_usuario',
  DESATIVAR_USUARIO:        'desativar_usuario',
  REATIVAR_USUARIO:         'reativar_usuario',
  EXCLUIR_USUARIO:          'excluir_usuario',
  APROVAR_USUARIO:          'aprovar_usuario',
  OVERRIDE_PERMISSAO:       'override_permissao',
  REMOVER_OVERRIDE:         'remover_override',

  // Obras
  CRIAR_OBRA:               'criar_obra',
  EDITAR_OBRA:              'editar_obra',

  // Medições
  LANCAR_MEDICAO:           'lancar_medicao',
  APROVAR_MEDICAO:          'aprovar_medicao',
  REJEITAR_MEDICAO:         'rejeitar_medicao',

  // Planejamento
  CONGELAR_BASELINE:        'congelar_baseline',
  IMPORTAR_EAP:             'importar_eap',
  APROVAR_REPROGRAMACAO:    'aprovar_reprogramacao',
  SOLICITAR_REPROGRAMACAO:  'solicitar_reprogramacao',

  // Financeiro / Resultado
  GERENCIAR_DI:             'gerenciar_di',
  GERENCIAR_ADM_CENTRAL:    'gerenciar_adm_central',

  // Permissões
  SALVAR_PERMISSOES_PERFIL: 'salvar_permissoes_perfil',
}
