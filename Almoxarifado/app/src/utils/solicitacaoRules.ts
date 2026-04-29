export type CategoriaSolicitacao = 'insumos' | 'ferramentas' | 'frota';

export const SOLICITACAO_HORA_INICIO = '07:00';
export const SOLICITACAO_HORA_FIM = '16:00';
export const SOLICITACAO_FORA_HORARIO_MSG =
  'Solicitação fora do horário permitido. As solicitações só podem ser feitas entre 07:00 e 16:00. Procure o almoxarifado em caso de dúvida.';

const ORIGEM_LABEL: Record<CategoriaSolicitacao, string> = {
  insumos: 'Itens/Materiais',
  ferramentas: 'Ferramentas',
  frota: 'Frota',
};

const ORIGEM_MODULO: Record<CategoriaSolicitacao, string> = {
  insumos: 'almoxarifado_materiais',
  ferramentas: 'almoxarifado_ferramentas',
  frota: 'almoxarifado_frota',
};

export function origemLabel(categoria: CategoriaSolicitacao): string {
  return ORIGEM_LABEL[categoria] ?? 'Outro módulo do Hub';
}

export function origemModulo(categoria: CategoriaSolicitacao): string {
  return ORIGEM_MODULO[categoria] ?? 'hub_outro_modulo';
}

export function minutosDoDia(date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function horarioSolicitacaoPermitido(date = new Date()): boolean {
  const minutos = minutosDoDia(date);
  return minutos >= 7 * 60 && minutos <= 16 * 60;
}

export type FerramentaBloqueio = {
  bloqueado_solicitacao?: boolean | null;
  bloqueio_motivo?: string | null;
  bloqueio_observacao?: string | null;
};

export function ferramentaEstaBloqueada(item: FerramentaBloqueio | null | undefined): boolean {
  return Boolean(item?.bloqueado_solicitacao);
}

export function motivoBloqueioFerramenta(item: FerramentaBloqueio | null | undefined): string {
  const motivo = String(item?.bloqueio_motivo || '').trim();
  const detalhe = String(item?.bloqueio_observacao || '').trim();
  if (motivo && detalhe) return `${motivo} — ${detalhe}`;
  if (motivo) return motivo;
  return 'Ferramenta indisponível para solicitação';
}

export function mensagemFerramentaBloqueada(item: FerramentaBloqueio | null | undefined): string {
  return `Essa ferramenta está indisponível: ${motivoBloqueioFerramenta(item)}. Procure o almoxarifado em caso de dúvida.`;
}

