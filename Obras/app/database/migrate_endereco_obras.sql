-- Adiciona coluna endereco na tabela obras
-- Guarda o endereço bruto do Sienge (logradouro completo)
-- cidade passa a guardar apenas a cidade extraída

ALTER TABLE obras ADD COLUMN IF NOT EXISTS endereco TEXT;

-- Verificar resultado
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'obras'
  AND column_name IN ('cidade','estado','endereco')
ORDER BY column_name;
