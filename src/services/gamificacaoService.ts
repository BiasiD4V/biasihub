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
  /**
   * Remove a pontuação se a etapa for desfeita.
   */
  async reverterAtividadePorEtapa(vendedor: string, etapa: EtapaFunil): Promise<void> {
    const tipoAtividade = MAPA_ETAPA_ATIVIDADE[etapa];
    if (!tipoAtividade) return;
    await this.reverterAtividadeDireta(vendedor, tipoAtividade);
  },

  /**
   * Localiza e remove o registro mais recente de uma atividade para o vendedor.
   */
  async reverterAtividadeDireta(vendedor: string, tipoAtividade: string): Promise<void> {
    try {
      // Busca o ID do registro mais recente deste tipo para este vendedor
      const { data, error: searchError } = await supabase
        .from('vendedor_atividades')
        .select('id')
        .eq('vendedor_nome', vendedor)
        .eq('tipo', tipoAtividade)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (searchError) throw searchError;
      
      if (data) {
        const { error: deleteError } = await supabase
          .from('vendedor_atividades')
          .delete()
          .eq('id', data.id);
        
        if (deleteError) throw deleteError;
        console.log(`[Gamificação] Ponto revertido: ${vendedor} (${tipoAtividade})`);
      }
    } catch (err) {
      console.error('[Gamificação] Erro ao reverter pontos:', err);
    }
  }
};
