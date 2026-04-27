-- Adicionar colunas de qualificação e funil comercial na tabela propostas
-- Executar no SQL Editor do Supabase Dashboard

ALTER TABLE propostas
ADD COLUMN IF NOT EXISTS etapa_funil text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS resultado_comercial text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS chance_fechamento text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS urgencia text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proxima_acao text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS data_proxima_acao text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ultima_interacao text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS observacao_comercial text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS link_arquivo text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fit_tecnico text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS clareza_documentos text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS valor_estrategico text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cliente_estrategico text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prazo_resposta text DEFAULT NULL;
