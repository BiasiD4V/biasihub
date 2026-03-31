import type { PapelUsuario } from '../../domain/value-objects/PapelUsuario';

export type AcaoSistema =
  | 'criar_obra'
  | 'criar_demanda'
  | 'criar_orcamento'
  | 'editar_revisao'
  | 'solicitar_revisao'
  | 'encaminhar_aprovacao'
  | 'devolver_revisao'
  | 'aprovar_revisao'
  | 'emitir_proposta'
  | 'criar_composicao_versao'
  | 'publicar_composicao_versao'
  | 'criar_template_versao'
  | 'publicar_template_versao'
  | 'gerenciar_politica_comercial'
  | 'gerenciar_usuarios'
  | 'visualizar_auditoria'
  | 'criar_cotacao'
  | 'gerenciar_cadastros_mestres';

const PERMISSOES: Record<AcaoSistema, PapelUsuario[]> = {
  criar_obra: ['admin', 'gestor'],
  criar_demanda: ['admin', 'gestor'],
  criar_orcamento: ['admin', 'gestor', 'orcamentista'],
  editar_revisao: ['admin', 'gestor', 'orcamentista'],
  solicitar_revisao: ['admin', 'gestor', 'orcamentista'],
  encaminhar_aprovacao: ['admin', 'gestor'],
  devolver_revisao: ['admin', 'gestor'],
  aprovar_revisao: ['admin', 'gestor'],
  emitir_proposta: ['admin', 'gestor'],
  criar_composicao_versao: ['admin', 'gestor', 'orcamentista'],
  publicar_composicao_versao: ['admin', 'gestor'],
  criar_template_versao: ['admin', 'gestor'],
  publicar_template_versao: ['admin'],
  gerenciar_politica_comercial: ['admin'],
  gerenciar_usuarios: ['admin'],
  visualizar_auditoria: ['admin', 'gestor'],
  criar_cotacao: ['admin', 'gestor', 'orcamentista'],
  gerenciar_cadastros_mestres: ['admin', 'gestor'],
};

export function verificarPermissao(papel: PapelUsuario, acao: AcaoSistema): boolean {
  return PERMISSOES[acao].includes(papel);
}

export function assertPermissao(papel: PapelUsuario, acao: AcaoSistema): void {
  if (!verificarPermissao(papel, acao)) {
    throw new Error(`Perfil "${papel}" não tem permissão para "${acao}".`);
  }
}
