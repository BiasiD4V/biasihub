-- Adiciona colunas de preço e classificação hierárquica (grupo/família)
-- Necessárias para importar dados do Sienge/Starian (posição de estoque)

ALTER TABLE public.itens_almoxarifado
ADD COLUMN IF NOT EXISTS preco_unitario numeric(14, 4),
ADD COLUMN IF NOT EXISTS grupo text,
ADD COLUMN IF NOT EXISTS familia text;

-- Índices para filtros e buscas
CREATE INDEX IF NOT EXISTS idx_itens_almoxarifado_grupo ON public.itens_almoxarifado (grupo);
CREATE INDEX IF NOT EXISTS idx_itens_almoxarifado_familia ON public.itens_almoxarifado (familia);
CREATE INDEX IF NOT EXISTS idx_itens_almoxarifado_codigo ON public.itens_almoxarifado (codigo);

COMMENT ON COLUMN public.itens_almoxarifado.preco_unitario IS 'Custo médio unitário do item em R$ (4 casas decimais conforme Sienge)';
COMMENT ON COLUMN public.itens_almoxarifado.grupo IS 'Grupo Sienge (ex: 02 - TABELA 2022)';
COMMENT ON COLUMN public.itens_almoxarifado.familia IS 'Família Sienge (ex: 02.002 - ELETRODUTOS E CONEXÕES)';
