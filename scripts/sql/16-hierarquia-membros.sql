-- ═══════════════════════════════════════════════════════
-- 16 - HIERARQUIA DE MEMBROS
-- Adicionar coluna departamento + expandir papéis
-- ═══════════════════════════════════════════════════════

-- 1. Adicionar coluna departamento
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS departamento TEXT;

-- 2. Remover check constraint antiga e adicionar nova com todos os papéis
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_papel_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_papel_check 
  CHECK (papel IN ('admin', 'dono', 'gestor', 'orcamentista', 'comercial', 'engenheiro', 'cliente'));

-- 3. Atribuir papéis e departamentos corretos
-- HEBER = DONO, Administração
UPDATE usuarios SET papel = 'dono', departamento = 'Administração' WHERE LOWER(nome) LIKE '%heber%';

-- GUI = Admin Supremo, Comercial
UPDATE usuarios SET papel = 'admin', departamento = 'Comercial' WHERE LOWER(nome) LIKE '%guilherme%' OR LOWER(email) LIKE '%guilherme%';

-- PAULO = Gestor Comercial
UPDATE usuarios SET papel = 'gestor', departamento = 'Comercial' WHERE LOWER(nome) LIKE '%paulo%';

-- RODRIGO = Gestor Engenharia
UPDATE usuarios SET papel = 'gestor', departamento = 'Engenharia' WHERE LOWER(nome) LIKE '%rodrigo%';

-- GIOVANNI = Comercial
UPDATE usuarios SET papel = 'comercial', departamento = 'Comercial' WHERE LOWER(nome) LIKE '%giovanni%';

-- RYAN = Comercial
UPDATE usuarios SET papel = 'comercial', departamento = 'Comercial' WHERE LOWER(nome) LIKE '%ryan%';

-- JENNI = Comercial
UPDATE usuarios SET papel = 'comercial', departamento = 'Comercial' WHERE LOWER(nome) LIKE '%jenni%';

-- LUAN = Comercial
UPDATE usuarios SET papel = 'comercial', departamento = 'Comercial' WHERE LOWER(nome) LIKE '%luan%';

-- LUIZ = Engenheiro Civil
UPDATE usuarios SET papel = 'engenheiro', departamento = 'Engenharia' WHERE LOWER(nome) LIKE '%luiz%';

-- 4. Verificar resultado
SELECT nome, email, papel, departamento, ativo FROM usuarios ORDER BY 
  CASE papel 
    WHEN 'dono' THEN 0 
    WHEN 'admin' THEN 1 
    WHEN 'gestor' THEN 2 
    WHEN 'comercial' THEN 3 
    WHEN 'engenheiro' THEN 4 
    WHEN 'orcamentista' THEN 5 
  END, nome;
