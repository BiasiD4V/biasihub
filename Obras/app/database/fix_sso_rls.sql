-- Permite que usuários autenticados criem seu próprio perfil (necessário para SSO)
CREATE POLICY "usuario_cria_proprio_perfil"
ON perfis FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Permite que usuários atualizem seu próprio perfil (último acesso, etc.)
CREATE POLICY "usuario_atualiza_proprio_perfil"
ON perfis FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Cria perfil do administrador principal (rodrigo@biasiengenharia.com.br)
-- O id é o auth.users.id do usuário SSO criado após o primeiro login
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Busca o usuário pelo email na tabela auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'rodrigo@biasiengenharia.com.br'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Upsert: cria ou atualiza como admin
    INSERT INTO perfis (id, nome, email, perfil, avatar, ativo)
    VALUES (v_user_id, 'Rodrigo Gonçalves Santos', 'rodrigo@biasiengenharia.com.br', 'admin', 'RG', true)
    ON CONFLICT (id) DO UPDATE SET
      perfil = 'admin',
      nome   = COALESCE(EXCLUDED.nome, perfis.nome),
      ativo  = true;

    RAISE NOTICE 'Perfil admin criado/atualizado para: %', v_user_id;
  ELSE
    RAISE NOTICE 'Usuário rodrigo@biasiengenharia.com.br não encontrado em auth.users ainda.';
  END IF;
END;
$$;
