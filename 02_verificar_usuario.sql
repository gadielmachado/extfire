-- ====================================================
-- VERIFICAR USUÁRIO AUTH
-- ====================================================

SELECT 
  id as user_id,
  email,
  raw_user_meta_data->>'clientId' as clientId_metadata,
  raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email = 'gadielbizerramachado@gmail.com';

