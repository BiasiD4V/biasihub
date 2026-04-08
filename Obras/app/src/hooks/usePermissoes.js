// ============================================================================
// hooks/usePermissoes.js
// Hook de permissões — usa lib/acesso.js como fonte única de verdade.
// Aplica overrides individuais do usuário sobre a matriz do perfil.
// ============================================================================
import { useAuth } from '../context/AuthContext'
import { getPermissoesObj, TODAS_PERMISSOES, PERFIS_ACESSO_GLOBAL } from '../lib/acesso.js'

// Objeto sem permissão nenhuma (usuário não autenticado)
const SEM_PERMISSAO = Object.fromEntries(TODAS_PERMISSOES.map(k => [k, false]))

/**
 * usePermissoes(obraId?)
 *
 * Retorna flags booleanas por permissão para o usuário logado.
 * Permissão efetiva = perfil_padrão + overrides individuais (delta).
 * Se obraId for informado, valida o vínculo usuario_obra para perfis restritos.
 */
export function usePermissoes(obraId) {
  const { usuario, podeVerObra } = useAuth()

  if (!usuario) {
    return { ...SEM_PERMISSAO, temAcessoObra: false, perfil: null, usuarioId: null }
  }

  const perfil = usuario.perfil

  // Acesso à obra: global para perfis privilegiados, por vínculo para os demais
  const temAcessoObra = obraId
    ? PERFIS_ACESSO_GLOBAL.includes(perfil) || podeVerObra(obraId)
    : true

  // Baseline: permissões do perfil na matriz canônica
  const permissoesPerfil = getPermissoesObj(perfil)

  // Aplica overrides individuais do usuário (têm prioridade sobre o perfil)
  const overrides = usuario.permissoes_override || []
  const agora = new Date()

  const permissoesEfetivas = { ...permissoesPerfil }
  for (const ov of overrides) {
    // Ignora overrides expirados (validade_em no passado)
    if (ov.validade_em && new Date(ov.validade_em) < agora) continue
    permissoesEfetivas[ov.permissao] = ov.concedida
  }

  return {
    ...permissoesEfetivas,
    temAcessoObra,
    perfil,
    usuarioId: usuario.id,
    // Utilitários para a UI de edição
    _overrides: overrides,          // lista bruta dos overrides do usuário
    _perfil_base: permissoesPerfil, // permissões originais do perfil (sem override)
  }
}
