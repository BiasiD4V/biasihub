-- ============================================================
-- 10-catalogo.sql  —  Catálogo Hierárquico de Insumos + ABC
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar colunas de classificação hierárquica na tabela insumos
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS subcategoria TEXT;

-- 2. Índices para navegação rápida na árvore
CREATE INDEX IF NOT EXISTS idx_insumos_categoria     ON insumos(categoria);
CREATE INDEX IF NOT EXISTS idx_insumos_subcategoria  ON insumos(subcategoria);
CREATE INDEX IF NOT EXISTS idx_insumos_cat_sub       ON insumos(categoria, subcategoria);

-- 3. Tabela de classificação ABC por fornecedor
CREATE TABLE IF NOT EXISTS fornecedores_abc (
  nome           TEXT PRIMARY KEY,
  classificacao  TEXT NOT NULL CHECK (classificacao IN ('A','B','C')),
  criterio       TEXT,       -- ex: "melhor preço + prazo de entrega"
  observacao     TEXT,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fornecedores_abc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_fornecedores_abc" ON fornecedores_abc;
CREATE POLICY "allow_all_fornecedores_abc"
  ON fornecedores_abc
  USING (true)
  WITH CHECK (true);

-- 4. Recriar insumos_view incluindo classificação ABC do fornecedor
CREATE OR REPLACE VIEW insumos_view AS
SELECT
  i.*,
  EXTRACT(DAY FROM NOW() - COALESCE(i.data_ultimo_preco, i.created_at))::INTEGER AS dias_sem_atualizar,
  fa.classificacao AS fornecedor_abc
FROM insumos i
LEFT JOIN fornecedores_abc fa ON fa.nome = i.fornecedor;

-- 5. View para categorias com contagem de itens
CREATE OR REPLACE VIEW catalogo_categorias AS
SELECT
  categoria,
  COUNT(*)::INTEGER AS total
FROM insumos
WHERE ativo = true AND categoria IS NOT NULL
GROUP BY categoria
ORDER BY categoria;

-- 6. View para subcategorias com contagem de itens
CREATE OR REPLACE VIEW catalogo_subcategorias AS
SELECT
  categoria,
  subcategoria,
  COUNT(*)::INTEGER AS total
FROM insumos
WHERE ativo = true AND subcategoria IS NOT NULL
GROUP BY categoria, subcategoria
ORDER BY categoria, subcategoria;

-- 7. Função RPC para itens agrupados por descrição dentro de categoria+subcategoria
CREATE OR REPLACE FUNCTION catalogo_itens(p_categoria TEXT, p_subcategoria TEXT)
RETURNS TABLE(
  descricao          TEXT,
  unidade            TEXT,
  total_fornecedores BIGINT,
  menor_custo        NUMERIC,
  maior_custo        NUMERIC,
  ultima_atualizacao TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    descricao,
    unidade,
    COUNT(*)                  AS total_fornecedores,
    MIN(custo_atual)          AS menor_custo,
    MAX(custo_atual)          AS maior_custo,
    MAX(data_ultimo_preco)    AS ultima_atualizacao
  FROM insumos
  WHERE
    ativo = true
    AND categoria = p_categoria
    AND subcategoria = p_subcategoria
  GROUP BY descricao, unidade
  ORDER BY descricao;
$$;
