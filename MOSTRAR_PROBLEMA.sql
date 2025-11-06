-- =====================================================
-- MOSTRAR O PROBLEMA - Execute e me envie os resultados
-- =====================================================

-- 1. Último cliente criado
SELECT 
  'ULTIMO CLIENTE' as info,
  id,
  name,
  email,
  created_at
FROM public.clients
ORDER BY created_at DESC
LIMIT 1;

-- 2. Último documento uploadado
SELECT 
  'ULTIMO DOCUMENTO' as info,
  id,
  name,
  client_id,
  upload_date
FROM public.documents
ORDER BY upload_date DESC
LIMIT 1;

-- 3. O cliente do documento existe?
SELECT 
  'CLIENTE DO DOCUMENTO' as info,
  c.id,
  c.name,
  c.email,
  'Documento aponta para este cliente' as nota
FROM public.clients c
WHERE c.id = (
  SELECT client_id FROM public.documents ORDER BY upload_date DESC LIMIT 1
);

-- 4. User_profile desse cliente
SELECT 
  'USER_PROFILE' as info,
  up.id,
  up.email,
  up.client_id,
  up.name
FROM public.user_profiles up
WHERE up.email = (
  SELECT email FROM public.clients ORDER BY created_at DESC LIMIT 1
);

-- 5. Comparação direta
SELECT 
  'COMPARACAO' as info,
  c.email as cliente_email,
  c.id as cliente_id_correto,
  d.client_id as documento_aponta_para,
  up.client_id as user_profile_tem,
  CASE 
    WHEN c.id::text = d.client_id::text THEN 'DOCUMENTO OK'
    ELSE 'DOCUMENTO ERRADO'
  END as status_documento,
  CASE 
    WHEN c.id::text = up.client_id::text THEN 'USER_PROFILE OK'
    ELSE 'USER_PROFILE ERRADO'
  END as status_profile
FROM public.clients c
CROSS JOIN (SELECT client_id FROM public.documents ORDER BY upload_date DESC LIMIT 1) d
LEFT JOIN public.user_profiles up ON up.email = c.email
WHERE c.email = (SELECT email FROM public.clients ORDER BY created_at DESC LIMIT 1);

