-- ============================================
-- SEED: Inserir usuários iniciais
-- IMPORTANTE: Substitua os <uuid-*> pelos UUIDs reais dos usuários criados no Supabase Auth
-- ============================================

-- Usuários administradores
INSERT INTO public.usuarios (id, nome, email, papel, ativo) VALUES
  ('<uuid-guilherme>', 'Guilherme', 'guilherme@biasiengenharia.com', 'admin', true),
  ('<uuid-paulo>', 'Paulo Confar', 'pauloconfar@biasiengenharia.com', 'admin', true),
  ('<uuid-ryan>', 'Ryan Stradioto', 'ryan.stradioto@biasiengenharia.com', 'admin', true),
  ('<uuid-giovani>', 'Giovani', 'giovani@biasiengenharia.com', 'user', true),
  ('<uuid-jennifer>', 'Jennifer', 'jennifer@biasiengenharia.com', 'user', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  papel = EXCLUDED.papel,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

-- Confirmar inserção
SELECT 'Seed de usuários concluído! Lembre-se de substituir os UUIDs pelos valores reais.' AS resultado;