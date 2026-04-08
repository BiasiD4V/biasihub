-- Migração: Adicionar soft delete à tabela perfis
-- Descrição: Implementar exclusão lógica (soft delete) para auditoria e segurança
-- Data: 2026-04-07

-- Adiciona coluna deletado_em (timestamp quando foi deletado)
ALTER TABLE perfis
ADD COLUMN deletado_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Adiciona coluna deletado_por (UUID do admin que deletou)
ALTER TABLE perfis
ADD COLUMN deletado_por UUID DEFAULT NULL;

-- Cria índice para filtrar usuários não deletados (melhora performance)
CREATE INDEX idx_perfis_deletado_em ON perfis(deletado_em);

-- Cria índice para auditoria (quem deletou)
CREATE INDEX idx_perfis_deletado_por ON perfis(deletado_por);

-- Adiciona constraint: deletado_por deve estar em perfis (auditoria)
ALTER TABLE perfis
ADD CONSTRAINT fk_perfis_deletado_por
  FOREIGN KEY (deletado_por) REFERENCES perfis(id) ON DELETE SET NULL;

-- Cria view para usuários ativos (sem deletados)
CREATE OR REPLACE VIEW v_perfis_ativos AS
SELECT * FROM perfis WHERE deletado_em IS NULL;

-- Cria view para histórico de deletados (auditoria)
CREATE OR REPLACE VIEW v_perfis_deletados AS
SELECT
  id,
  nome,
  email,
  perfil,
  ativo,
  deletado_em,
  deletado_por,
  (SELECT nome FROM perfis WHERE id = perfis.deletado_por) as deletado_por_nome,
  ultimo_acesso
FROM perfis
WHERE deletado_em IS NOT NULL
ORDER BY deletado_em DESC;
