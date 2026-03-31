-- =============================================
-- ADICIONAR NOVOS USUÁRIOS
-- =============================================
-- ⚠️ IMPORTANTE: Execute este arquivo no Supabase SQL Editor
-- Este script cria:
-- 1. Os novos usuários do Supabase Auth
-- 2. Os perfis na tabela usuarios
-- =============================================

-- 1️⃣ Criar usuário: Giovanni
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
  'giovanni.comercialbiasi@gmail.com',
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
  '{"nome":"Giovanni","papel":"user"}'
)
ON CONFLICT(email) DO NOTHING;

-- 2️⃣ Criar usuário: Jenni
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
  'araujojenni2009@gmail.com',
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
  '{"nome":"Jenni","papel":"user"}'
)
ON CONFLICT(email) DO NOTHING;

-- 3️⃣ Inserir perfis na tabela usuarios (referenciando os users criados)
INSERT INTO public.usuarios (id, nome, email, papel, ativo)
SELECT id, 
  raw_user_meta_data->>'nome', 
  email, 
  raw_user_meta_data->>'papel', 
  true
FROM auth.users
WHERE email IN (
  'giovanni.comercialbiasi@gmail.com',
  'araujojenni2009@gmail.com'
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  papel = EXCLUDED.papel,
  ativo = EXCLUDED.ativo;

-- ✅ Confirmar
SELECT 'Novos usuários criados com sucesso! ✅' AS resultado,
  (SELECT COUNT(*) FROM auth.users WHERE email IN ('giovanni.comercialbiasi@gmail.com', 'araujojenni2009@gmail.com')) AS usuarios_adicionados;
