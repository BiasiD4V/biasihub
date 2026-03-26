-- =============================================
-- SETUP COMPLETO: BIASI HUB DATABASE
-- Execute estes comandos no Supabase SQL Editor
-- =============================================

-- PASSO 1: Executar o schema base
-- (Conteúdo do arquivo 01-schema.sql)

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

-- 2. CRIAR TABELA FORNECEDORES
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

-- 3. RLS para fornecedores
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "fornecedores_read" ON fornecedores FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "fornecedores_insert" ON fornecedores FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "fornecedores_update" ON fornecedores FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "fornecedores_delete" ON fornecedores FOR DELETE USING (true);

-- PASSO 2: Executar autenticação
-- (Conteúdo do arquivo 04-auth-usuarios.sql)

-- 1. Criar tabela public.usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  papel TEXT NOT NULL DEFAULT 'usuario' CHECK (papel IN ('admin', 'orcamentista', 'cliente')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS na tabela usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para usuarios
CREATE POLICY "usuarios_read_own" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "usuarios_read_admin" ON public.usuarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND papel = 'admin'
    )
  );

CREATE POLICY "usuarios_insert" ON public.usuarios
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "usuarios_update_own" ON public.usuarios
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "usuarios_update_admin" ON public.usuarios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND papel = 'admin'
    )
  );

-- 4. Função para criar usuário automaticamente no registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, papel)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'papel', 'usuario')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para criar usuário automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASSO 3: Inserir clientes
-- (Execute o conteúdo do arquivo 02-clientes.sql ou EXECUTAR-TUDO.sql)

-- PASSO 4: Criar usuários no Auth e executar seed
-- (Após criar usuários no Supabase Auth, execute 05-seed-usuarios.sql com UUIDs reais)

SELECT 'Setup do banco de dados concluído!' AS status;