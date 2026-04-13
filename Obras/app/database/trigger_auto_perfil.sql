-- ============================================================================
-- TRIGGER: Auto-criar Perfil quando Usuário Faz Login
-- ============================================================================
-- Quando um novo usuário é criado em auth.users (via SSO/Login),
-- cria automaticamente um perfil em 'perfis' com papel 'supervisor'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.criar_perfil_ao_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfis (id, nome, email, perfil, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.user_metadata->>'full_name', NEW.email),
    NEW.email,
    'supervisor',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger dispara quando novo usuário é criado em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION criar_perfil_ao_signup();

-- ============================================================================
-- VALIDAÇÃO: Teste o trigger
-- ============================================================================
/*
Para testar:
1. Faça login via Microsoft em https://biasiobras.vercel.app
2. Execute na console do navegador: console.log(auth.currentUser)
3. Execute esse SQL:

SELECT id, nome, email, perfil, ativo FROM perfis ORDER BY created_at DESC LIMIT 5;

Esperado: Seu usuário aparecerá com perfil='supervisor' e ativo=true

Depois você vai para /admin/acessos e vincula às obras que quer.
*/
