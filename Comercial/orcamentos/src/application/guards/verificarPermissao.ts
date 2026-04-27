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
  criar_obra: ['dono', 'admin', 'gestor', 'comercial'],
  criar_demanda: ['dono', 'admin', 'gestor', 'comercial'],
  criar_orcamento: ['dono', 'admin', 'gestor', 'orcamentista', 'comercial', 'engenheiro'],
  editar_revisao: ['dono', 'admin', 'gestor', 'orcamentista', 'engenheiro'],
  solicitar_revisao: ['dono', 'admin', 'gestor', 'orcamentista', 'engenheiro'],
  encaminhar_aprovacao: ['dono', 'admin', 'gestor'],
  devolver_revisao: ['dono', 'admin', 'gestor'],
  aprovar_revisao: ['dono', 'admin', 'gestor'],
  emitir_proposta: ['dono', 'admin', 'gestor', 'comercial'],
  criar_composicao_versao: ['dono', 'admin', 'gestor', 'orcamentista', 'engenheiro', 'comercial'],
  publicar_composicao_versao: ['dono', 'admin', 'gestor', 'engenheiro', 'comercial'],
  criar_template_versao: ['dono', 'admin', 'gestor', 'engenheiro', 'comercial'],
  publicar_template_versao: ['dono', 'admin', 'engenheiro', 'comercial'],
  gerenciar_politica_comercial: ['dono', 'admin'],
  gerenciar_usuarios: ['dono', 'admin', 'gestor'],
  visualizar_auditoria: ['dono', 'admin', 'gestor'],
  criar_cotacao: ['dono', 'admin', 'gestor', 'orcamentista', 'comercial', 'engenheiro'],
  gerenciar_cadastros_mestres: ['dono', 'admin', 'gestor'],
};

export function verificarPermissao(papel: PapelUsuario, acao: AcaoSistema): boolean {
  return PERMISSOES[acao].includes(papel);
}

export function assertPermissao(papel: PapelUsuario, acao: AcaoSistema): void {
  if (!verificarPermissao(papel, acao)) {
    throw new Error(`Perfil "${papel}" não tem permissão para "${acao}".`);
  }
}
