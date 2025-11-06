-- DIAGNÓSTICO: Verificar estado atual dos dados

-- 1. Ver user_profiles
SELECT 
  id as user_id,
  email,
  name,
  role,
  client_id,
  cnpj
FROM public.user_profiles
WHERE email = 'gadielbizerramachado@gmail.com';

-- 2. Ver clientes
SELECT 
  id as client_id,
  email,
  name,
  cnpj
FROM public.clients
WHERE email = 'gadielbizerramachado@gmail.com';

-- 3. Ver documentos
SELECT 
  d.id as document_id,
  d.name as document_name,
  d.client_id,
  c.name as client_name,
  c.email as client_email
FROM public.documents d
LEFT JOIN public.clients c ON d.client_id = c.id
ORDER BY d.upload_date DESC;

-- 4. Ver usuários auth
SELECT 
  id as user_id,
  email,
  raw_user_meta_data
FROM auth.users
WHERE email = 'gadielbizerramachado@gmail.com';

