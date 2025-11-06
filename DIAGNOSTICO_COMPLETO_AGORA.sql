-- =====================================================
-- DIAGNÓSTICO COMPLETO - Execute linha por linha
-- =====================================================

-- 1. Ver TODOS os clientes e seus IDs
SELECT 
  '1. CLIENTES' as etapa,
  id as client_id,
  name,
  email,
  created_at
FROM public.clients
ORDER BY created_at DESC;

-- 2. Ver TODOS os documentos e para qual cliente estão apontando
SELECT 
  '2. DOCUMENTOS' as etapa,
  d.id as doc_id,
  d.name as documento,
  d.client_id as client_id_documento,
  c.name as cliente_nome,
  c.email as cliente_email,
  d.upload_date,
  CASE 
    WHEN c.id IS NULL THEN '❌ ÓRFÃO - client_id não existe!'
    ELSE '✅ OK'
  END as status
FROM public.documents d
LEFT JOIN public.clients c ON c.id = d.client_id
ORDER BY d.upload_date DESC;

-- 3. Ver user_profiles e se estão sincronizados
SELECT 
  '3. USER_PROFILES' as etapa,
  up.email,
  up.name,
  up.client_id as client_id_user_profile,
  c.id as client_id_tabela_clients,
  CASE 
    WHEN up.client_id IS NULL THEN '❌ client_id é NULL'
    WHEN c.id IS NULL THEN '❌ client_id não existe na tabela clients'
    WHEN up.client_id::text = c.id::text THEN '✅ Sincronizado'
    ELSE '❌ IDs diferentes'
  END as status
FROM public.user_profiles up
LEFT JOIN public.clients c ON c.email = up.email
WHERE up.role = 'client'
ORDER BY up.email;

-- 4. Ver metadados do auth.users
SELECT 
  '4. AUTH METADATA' as etapa,
  au.email,
  au.raw_user_meta_data->>'name' as name,
  au.raw_user_meta_data->>'clientId' as client_id_metadata,
  c.id as client_id_correto,
  CASE 
    WHEN au.raw_user_meta_data->>'clientId' = c.id::text THEN '✅ Correto'
    WHEN au.raw_user_meta_data->>'clientId' IS NULL THEN '❌ NULL'
    ELSE '❌ ID errado: ' || au.raw_user_meta_data->>'clientId'
  END as status
FROM auth.users au
LEFT JOIN public.clients c ON c.email = au.email
WHERE au.email NOT IN ('gadielmachado.bm@gmail.com', 'gadyel.bm@gmail.com', 'extfire.extfire@gmail.com', 'paoliellocristiano@gmail.com')
ORDER BY au.email;

-- 5. RESUMO POR CLIENTE - Quantos documentos cada um deveria ver
SELECT 
  '5. RESUMO POR CLIENTE' as etapa,
  c.name as cliente,
  c.email,
  c.id as client_id,
  COUNT(d.id) as total_documentos,
  array_agg(d.name ORDER BY d.upload_date DESC) FILTER (WHERE d.name IS NOT NULL) as documentos
FROM public.clients c
LEFT JOIN public.documents d ON d.client_id = c.id
GROUP BY c.id, c.name, c.email
ORDER BY c.created_at DESC;

