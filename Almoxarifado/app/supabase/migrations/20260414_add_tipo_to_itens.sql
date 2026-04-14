-- Adiciona coluna tipo para distinguir Materiais de Ferramentas
ALTER TABLE public.itens_almoxarifado 
ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'material' 
CHECK (tipo IN ('material', 'ferramenta'));

-- Comentário para expor no PostgREST
COMMENT ON COLUMN public.itens_almoxarifado.tipo IS 'Define se o item é um material de consumo ou uma ferramenta/ativo.';
