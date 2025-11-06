-- VERIFICAÇÃO COMPLETA: Ver se tudo está correto

-- 1. User_profile com client_id correto?
SELECT 
  '1. USER_PROFILE' as verificacao,
  up.email,
  up.client_id,
  c.name as cliente_associado,
  CASE 
    WHEN up.client_id IS NOT NULL AND c.id IS NOT NULL THEN 'OK ✅'
    WHEN up.client_id IS NULL THEN 'ERRO: client_id está NULL ❌'
    ELSE 'ERRO: client_id inválido ❌'
  END as status
FROM public.user_profiles up
LEFT JOIN public.clients c ON up.client_id = c.id
WHERE up.email = 'gadielbizerramachado@gmail.com';

-- 2. Documentos associados ao cliente correto?
SELECT 
  '2. DOCUMENTOS' as verificacao,
  d.name as documento,
  d.client_id,
  c.email as cliente_email,
  CASE 
    WHEN c.id IS NOT NULL THEN 'OK ✅'
    ELSE 'ERRO: documento órfão ❌'
  END as status
FROM public.documents d
LEFT JOIN public.clients c ON d.client_id = c.id;

-- 3. Resumo geral
SELECT 
  '3. RESUMO' as verificacao,
  (SELECT COUNT(*) FROM public.clients WHERE email = 'gadielbizerramachado@gmail.com') as clientes,
  (SELECT COUNT(*) FROM public.user_profiles WHERE email = 'gadielbizerramachado@gmail.com') as user_profiles,
  (SELECT COUNT(*) FROM public.documents d 
   JOIN public.clients c ON d.client_id = c.id 
   WHERE c.email = 'gadielbizerramachado@gmail.com') as documentos_visiveis;

