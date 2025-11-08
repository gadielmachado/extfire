-- =====================================================
-- DIAGNÓSTICO: jumpsorteio@gmail.com
-- =====================================================

-- 1. Ver o cliente na tabela clients
SELECT 
  '1️⃣ CLIENTE NA TABELA' as passo,
  id as client_id,
  name,
  email,
  cnpj,
  created_at
FROM clients
WHERE email = 'jumpsorteio@gmail.com';

-- 2. Ver o auth.users
SELECT 
  '2️⃣ AUTH.USERS' as passo,
  id as user_id,
  email,
  raw_user_meta_data->>'clientId' as metadata_client_id,
  raw_user_meta_data->>'role' as metadata_role,
  raw_user_meta_data->>'name' as metadata_name,
  created_at
FROM auth.users
WHERE email = 'jumpsorteio@gmail.com';

-- 3. Ver o user_profile
SELECT 
  '3️⃣ USER_PROFILE' as passo,
  id as user_id,
  email,
  client_id as profile_client_id,
  role,
  name,
  cnpj,
  created_at
FROM user_profiles
WHERE email = 'jumpsorteio@gmail.com';

-- 4. Ver TODOS os documentos e seus client_ids
SELECT 
  '4️⃣ DOCUMENTOS' as passo,
  d.id as document_id,
  d.name as document_name,
  d.client_id as document_client_id,
  d.upload_date,
  c.name as cliente_dono,
  c.email as email_dono
FROM documents d
LEFT JOIN clients c ON d.client_id = c.id
ORDER BY d.upload_date DESC;

-- 5. DIAGNÓSTICO FINAL: Identificar o problema
SELECT 
  '5️⃣ PROBLEMA IDENTIFICADO' as diagnostico,
  c.id as client_id_correto,
  c.name as cliente_nome,
  c.email as cliente_email,
  au.id as user_id,
  up.client_id as user_profile_client_id,
  (au.raw_user_meta_data->>'clientId')::uuid as metadata_client_id,
  CASE 
    WHEN up.client_id = c.id THEN '✅ user_profile OK'
    WHEN up.client_id IS NULL THEN '❌ user_profile sem client_id'
    WHEN up.client_id != c.id THEN '❌ user_profile com client_id ERRADO'
    ELSE '⚠️ VERIFICAR'
  END as status_profile,
  CASE 
    WHEN (au.raw_user_meta_data->>'clientId')::uuid = c.id THEN '✅ metadata OK'
    WHEN au.raw_user_meta_data->>'clientId' IS NULL THEN '❌ metadata sem clientId'
    WHEN (au.raw_user_meta_data->>'clientId')::uuid != c.id THEN '❌ metadata com clientId ERRADO'
    ELSE '⚠️ VERIFICAR'
  END as status_metadata,
  (
    SELECT COUNT(*) 
    FROM documents d 
    WHERE d.client_id = c.id
  ) as documentos_do_cliente_correto
FROM clients c
LEFT JOIN auth.users au ON au.email = c.email
LEFT JOIN user_profiles up ON up.id = au.id
WHERE c.email = 'jumpsorteio@gmail.com';

