-- ================================================================
-- Cria usuário admin: rodrigo@biasiengenharia.com.br
-- Execute no Supabase Dashboard > SQL Editor
-- ================================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Verifica se o usuário já existe
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'rodrigo@biasiengenharia.com.br';

  IF v_user_id IS NULL THEN
    -- Cria novo usuário com senha
    v_user_id := gen_random_uuid();

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
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'rodrigo@biasiengenharia.com.br',
      crypt('Biasi@2024!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"nome": "Rodrigo Gonçalves Santos"}'::jsonb,
      false
    );

    -- Cria identidade de email
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      created_at,
      updated_at,
      last_sign_in_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'rodrigo@biasiengenharia.com.br'),
      'email',
      v_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Usuário criado com ID: %', v_user_id;
  ELSE
    -- Atualiza senha do usuário existente
    UPDATE auth.users
    SET
      encrypted_password = crypt('Biasi@2024!', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE 'Senha atualizada para usuário existente: %', v_user_id;
  END IF;

  -- Cria/atualiza perfil admin na tabela perfis
  INSERT INTO public.perfis (
    id,
    nome,
    email,
    perfil,
    avatar,
    ativo,
    created_at
  ) VALUES (
    v_user_id,
    'Rodrigo Gonçalves Santos',
    'rodrigo@biasiengenharia.com.br',
    'admin',
    'RG',
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    perfil = 'admin',
    ativo = true,
    nome = 'Rodrigo Gonçalves Santos';

  RAISE NOTICE 'Perfil admin configurado com sucesso!';
END $$;
