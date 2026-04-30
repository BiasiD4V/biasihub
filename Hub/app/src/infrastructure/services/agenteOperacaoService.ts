import type {
  AtualizarStatusFilaInput,
  CriarItemFilaInput,
  PainelOperacaoAgente,
} from '../../domain/entities/AgenteOperacao';
import { agentesRepository } from '../supabase/agentesRepository';

export const agenteOperacaoService = {
  async carregarPainel(): Promise<PainelOperacaoAgente> {
    return agentesRepository.listarPainel();
  },

  async criarItem(input: CriarItemFilaInput): Promise<{ sucesso: boolean; erro?: string }> {
    if (!input.fluxoId) return { sucesso: false, erro: 'Selecione um fluxo.' };
    if (!input.entidadeTipo.trim()) return { sucesso: false, erro: 'Informe o tipo da entidade.' };
    if (!input.entidadeId.trim()) return { sucesso: false, erro: 'Informe o identificador da entidade.' };
    return agentesRepository.criarItemFila(input);
  },

  async atualizarStatus(input: AtualizarStatusFilaInput): Promise<{ sucesso: boolean; erro?: string }> {
    if (!input.itemId) return { sucesso: false, erro: 'Item de fila invalido.' };
    return agentesRepository.atualizarStatusFila(input);
  },

  assinarAtualizacoes(callback: () => void): () => void {
    return agentesRepository.assinarMudancas(callback);
  },
};
