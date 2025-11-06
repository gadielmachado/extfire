-- ====================================================
-- VERIFICAR USER_PROFILE (AQUI ESTÁ O PROBLEMA!)
-- ====================================================

SELECT 
  id,
  email,
  name,
  role,
  client_id,
  CASE 
    WHEN client_id IS NULL THEN '❌ CLIENT_ID NULL!'
    WHEN client_id = 'ffe29e12-00c0-47eb-9df7-a76903280da5' THEN '✅ CLIENT_ID CORRETO'
    ELSE '⚠️ CLIENT_ID DIFERENTE: ' || client_id::text
  END as status
FROM user_profiles 
WHERE email = 'gadielbizerramachado@gmail.com';

