-- Adicionar coluna arquivo à tabela mudancas_etapa
-- Esta coluna armazena um link ou caminho de pasta (UNC ou URL)
ALTER TABLE public.mudancas_etapa
ADD COLUMN IF NOT EXISTS arquivo text;

-- Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
