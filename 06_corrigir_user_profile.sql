-- ====================================================
-- CORREÇÃO: Atualizar USER_PROFILE
-- ====================================================
-- Execute este script DEPOIS do diagnóstico
-- ====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID;
BEGIN
  -- Buscar user_id
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'gadielbizerramachado@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ ERRO: Usuário não encontrado!';
    RETURN;
  END IF;
  
  -- Client ID correto (do console)
  v_client_id := 'ffe29e12-00c0-47eb-9df7-a76903280da5'::uuid;
  
  -- Atualizar user_profile
  INSERT INTO user_profiles (id, email, name, role, client_id)
  SELECT 
    v_user_id,
    'gadielbizerramachado@gmail.com',
    COALESCE(c.name, 'Teste Cliente 2'),
    'client',
    v_client_id
  FROM clients c
  WHERE c.id = v_client_id
  ON CONFLICT (id) DO UPDATE SET
    client_id = v_client_id,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = 'client',
    updated_at = NOW();
  
  RAISE NOTICE '✅ User_profile atualizado com sucesso!';
  RAISE NOTICE 'Client ID: %', v_client_id;
END $$;

