UPDATE auth.users SET
  encrypted_password = crypt('Biasi@2025!', gen_salt('bf')),
  email_confirmed_at = NOW(),
  confirmation_token = '',
  raw_app_meta_data = raw_app_meta_data || '{"provider": "email", "providers": ["azure", "email"]}'::jsonb
WHERE email = 'rodrigo@biasiengenharia.com.br'
RETURNING id, email, email_confirmed_at;
