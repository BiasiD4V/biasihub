-- ============================================================================
-- CRIAR USUÁRIOS DE TESTE PARA RBAC + RLS
-- ============================================================================
-- Execute isso em Supabase SQL Editor para criar usuários de teste

-- ⚠️ NOTA: Isso cria usuários "fake" NO BANCO DE DADOS
-- Para usar em produção com SSO/Auth real, adicione via Authentication UI

-- ─── Limpar usuários antigos (OPCIONAL - descomente se necessário) ────────
-- DELETE FROM usuario_obra WHERE usuario_id IN (SELECT id FROM perfis WHERE email LIKE '%test%');
-- DELETE FROM perfis WHERE email LIKE '%test%';

-- ─── 1. Inserir usuários em 'perfis' ──────────────────────────────────────

-- SUPERVISOR
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  gen_random_uuid(),
  'Supervisor Teste',
  'supervisor@test.com',
  'supervisor',
  true
)
ON CONFLICT (id) DO NOTHING;

-- VISUALIZADOR
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  gen_random_uuid(),
  'Visualizador Teste',
  'visualizador@test.com',
  'visualizador',
  true
)
ON CONFLICT (id) DO NOTHING;

-- DIRETOR
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  gen_random_uuid(),
  'Diretor Teste',
  'diretor@test.com',
  'diretor',
  true
)
ON CONFLICT (id) DO NOTHING;

-- GERENTE
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  gen_random_uuid(),
  'Gerente Teste',
  'gerente@test.com',
  'gerente',
  true
)
ON CONFLICT (id) DO NOTHING;

-- PLANEJAMENTO
INSERT INTO perfis (id, nome, email, perfil, ativo)
VALUES (
  gen_random_uuid(),
  'Planejamento Teste',
  'planejamento@test.com',
  'planejamento',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Vincular Supervisor a uma Obra (EXEMPLO) ──────────────────────────
-- Pegue o ID de uma obra real:
-- SELECT id, nome FROM obras LIMIT 1;

INSERT INTO usuario_obra (usuario_id, obra_id, papel)
SELECT
  (SELECT id FROM perfis WHERE email = 'supervisor@test.com' LIMIT 1),
  (SELECT id FROM obras LIMIT 1),
  'supervisor'
ON CONFLICT DO NOTHING;

-- ─── 3. Vincular Visualizador à mesma Obra ────────────────────────────────
INSERT INTO usuario_obra (usuario_id, obra_id, papel)
SELECT
  (SELECT id FROM perfis WHERE email = 'visualizador@test.com' LIMIT 1),
  (SELECT id FROM obras LIMIT 1),
  'visualizador'
ON CONFLICT DO NOTHING;

-- ─── VALIDAR ──────────────────────────────────────────────────────────────
-- Execute essas queries para confirmar:

/*
-- Ver todos os usuários criados
SELECT id, nome, email, perfil FROM perfis ORDER BY nome;

-- Ver acessos vinculados
SELECT
  p.nome,
  p.perfil,
  o.nome as obra_nome,
  uo.papel
FROM usuario_obra uo
JOIN perfis p ON uo.usuario_id = p.id
JOIN obras o ON uo.obra_id = o.id
ORDER BY p.nome;
*/

-- ✅ PRONTO! Agora você pode fazer login com:
-- supervisor@test.com / (crie senha em Supabase Auth → Users)
-- visualizador@test.com / (id)
-- diretor@test.com
-- gerente@test.com
-- planejamento@test.com
