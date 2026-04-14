-- Adiciona colunas categoria e marca
ALTER TABLE public.itens_almoxarifado 
ADD COLUMN IF NOT EXISTS categoria text,
ADD COLUMN IF NOT EXISTS marca text;

-- Comentários para documentação
COMMENT ON COLUMN public.itens_almoxarifado.categoria IS 'Categoria do item (ex: Ferramentas Elétricas, EPI, Consumíveis)';
COMMENT ON COLUMN public.itens_almoxarifado.marca IS 'Marca do fabricante do item';
