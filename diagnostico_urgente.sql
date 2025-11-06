-- ====================================================
-- DIAGNÓSTICO URGENTE - gadielbizerramachado@gmail.com
-- ====================================================

-- 1️⃣ VERIFICAR CLIENTE
SELECT '1️⃣ DADOS DO CLIENTE' as passo;
SELECT 
  id, 
  name, 
  email, 
  cnpj,
  is_blocked
FROM clients 
WHERE email = 'gadielbizerramachado@gmail.com';

-- 2️⃣ VERIFICAR USUÁRIO AUTH
SELECT '2️⃣ USUÁRIO AUTH' as passo;
SELECT 
  id as user_id,
  email,
  raw_user_meta_data->>'clientId' as clientId_metadata,
  raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email = 'gadielbizerramachado@gmail.com';

-- 3️⃣ VERIFICAR USER_PROFILE
SELECT '3️⃣ USER_PROFILE' as passo;
SELECT 
  id,
  email,
  name,
  role,
  client_id,
  CASE 
    WHEN client_id IS NULL THEN '❌ CLIENT_ID NULL!'
    WHEN client_id = 'ffe29e12-00c0-47eb-9df7-a76903280da5' THEN '✅ CLIENT_ID CORRETO'
    ELSE '⚠️ CLIENT_ID DIFERENTE: ' || client_id::text
  END as status
FROM user_profiles 
WHERE email = 'gadielbizerramachado@gmail.com';

-- 4️⃣ TESTAR FUNÇÃO get_user_client_id()
SELECT '4️⃣ TESTE DA FUNÇÃO' as passo;
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

-- 5️⃣ VERIFICAR TODOS OS DOCUMENTOS (SEM FILTRO RLS)
SELECT '5️⃣ TODOS OS DOCUMENTOS NO BANCO' as passo;
SELECT 
  d.id,
  d.name,
  d.client_id,
  c.name as cliente_nome,
  c.email as cliente_email,
  CASE 
    WHEN d.client_id = 'ffe29e12-00c0-47eb-9df7-a76903280da5'::uuid THEN '✅ CLIENT_ID CORRETO'
    ELSE '❌ CLIENT_ID ERRADO: ' || d.client_id::text
  END as status
FROM documents d
LEFT JOIN clients c ON d.client_id = c.id
ORDER BY d.upload_date DESC;

-- 6️⃣ DOCUMENTOS DO CLIENTE ESPECÍFICO
SELECT '6️⃣ DOCUMENTOS DESTE CLIENTE' as passo;
SELECT 
  id,
  name,
  type,
  size,
  upload_date,
  client_id
FROM documents
WHERE client_id = 'ffe29e12-00c0-47eb-9df7-a76903280da5'::uuid;

-- 7️⃣ SIMULAR BUSCA DO APP (COM RLS)
SELECT '7️⃣ SIMULAÇÃO DO APP (COM RLS ATIVA)' as passo;
SELECT 
  d.id,
  d.name,
  public.get_user_client_id(
    (SELECT id FROM auth.users WHERE email = 'gadielbizerramachado@gmail.com')
  ) as client_id_usado_na_busca
FROM documents d
WHERE d.client_id = public.get_user_client_id(
  (SELECT id FROM auth.users WHERE email = 'gadielbizerramachado@gmail.com')
);

-- 8️⃣ VERIFICAR POLÍTICAS RLS ATIVAS
SELECT '8️⃣ POLÍTICAS RLS DOCUMENTS' as passo;
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd, policyname;

-- 9️⃣ ANÁLISE FINAL
DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID;
  v_client_id_from_function UUID;
  v_doc_count INTEGER;
  v_doc_count_direct INTEGER;
BEGIN
  -- Buscar IDs
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'gadielbizerramachado@gmail.com';
  SELECT client_id INTO v_client_id FROM user_profiles WHERE id = v_user_id;
  v_client_id_from_function := public.get_user_client_id(v_user_id);
  
  -- Contar documentos
  SELECT COUNT(*) INTO v_doc_count FROM documents WHERE client_id = v_client_id;
  SELECT COUNT(*) INTO v_doc_count_direct FROM documents WHERE client_id = 'ffe29e12-00c0-47eb-9df7-a76903280da5'::uuid;
  
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           ANÁLISE DETALHADA DO PROBLEMA               ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Email: gadielbizerramachado@gmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Client ID (user_profile): %', v_client_id;
  RAISE NOTICE 'Client ID (função): %', v_client_id_from_function;
  RAISE NOTICE 'Client ID (esperado): ffe29e12-00c0-47eb-9df7-a76903280da5';
  RAISE NOTICE '';
  RAISE NOTICE 'Documentos com client_id do user_profile: %', v_doc_count;
  RAISE NOTICE 'Documentos com client_id esperado: %', v_doc_count_direct;
  RAISE NOTICE '';
  
  IF v_client_id IS NULL THEN
    RAISE NOTICE '❌ PROBLEMA: client_id está NULL no user_profile!';
    RAISE NOTICE '   Execute a correção do user_profile';
  ELSIF v_client_id != 'ffe29e12-00c0-47eb-9df7-a76903280da5'::uuid THEN
    RAISE NOTICE '❌ PROBLEMA: client_id no user_profile está ERRADO!';
    RAISE NOTICE '   Valor atual: %', v_client_id;
    RAISE NOTICE '   Valor correto: ffe29e12-00c0-47eb-9df7-a76903280da5';
  ELSIF v_client_id_from_function IS NULL THEN
    RAISE NOTICE '❌ PROBLEMA: função get_user_client_id() retorna NULL!';
    RAISE NOTICE '   Mas user_profile tem valor correto. Verificar função.';
  ELSIF v_doc_count = 0 AND v_doc_count_direct = 0 THEN
    RAISE NOTICE '❌ PROBLEMA: Não existem documentos para este cliente!';
    RAISE NOTICE '   Os documentos podem ter sido salvos com outro client_id';
  ELSIF v_doc_count = 0 AND v_doc_count_direct > 0 THEN
    RAISE NOTICE '❌ PROBLEMA: Documentos existem mas a política RLS está bloqueando!';
    RAISE NOTICE '   Verificar políticas RLS na tabela documents';
  ELSE
    RAISE NOTICE '✅ TUDO OK nos metadados e função!';
    RAISE NOTICE '   Se ainda não aparecer, o problema é no frontend';
  END IF;
  RAISE NOTICE '';
END $$;

