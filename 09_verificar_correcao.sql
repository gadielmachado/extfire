-- ====================================================
-- VERIFICAÇÃO: Confirmar que está funcionando
-- ====================================================

-- Verificar user_profile
SELECT 
  email,
  name,
  role,
  client_id,
  CASE 
    WHEN client_id IS NOT NULL THEN '✅ CLIENT_ID PREENCHIDO'
    ELSE '❌ AINDA VAZIO'
  END as status
FROM user_profiles
WHERE email = 'gadielbizerramachado@gmail.com';

