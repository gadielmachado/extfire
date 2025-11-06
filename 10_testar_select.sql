-- ====================================================
-- TESTE: Simular busca de documentos
-- ====================================================

SELECT 
  d.id,
  d.name,
  d.client_id,
  'Deve aparecer!' as resultado
FROM documents d
WHERE d.client_id = public.get_user_client_id(
  (SELECT id FROM auth.users WHERE email = 'gadielbizerramachado@gmail.com')
);

