-- =====================================================
-- DIAGNÓSTICO SIMPLES - SEM EMOJIS
-- =====================================================

-- 1. CLIENTES
SELECT 
  'CLIENTES' as tipo,
  id,
  name,
  email
FROM public.clients
ORDER BY created_at DESC;

-- 2. DOCUMENTOS e para quem estão apontando
SELECT 
  'DOCUMENTOS' as tipo,
  d.name as arquivo,
  d.client_id,
  c.name as cliente,
  c.email as email_cliente
FROM public.documents d
LEFT JOIN public.clients c ON c.id = d.client_id
ORDER BY d.upload_date DESC;

-- 3. USER_PROFILES
SELECT 
  'USER_PROFILES' as tipo,
  up.email,
  up.client_id,
  c.id as client_id_correto
FROM public.user_profiles up
LEFT JOIN public.clients c ON c.email = up.email
WHERE up.role = 'client'
ORDER BY up.email;

-- 4. AUTH METADATA
SELECT 
  'AUTH_METADATA' as tipo,
  au.email,
  au.raw_user_meta_data->>'clientId' as metadata_client_id,
  c.id as client_id_correto
FROM auth.users au
LEFT JOIN public.clients c ON c.email = au.email
WHERE c.id IS NOT NULL
ORDER BY au.email;

