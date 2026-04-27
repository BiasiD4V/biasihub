-- =============================================
-- ADICIONAR COLUNAS DE FUNIL/PRIORIDADE NA TABELA PROPOSTAS
-- Execute no Supabase SQL Editor
-- =============================================

-- Etapa do funil comercial
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS etapa_funil TEXT DEFAULT 'entrada_oportunidade';

-- Resultado comercial (em_andamento, ganho, perdido)
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS resultado_comercial TEXT DEFAULT 'em_andamento';

-- Qualificação da oportunidade
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS chance_fechamento TEXT; -- alta, media, baixa
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS urgencia TEXT;          -- alta, media, baixa

-- Próxima ação e data
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS proxima_acao TEXT;
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS data_proxima_acao DATE;

-- Última interação
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS ultima_interacao TIMESTAMPTZ DEFAULT now();

-- Observação comercial
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS observacao_comercial TEXT;

-- Atualizar propostas existentes com base no status atual
-- FECHADO → ganho, NÃO FECHADO/CANCELADO/DECLINADO → perdido, resto → em_andamento
UPDATE propostas SET resultado_comercial = 'ganho' WHERE status = 'FECHADO';
UPDATE propostas SET resultado_comercial = 'perdido' WHERE status IN ('NÃO FECHADO', 'CANCELADO', 'DECLINADO');
UPDATE propostas SET resultado_comercial = 'em_andamento' WHERE resultado_comercial IS NULL OR resultado_comercial = 'em_andamento';

-- Mapear etapas com base no status
UPDATE propostas SET etapa_funil = 'pos_venda' WHERE status = 'FECHADO';
UPDATE propostas SET etapa_funil = 'proposta_enviada' WHERE status = 'ENVIADO';
UPDATE propostas SET etapa_funil = 'montagem_orcamento' WHERE status = 'ORÇAMENTO';
UPDATE propostas SET etapa_funil = 'entrada_oportunidade' WHERE status = 'RECEBIDO';
