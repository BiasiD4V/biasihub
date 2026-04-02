-- Adicionar coluna status à tabela mudancas_etapa
ALTER TABLE mudancas_etapa
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aprovado';

-- Registros existentes ficam como 'aprovado'
