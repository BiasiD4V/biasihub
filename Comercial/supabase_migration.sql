-- ============================================
-- MIGRAÇÃO: Adicionar campos nos clientes + criar tabela fornecedores
-- ============================================

-- 1. Adicionar colunas que faltam na tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_cliente TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fantasia TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ie TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS site TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contato_principal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacao TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_erp TEXT;

-- 2. Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT,
  nome TEXT NOT NULL,
  cnpj TEXT,
  ie TEXT,
  endereco TEXT,
  municipio TEXT,
  uf TEXT,
  cep TEXT,
  telefone TEXT,
  tipo TEXT DEFAULT 'Forn.',
  avaliacao TEXT DEFAULT 'Não avaliado',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS na tabela fornecedores
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

-- 4. Política permissiva para fornecedores (mesmo padrão dos clientes)
CREATE POLICY "Permitir leitura de fornecedores" ON fornecedores FOR SELECT USING (true);
CREATE POLICY "Permitir insert de fornecedores" ON fornecedores FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update de fornecedores" ON fornecedores FOR UPDATE USING (true);
CREATE POLICY "Permitir delete de fornecedores" ON fornecedores FOR DELETE USING (true);

-- 5. Confirmar
SELECT 'Migração concluída com sucesso!' AS resultado;
