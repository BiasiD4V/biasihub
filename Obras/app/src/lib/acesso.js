// ============================================================================
// lib/acesso.js
// FONTE ÚNICA DE VERDADE — Matriz de Acesso do ERP Biasi
//
// Qualquer permissão, perfil ou regra de acesso deve ser definida aqui.
// AuthContext, usePermissoes e geração de SQL de RLS importam daqui.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. PERFIS (roles)
// ----------------------------------------------------------------------------
export const ROLES = {
  MASTER:             'master',             // super-admin técnico, acesso irrestrito
  ADMIN:              'admin',              // administrador da empresa
  DIRETOR:            'diretor',            // diretoria — visão executiva, aprova
  GERENTE:            'gerente',            // gerente de projetos — gestão plena por obra
  PLANEJAMENTO:       'planejamento',       // técnico de planejamento — edita cronogramas (acesso global)
  PLANEJAMENTO_OBRA:  'planejamento_obra',  // técnico de planejamento por obra — edita cronograma vinculado
  SUPERVISOR:         'supervisor',         // encarregado de obra — campo
  VISUALIZADOR:       'visualizador',       // convidado somente-leitura
}

// Perfis que enxergam TODAS as obras sem precisar de vínculo em usuario_obra
export const PERFIS_ACESSO_GLOBAL = [
  ROLES.MASTER,
  ROLES.ADMIN,
  ROLES.DIRETOR,
  ROLES.GERENTE,
  ROLES.PLANEJAMENTO,
]

// Perfis restritos às obras vinculadas via usuario_obra
export const PERFIS_ACESSO_POR_OBRA = [
  ROLES.PLANEJAMENTO_OBRA,
  ROLES.SUPERVISOR,
  ROLES.VISUALIZADOR,
]

// ----------------------------------------------------------------------------
// 2. PERMISSÕES — chaves canônicas (snake_case)
// ----------------------------------------------------------------------------
export const P = {
  // ── Visibilidade de obras ─────────────────────────────────────────────────
  VER_DASHBOARD:           'ver_dashboard',
  VER_TODAS_OBRAS:         'ver_todas_obras',
  VER_OBRAS_PROPRIAS:      'ver_obras_proprias',   // acesso por vínculo
  CADASTRAR_OBRAS:         'cadastrar_obras',

  // ── Contratos e Medições ──────────────────────────────────────────────────
  VER_CONTRATOS:           'ver_contratos',
  VER_MEDICOES:            'ver_medicoes',          // visualizar lista e detalhes de medições
  LANCAR_MEDICAO:          'lancar_medicao',        // criar/editar boletins de medição
  APROVAR_MEDICOES:        'aprovar_medicoes',      // aprovar/rejeitar medições submetidas

  // ── Campo ─────────────────────────────────────────────────────────────────
  DIARIO_OBRA:             'diario_obra',           // lançar registros no diário
  VER_RELATORIO_DIARIO:    'ver_relatorio_diario',  // visualizar relatório consolidado do diário
  GESTAO_TAREFAS:          'gestao_tarefas',

  // ── Planejamento ──────────────────────────────────────────────────────────
  VER_PLANEJAMENTO:        'ver_planejamento',
  VER_CRONOGRAMA:          'ver_cronograma',        // somente leitura do cronograma
  EDITAR_CRONOGRAMA:       'editar_cronograma',     // editar atividades, datas e progresso
  EDITAR_PLANEJAMENTO:     'editar_planejamento',
  VER_RECURSOS:            'ver_recursos',
  VER_PROGRESSO:           'ver_progresso',
  REGISTRAR_AVANCO:        'registrar_avanco',
  VER_CURVA_S:             'ver_curva_s',
  VER_EVM:                 'ver_evm',
  SOLICITAR_REPROGRAMACAO: 'solicitar_reprogramacao',
  APROVAR_REPROGRAMACAO:   'aprovar_reprogramacao',
  IMPORTAR_EAP:            'importar_eap',
  EXPORTAR_RELATORIO:      'exportar_relatorio',
  CONGELAR_BASELINE:       'congelar_baseline',

  // ── Financeiro ────────────────────────────────────────────────────────────
  VER_FINANCEIRO:          'ver_financeiro',
  VER_PREVISTO_REALIZADO:  'ver_previsto_realizado',
  VER_CUSTOS_MO:           'ver_custos_mo',
  VER_CURVA_ABC:           'ver_curva_abc',
  VER_ORCAMENTO:           'ver_orcamento',

  // ── Relatórios ────────────────────────────────────────────────────────────
  VER_RELATORIO:           'ver_relatorio',

  // ── Resultado Operacional (Faturamento − MO − DI − ADM) ──────────────────
  VER_DI:                  'ver_di',               // ver despesas indiretas por obra
  GERENCIAR_DI:            'gerenciar_di',          // criar/editar/excluir despesas indiretas
  VER_ADM_CENTRAL:         'ver_adm_central',       // ver cálculo e parâmetros ADM Central
  GERENCIAR_ADM_CENTRAL:   'gerenciar_adm_central', // editar despesa sede e override %
  VER_RESULTADO:           'ver_resultado',          // ver resultado operacional consolidado

  // ── Suprimentos ───────────────────────────────────────────────────────────
  VER_SUPRIMENTOS:         'ver_suprimentos',       // visualizar pedidos e estoque
  GERENCIAR_SUPRIMENTOS:   'gerenciar_suprimentos', // criar/editar/excluir pedidos

  // ── Administração ─────────────────────────────────────────────────────────
  GERENCIAR_USUARIOS:      'gerenciar_usuarios',   // CRUD de usuários
  GERENCIAR_ACESSOS:       'gerenciar_acessos',    // config de perfis/permissões
  SIENGE_SYNC:             'sienge_sync',
}

// Array com todas as chaves de permissão (útil para inicializar objetos)
export const TODAS_PERMISSOES = Object.values(P)

// ----------------------------------------------------------------------------
// 3. MATRIZ DE ACESSO — perfil → Set de permissões concedidas
// ----------------------------------------------------------------------------
// master e admin recebem TUDO automaticamente via getPermissoes()
const _MASTER_ADMIN = new Set(TODAS_PERMISSOES)

const _DIRETOR = new Set([
  P.VER_DASHBOARD,        P.VER_TODAS_OBRAS,      P.CADASTRAR_OBRAS,
  P.VER_CONTRATOS,        P.VER_MEDICOES,         P.APROVAR_MEDICOES,
  P.VER_SUPRIMENTOS,      P.VER_RELATORIO_DIARIO,
  P.VER_PLANEJAMENTO,     P.VER_CRONOGRAMA,       P.VER_RECURSOS,         P.VER_PROGRESSO,
  P.VER_EVM,              P.VER_CURVA_S,
  P.APROVAR_REPROGRAMACAO, P.EXPORTAR_RELATORIO,  P.VER_RELATORIO,
  P.VER_FINANCEIRO,       P.VER_PREVISTO_REALIZADO,
  P.VER_CUSTOS_MO,        P.VER_CURVA_ABC,        P.VER_ORCAMENTO,
  P.VER_DI,               P.VER_ADM_CENTRAL,      P.VER_RESULTADO,
])

const _GERENTE = new Set([
  P.VER_DASHBOARD,        P.VER_TODAS_OBRAS,      P.CADASTRAR_OBRAS,
  P.VER_CONTRATOS,        P.VER_MEDICOES,         P.LANCAR_MEDICAO,       P.APROVAR_MEDICOES,
  P.DIARIO_OBRA,          P.VER_RELATORIO_DIARIO, P.GESTAO_TAREFAS,
  P.VER_SUPRIMENTOS,      P.GERENCIAR_SUPRIMENTOS,
  P.VER_PLANEJAMENTO,     P.VER_CRONOGRAMA,       P.VER_RECURSOS,         P.VER_PROGRESSO,
  P.VER_EVM,              P.VER_CURVA_S,
  P.SOLICITAR_REPROGRAMACAO, P.APROVAR_REPROGRAMACAO,
  P.EXPORTAR_RELATORIO,   P.VER_RELATORIO,
  P.VER_FINANCEIRO,       P.VER_PREVISTO_REALIZADO,
  P.VER_CUSTOS_MO,        P.VER_CURVA_ABC,        P.VER_ORCAMENTO,
  P.VER_DI,               P.VER_ADM_CENTRAL,      P.VER_RESULTADO,
])

const _PLANEJAMENTO = new Set([
  P.VER_DASHBOARD,        P.VER_TODAS_OBRAS,
  P.VER_SUPRIMENTOS,
  P.VER_PLANEJAMENTO,     P.VER_CRONOGRAMA,       P.EDITAR_CRONOGRAMA,    P.EDITAR_PLANEJAMENTO,
  P.VER_RECURSOS,         P.VER_PROGRESSO,        P.REGISTRAR_AVANCO,
  P.VER_EVM,              P.VER_CURVA_S,
  P.SOLICITAR_REPROGRAMACAO, P.VER_RELATORIO,
  P.EXPORTAR_RELATORIO,   P.IMPORTAR_EAP,         P.CONGELAR_BASELINE,
  P.GESTAO_TAREFAS,       P.DIARIO_OBRA,          P.VER_RELATORIO_DIARIO,
  P.VER_MEDICOES,         P.LANCAR_MEDICAO,       P.VER_ORCAMENTO,
])

// Técnico de planejamento vinculado por obra (acesso per-obra, não global)
const _PLANEJAMENTO_OBRA = new Set([
  P.VER_DASHBOARD,        P.VER_OBRAS_PROPRIAS,
  P.VER_SUPRIMENTOS,
  P.VER_PLANEJAMENTO,     P.VER_CRONOGRAMA,       P.EDITAR_CRONOGRAMA,
  P.VER_RECURSOS,         P.VER_PROGRESSO,        P.REGISTRAR_AVANCO,
  P.VER_EVM,              P.VER_CURVA_S,
  P.SOLICITAR_REPROGRAMACAO, P.VER_RELATORIO,     P.EXPORTAR_RELATORIO,
  P.GESTAO_TAREFAS,       P.DIARIO_OBRA,          P.VER_RELATORIO_DIARIO,
  P.VER_MEDICOES,         P.LANCAR_MEDICAO,       P.VER_ORCAMENTO,
])

const _SUPERVISOR = new Set([
  P.VER_DASHBOARD,        P.VER_OBRAS_PROPRIAS,
  P.DIARIO_OBRA,          P.VER_RELATORIO_DIARIO, P.GESTAO_TAREFAS,
  P.VER_MEDICOES,         P.LANCAR_MEDICAO,
  P.VER_PLANEJAMENTO,     P.VER_CRONOGRAMA,       P.REGISTRAR_AVANCO,     P.VER_PROGRESSO,
  P.VER_CURVA_S,          P.SOLICITAR_REPROGRAMACAO,
  P.VER_ORCAMENTO,
])

const _VISUALIZADOR = new Set([
  P.VER_DASHBOARD,        P.VER_OBRAS_PROPRIAS,
  P.VER_PLANEJAMENTO,     P.VER_CRONOGRAMA,       P.VER_CURVA_S,
])

// Mapa indexado por nome do perfil
export const MATRIZ_ACESSO = {
  [ROLES.MASTER]:            _MASTER_ADMIN,
  [ROLES.ADMIN]:             _MASTER_ADMIN,
  [ROLES.DIRETOR]:           _DIRETOR,
  [ROLES.GERENTE]:           _GERENTE,
  [ROLES.PLANEJAMENTO]:      _PLANEJAMENTO,
  [ROLES.PLANEJAMENTO_OBRA]: _PLANEJAMENTO_OBRA,
  [ROLES.SUPERVISOR]:        _SUPERVISOR,
  [ROLES.VISUALIZADOR]:      _VISUALIZADOR,
  viewer:                    _VISUALIZADOR, // alias legado
}

// ----------------------------------------------------------------------------
// 4. FUNÇÕES HELPER
// ----------------------------------------------------------------------------

/**
 * Retorna o Set de permissões de um perfil.
 * Retorna Set vazio se o perfil não for reconhecido.
 */
export function getPermissoes(perfil) {
  return MATRIZ_ACESSO[perfil] ?? new Set()
}

/**
 * Retorna as permissões de um perfil como array de strings.
 */
export function getPermissoesArray(perfil) {
  return [...getPermissoes(perfil)]
}

/**
 * Verifica se um perfil tem uma permissão específica.
 */
export function temPermissao(perfil, permissao) {
  return getPermissoes(perfil).has(permissao)
}

/**
 * Retorna objeto booleano {permissao: true|false} para todas as permissões
 * do sistema, dado um perfil.
 */
export function getPermissoesObj(perfil) {
  const concedidas = getPermissoes(perfil)
  return Object.fromEntries(TODAS_PERMISSOES.map(k => [k, concedidas.has(k)]))
}

/**
 * Verifica se um perfil tem acesso global (vê todas as obras sem vínculo).
 */
export function temAcessoGlobal(perfil) {
  return PERFIS_ACESSO_GLOBAL.includes(perfil)
}

// ----------------------------------------------------------------------------
// 5. PERMISSOES_PADRAO — compatível com o formato de array usado no AuthContext
//    (banco de dados e configurações dinâmicas)
// ----------------------------------------------------------------------------
export const PERMISSOES_PADRAO = Object.fromEntries(
  Object.entries(MATRIZ_ACESSO).map(([perfil, permSet]) => [perfil, [...permSet]])
)
