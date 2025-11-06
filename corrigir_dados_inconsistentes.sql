-- ====================================================
-- SCRIPT PARA DIAGNOSTICAR E CORRIGIR DADOS INCONSISTENTES
-- ====================================================

-- 1. Verificar user_profiles com client_id que não existe
SELECT 
  '🔍 USER_PROFILES COM CLIENT_ID INVÁLIDO' as tipo,
  up.id as user_id,
  up.email,
  up.name,
  up.client_id as client_id_invalido,
  up.role
FROM public.user_profiles up
LEFT JOIN public.clients c ON up.client_id = c.id
WHERE up.client_id IS NOT NULL 
  AND c.id IS NULL
  AND up.role = 'client';

-- 2. Verificar clientes sem user_profile correspondente
SELECT 
  '🔍 CLIENTES SEM USER_PROFILE' as tipo,
  c.id as client_id,
  c.email,
  c.name,
  c.cnpj
FROM public.clients c
LEFT JOIN auth.users au ON c.email = au.email
WHERE c.email IS NOT NULL 
  AND c.email != ''
  AND au.id IS NULL;

-- 3. Verificar user_profiles de clientes que deveriam ter client_id mas não têm
SELECT 
  '🔍 USER_PROFILES DE CLIENTES SEM CLIENT_ID' as tipo,
  up.id as user_id,
  up.email,
  up.name,
  up.role,
  c.id as client_id_correto,
  c.name as client_name
FROM public.user_profiles up
JOIN public.clients c ON up.email = c.email
WHERE up.role = 'client'
  AND up.client_id IS NULL;

-- 4. Verificar documentos órfãos (sem cliente correspondente)
SELECT 
  '🔍 DOCUMENTOS ÓRFÃOS' as tipo,
  d.id as document_id,
  d.name as document_name,
  d.client_id,
  d.upload_date
FROM public.documents d
LEFT JOIN public.clients c ON d.client_id = c.id
WHERE c.id IS NULL;

-- ====================================================
-- CORREÇÕES AUTOMÁTICAS
-- ====================================================

DO $$
DECLARE
  r RECORD;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  🔧 INICIANDO CORREÇÕES AUTOMÁTICAS                   ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  
  -- 1. Corrigir user_profiles de clientes com client_id inválido
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣ Corrigindo user_profiles com client_id inválido...';
  
  FOR r IN 
    SELECT 
      up.id as user_id,
      up.email,
      c.id as client_id_correto
    FROM public.user_profiles up
    LEFT JOIN public.clients c_invalid ON up.client_id = c_invalid.id
    JOIN public.clients c ON up.email = c.email
    WHERE up.client_id IS NOT NULL 
      AND c_invalid.id IS NULL
      AND up.role = 'client'
  LOOP
    UPDATE public.user_profiles
    SET client_id = r.client_id_correto,
        updated_at = NOW()
    WHERE id = r.user_id;
    
    RAISE NOTICE '   ✅ Corrigido user_profile % - email: % - novo client_id: %', 
      r.user_id, r.email, r.client_id_correto;
  END LOOP;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '   📊 Total corrigido: % user_profile(s)', v_count;
  
  -- 2. Adicionar client_id aos user_profiles que não têm mas deveriam ter
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣ Adicionando client_id aos user_profiles sem client_id...';
  
  FOR r IN 
    SELECT 
      up.id as user_id,
      up.email,
      c.id as client_id_correto
    FROM public.user_profiles up
    JOIN public.clients c ON up.email = c.email
    WHERE up.role = 'client'
      AND up.client_id IS NULL
  LOOP
    UPDATE public.user_profiles
    SET client_id = r.client_id_correto,
        updated_at = NOW()
    WHERE id = r.user_id;
    
    RAISE NOTICE '   ✅ Atualizado user_profile % - email: % - client_id: %', 
      r.user_id, r.email, r.client_id_correto;
  END LOOP;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '   📊 Total atualizado: % user_profile(s)', v_count;
  
  -- 3. Deletar documentos órfãos (opcional - comentado por segurança)
  /*
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣ Deletando documentos órfãos...';
  
  DELETE FROM public.documents d
  WHERE NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = d.client_id
  );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '   📊 Total deletado: % documento(s) órfão(s)', v_count;
  */
  
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ CORREÇÕES CONCLUÍDAS COM SUCESSO                  ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  
END $$;

-- Verificar resultados após correção
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICAÇÃO PÓS-CORREÇÃO:';
END $$;

SELECT 
  'USER_PROFILES' as tabela,
  COUNT(*) as total,
  SUM(CASE WHEN client_id IS NOT NULL THEN 1 ELSE 0 END) as com_client_id,
  SUM(CASE WHEN client_id IS NULL AND role = 'client' THEN 1 ELSE 0 END) as sem_client_id_cliente
FROM public.user_profiles;

SELECT 
  'CLIENTES' as tabela,
  COUNT(*) as total,
  SUM(CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) as com_email
FROM public.clients;

SELECT 
  'DOCUMENTOS' as tabela,
  COUNT(*) as total,
  COUNT(DISTINCT client_id) as clientes_com_docs
FROM public.documents;

