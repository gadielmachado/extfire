-- =====================================================
-- CORREÇÃO DEFINITIVA: Metadados do auth.users
-- =====================================================
-- Este script garante que os metadados do auth.users
-- estejam SEMPRE sincronizados com a tabela clients
-- =====================================================

-- IMPORTANTE: Este script usa o Service Role do Supabase
-- Se você não tem acesso ao Service Role, os metadados
-- serão corrigidos no próximo login do usuário

-- PASSO 1: Verificar estado atual dos metadados
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== VERIFICANDO METADADOS ATUAIS ===';
  
  FOR r IN 
    SELECT 
      c.id as correct_client_id,
      c.email,
      c.name,
      au.id as user_id,
      (au.raw_user_meta_data->>'clientId')::uuid as metadata_client_id,
      CASE 
        WHEN (au.raw_user_meta_data->>'clientId')::uuid = c.id THEN '✅ OK'
        WHEN (au.raw_user_meta_data->>'clientId')::uuid IS NULL THEN '❌ NULL'
        ELSE '❌ ERRADO'
      END as status
    FROM clients c
    INNER JOIN auth.users au ON au.email = c.email
    WHERE c.email IS NOT NULL AND c.email != ''
  LOOP
    RAISE NOTICE 'Cliente: % | Status: % | Correto: % | Atual: %', 
      r.email, r.status, r.correct_client_id, r.metadata_client_id;
  END LOOP;
END $$;

-- PASSO 2: Atualizar metadados para TODOS os clientes
DO $$
DECLARE
  r RECORD;
  v_meta jsonb;
  v_updated_count INT := 0;
BEGIN
  RAISE NOTICE '=== INICIANDO CORREÇÃO DE METADADOS ===';
  
  FOR r IN 
    SELECT 
      au.id as user_id,
      c.id as correct_client_id,
      c.email,
      c.name,
      c.cnpj
    FROM clients c
    INNER JOIN auth.users au ON au.email = c.email
    WHERE c.email IS NOT NULL 
      AND c.email != ''
      AND au.email NOT IN (
        'gadielmachado.bm@gmail.com',
        'gadyel.bm@gmail.com',
        'extfire.extfire@gmail.com',
        'paoliellocristiano@gmail.com'
      )
  LOOP
    -- Obter metadados atuais
    SELECT raw_user_meta_data INTO v_meta
    FROM auth.users
    WHERE id = r.user_id;
    
    -- Criar objeto de metadados correto
    v_meta = COALESCE(v_meta, '{}'::jsonb);
    
    -- FORÇAR atualização dos metadados com valores corretos
    v_meta = v_meta || jsonb_build_object(
      'clientId', r.correct_client_id::text,
      'name', r.name,
      'cnpj', r.cnpj,
      'role', 'client'
    );
    
    -- Salvar metadados atualizados
    UPDATE auth.users
    SET raw_user_meta_data = v_meta,
        updated_at = NOW()
    WHERE id = r.user_id;
    
    v_updated_count := v_updated_count + 1;
    RAISE NOTICE '✅ [%] Atualizado: % → clientId: %', v_updated_count, r.email, r.correct_client_id;
  END LOOP;
  
  RAISE NOTICE '=== ✅ CORREÇÃO CONCLUÍDA: % clientes atualizados ===', v_updated_count;
END $$;

-- PASSO 3: Verificar resultado final
SELECT 
  '=== VERIFICAÇÃO FINAL ===' as titulo,
  c.email,
  c.id as client_id_correto,
  up.client_id as user_profile_client_id,
  (au.raw_user_meta_data->>'clientId')::uuid as metadata_client_id,
  CASE 
    WHEN c.id = up.client_id 
     AND c.id = (au.raw_user_meta_data->>'clientId')::uuid
    THEN '✅ TUDO OK'
    WHEN c.id = up.client_id 
     AND c.id != (au.raw_user_meta_data->>'clientId')::uuid
    THEN '⚠️ Metadados ainda errados'
    ELSE '❌ PROBLEMAS'
  END as status
FROM clients c
INNER JOIN auth.users au ON au.email = c.email
INNER JOIN user_profiles up ON up.id = au.id
WHERE c.email IS NOT NULL AND c.email != ''
ORDER BY c.created_at DESC;

-- PASSO 4: Mostrar especificamente jumpsorteio@gmail.com
SELECT 
  '=== JUMPSORTEIO ESPECÍFICO ===' as titulo,
  c.id as client_id_correto,
  c.name as cliente_name,
  up.client_id as profile_client_id,
  (au.raw_user_meta_data->>'clientId')::uuid as metadata_client_id,
  (
    SELECT COUNT(*) 
    FROM documents d 
    WHERE d.client_id = c.id
  ) as total_documentos,
  CASE 
    WHEN c.id = up.client_id 
     AND c.id = (au.raw_user_meta_data->>'clientId')::uuid
    THEN '✅ PERFEITO - Documentos devem aparecer sempre!'
    ELSE '❌ AINDA COM PROBLEMA'
  END as status_final
FROM clients c
INNER JOIN auth.users au ON au.email = c.email
INNER JOIN user_profiles up ON up.id = au.id
WHERE c.email = 'jumpsorteio@gmail.com';

