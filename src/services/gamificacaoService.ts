import { supabase } from '../infrastructure/supabase/client';
import { PONTOS_ATIVIDADE } from '../components/gamification/gamificacaoTypes';
import type { EtapaFunil } from '../domain/value-objects/EtapaFunil';

/**
 * Mapeia as etapas do funil para os tipos de atividades que dão pontos.
 * Isso garante que ao mudar a etapa no formulário, a atividade correta seja registrada.
 */
const MAPA_ETAPA_ATIVIDADE: Partial<Record<EtapaFunil, string>> = {
  entrada_oportunidade: 'etapa_entrada',
  aguardando_documentos: 'etapa_docs',
  analise_inicial: 'etapa_analise',
  levantamento: 'etapa_levantamento',
  cotacao: 'etapa_cotacao',
  montagem_orcamento: 'etapa_montagem',
  revisao_interna: 'etapa_revisao',
  proposta_enviada: 'orcamento_enviado',
  followup: 'followup_realizado',
  negociacao: 'etapa_negociacao',
  pos_venda: 'contrato_fechado',
};

export const gamificacaoService = {
  /**
   * Registra uma atividade automaticamente se a nova etapa do funil der pontos.
   */
  async registrarAtividadePorEtapa(vendedor: string, etapa: EtapaFunil): Promise<void> {
    const tipoAtividade = MAPA_ETAPA_ATIVIDADE[etapa];
    
    if (!tipoAtividade) return;

    await this.registrarAtividadeDireta(vendedor, tipoAtividade);
  },

  /**
   * Registra uma atividade arbitrária diretamente.
   * Utilizado para follow-ups, contratos ganhos (fechamento), e criação de orçamentos.
   */
  async registrarAtividadeDireta(vendedor: string, tipoAtividade: string): Promise<void> {
    try {
      const pontos = PONTOS_ATIVIDADE[tipoAtividade] || 0;
      
      const { error } = await supabase.from('vendedor_atividades').insert({
        vendedor_nome: vendedor,
        tipo: tipoAtividade,
        pontos: pontos,
      });

      if (error) throw error;
      console.log(`[Gamificação] +${pontos}pts para ${vendedor} (${tipoAtividade})`);
    } catch (err) {
      console.error('[Gamificação] Erro ao registrar pontos automáticos:', err);
    }
  }
};
