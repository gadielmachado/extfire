-- ====================================================
-- TESTAR FUNÇÃO get_user_client_id()
-- ====================================================

SELECT 
  u.id as user_id,
  u.email,
  public.get_user_client_id(u.id) as retorna,
  'ffe29e12-00c0-47eb-9df7-a76903280da5'::uuid as deveria_retornar,
  CASE 
    WHEN public.get_user_client_id(u.id) = 'ffe29e12-00c0-47eb-9df7-a76903280da5'::uuid THEN '✅ FUNÇÃO OK'
    WHEN public.get_user_client_id(u.id) IS NULL THEN '❌ FUNÇÃO RETORNA NULL!'
    ELSE '⚠️ FUNÇÃO RETORNA: ' || public.get_user_client_id(u.id)::text
  END as status
FROM auth.users u
WHERE u.email = 'gadielbizerramachado@gmail.com';

