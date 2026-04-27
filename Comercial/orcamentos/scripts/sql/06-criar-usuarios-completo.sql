-- =============================================
-- CRIAR USUÁRIOS AUTOMATICAMENTE
-- =============================================
-- ⚠️ IMPORTANTE: Execute este arquivo no Supabase SQL Editor
-- Este script cria:
-- 1. Os usuários do Supabase Auth
-- 2. Os perfis na tabela usuarios
-- =============================================

-- 1️⃣ Criar usuário: Guilherme
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'guilherme@biasiengenharia.com',
  crypt('1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  now(),
  '',
  now(),
  '',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nome":"Guilherme","papel":"admin"}'
)
ON CONFLICT(email) DO NOTHING;

-- 2️⃣ Criar usuário: Paulo
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'pauloconfar@biasiengenharia.com',
  crypt('1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  now(),
  '',
  now(),
  '',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nome":"Paulo Confar","papel":"admin"}'
)
ON CONFLICT(email) DO NOTHING;

-- 3️⃣ Criar usuário: Ryan
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'ryan.stradioto@biasiengenharia.com',
  crypt('1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  now(),
  '',
  now(),
  '',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nome":"Ryan Stradioto","papel":"admin"}'
)
ON CONFLICT(email) DO NOTHING;

-- 4️⃣ Criar usuário: Giovani
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'giovani@biasiengenharia.com',
  crypt('1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  now(),
  '',
  now(),
  '',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nome":"Giovani","papel":"user"}'
)
ON CONFLICT(email) DO NOTHING;

-- 5️⃣ Criar usuário: Jennifer
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'jennifer@biasiengenharia.com',
  crypt('1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  now(),
  '',
  now(),
  '',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nome":"Jennifer","papel":"user"}'
)
ON CONFLICT(email) DO NOTHING;

-- 6️⃣ Inserir perfis na tabela usuarios (referenciando os users criados)
INSERT INTO public.usuarios (id, nome, email, papel, ativo)
SELECT id, 
  raw_user_meta_data->>'nome', 
  email, 
  raw_user_meta_data->>'papel', 
  true
FROM auth.users
WHERE email IN (
  'guilherme@biasiengenharia.com',
  'pauloconfar@biasiengenharia.com',
  'ryan.stradioto@biasiengenharia.com',
  'giovani@biasiengenharia.com',
  'jennifer@biasiengenharia.com'
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  papel = EXCLUDED.papel,
  ativo = EXCLUDED.ativo;

-- ✅ Confirmar
SELECT 'Usuários criados com sucesso! ✅' AS resultado,
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%biasiengenharia.com') AS usuarios_criados;