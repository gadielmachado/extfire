-- =====================================================
-- DIAGNÓSTICO: Por que cliente não vê documentos?
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Ver todos os clientes
SELECT 
  'CLIENTES' as tipo,
  id, 
  name, 
  email, 
  created_at
FROM clients
ORDER BY created_at DESC;

-- 2. Ver todos os user_profiles e seus client_ids
SELECT 
  'USER_PROFILES' as tipo,
  id,
  email,
  name,
  role,
  client_id,
  cnpj,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- 3. Ver todos os documentos e seus client_ids
SELECT 
  'DOCUMENTOS' as tipo,
  d.id as document_id,
  d.name as document_name,
  d.client_id,
  c.name as client_name,
  c.email as client_email,
  d.upload_date
FROM documents d
LEFT JOIN clients c ON d.client_id = c.id
ORDER BY d.upload_date DESC;

-- 4. DIAGNÓSTICO CRÍTICO: Ver se há clientes com email mas sem user_profile correspondente
SELECT 
  'CLIENTES SEM USER_PROFILE' as problema,
  c.id as client_id,
  c.name as client_name,
  c.email as client_email,
  c.created_at
FROM clients c
WHERE c.email IS NOT NULL AND c.email != ''
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.email = c.email
  );

-- 5. DIAGNÓSTICO CRÍTICO: Ver user_profiles onde client_id está NULL mas deveria estar preenchido
SELECT 
  'USER_PROFILES COM CLIENT_ID NULL' as problema,
  up.id as user_id,
  up.email,
  up.name,
  up.role,
  up.client_id,
  c.id as client_id_correto,
  c.name as client_name_correto
FROM user_profiles up
LEFT JOIN clients c ON c.email = up.email
WHERE up.role = 'client' 
  AND up.client_id IS NULL 
  AND c.id IS NOT NULL;

-- 6. DIAGNÓSTICO CRÍTICO: Ver se get_user_client_id() funciona para cada user_profile
SELECT 
  'TESTE GET_USER_CLIENT_ID' as teste,
  up.id as user_id,
  up.email,
  up.client_id as client_id_na_tabela,
  public.get_user_client_id(up.id) as client_id_via_funcao,
  CASE 
    WHEN up.client_id = public.get_user_client_id(up.id) THEN '✅ OK'
    WHEN up.client_id IS NULL AND public.get_user_client_id(up.id) IS NOT NULL THEN '⚠️ Função retorna valor, tabela não'
    WHEN up.client_id IS NOT NULL AND public.get_user_client_id(up.id) IS NULL THEN '❌ Tabela tem valor, função não retorna'
    ELSE '❌ DIFERENTES'
  END as status
FROM user_profiles up
WHERE up.role = 'client';

-- 7. Ver os metadados dos usuários no auth.users
SELECT 
  'AUTH.USERS METADATA' as tipo,
  id,
  email,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'clientId' as clientId_metadata,
  created_at
FROM auth.users
WHERE email NOT IN (
  'gadielmachado.bm@gmail.com',
  'gadyel.bm@gmail.com',
  'extfire.extfire@gmail.com',
  'paoliellocristiano@gmail.com'
)
ORDER BY created_at DESC;

-- 8. DIAGNÓSTICO FINAL: Ver quais clientes conseguiriam ver quais documentos
SELECT 
  'TESTE DE ACESSO AOS DOCUMENTOS' as teste,
  up.email as cliente_email,
  up.name as cliente_name,
  public.get_user_client_id(up.id) as client_id_do_usuario,
  d.id as document_id,
  d.name as document_name,
  d.client_id as document_client_id,
  CASE 
    WHEN public.get_user_client_id(up.id) = d.client_id THEN '✅ CLIENTE PODE VER'
    ELSE '❌ CLIENTE NÃO PODE VER'
  END as acesso
FROM user_profiles up
CROSS JOIN documents d
WHERE up.role = 'client'
ORDER BY up.email, d.upload_date DESC;

