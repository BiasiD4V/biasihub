-- =============================================
-- BIASI HUB - ATUALIZAÇÃO COMPLETA DO BANCO
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. ADICIONAR COLUNAS NA TABELA CLIENTES
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fantasia TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_cliente TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ie TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_erp TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS site TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacao TEXT;

-- 2. LIMPAR CLIENTES ANTIGOS (dados incorretos)
DELETE FROM clientes;

-- 3. CRIAR TABELA FORNECEDORES
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_erp TEXT,
  nome TEXT NOT NULL,
  cnpj TEXT,
  ie TEXT,
  endereco TEXT,
  municipio TEXT,
  uf TEXT,
  cep TEXT,
  telefone TEXT,
  tipo TEXT,
  avaliacao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS para fornecedores
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "fornecedores_read" ON fornecedores FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "fornecedores_insert" ON fornecedores FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "fornecedores_update" ON fornecedores FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "fornecedores_delete" ON fornecedores FOR DELETE USING (true);
