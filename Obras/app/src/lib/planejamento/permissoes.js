// ============================================================================
// lib/planejamento/permissoes.js
// Re-exporta da fonte única de verdade: lib/acesso.js
// Mantido para compatibilidade com imports existentes.
// ============================================================================
export {
  PERFIS_ACESSO_GLOBAL,
  PERFIS_ACESSO_POR_OBRA,
  MATRIZ_ACESSO as MATRIZ_PERMISSOES,
  getPermissoesObj as getPermissoesPorPerfil,
  temPermissao,
} from '../acesso.js'
