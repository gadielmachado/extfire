-- ====================================================
-- SCRIPT DE LIMPEZA TOTAL DE POLÍTICAS
-- ====================================================
-- Execute este script ANTES do database_setup_final.sql
-- Ele remove TODAS as políticas existentes para evitar conflitos
-- ====================================================

-- ====================================================
-- PARTE 1: REMOVER TODAS AS POLÍTICAS DA TABELA CLIENTS
-- ====================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo TODAS as políticas da tabela clients...';
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'clients'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON clients', r.policyname);
    RAISE NOTICE '  ✓ Removida política: %', r.policyname;
  END LOOP;
END $$;

-- ====================================================
-- PARTE 2: REMOVER TODAS AS POLÍTICAS DA TABELA DOCUMENTS
-- ====================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo TODAS as políticas da tabela documents...';
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON documents', r.policyname);
    RAISE NOTICE '  ✓ Removida política: %', r.policyname;
  END LOOP;
END $$;

-- ====================================================
-- PARTE 3: REMOVER TODAS AS POLÍTICAS DA TABELA USER_PROFILES
-- ====================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo TODAS as políticas da tabela user_profiles...';
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', r.policyname);
    RAISE NOTICE '  ✓ Removida política: %', r.policyname;
  END LOOP;
END $$;

-- ====================================================
-- PARTE 4: REMOVER TODAS AS POLÍTICAS DE STORAGE
-- ====================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo TODAS as políticas de storage...';
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    RAISE NOTICE '  ✓ Removida política de storage: %', r.policyname;
  END LOOP;
END $$;

-- ====================================================
-- PARTE 5: VERIFICAÇÃO
-- ====================================================

DO $$
DECLARE
  v_count_clients INT;
  v_count_documents INT;
  v_count_profiles INT;
  v_count_storage INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ LIMPEZA CONCLUÍDA';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Contar políticas restantes
  SELECT COUNT(*) INTO v_count_clients
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'clients';
  
  SELECT COUNT(*) INTO v_count_documents
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'documents';
  
  SELECT COUNT(*) INTO v_count_profiles
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'user_profiles';
  
  SELECT COUNT(*) INTO v_count_storage
  FROM pg_policies 
  WHERE schemaname = 'storage' AND tablename = 'objects';
  
  RAISE NOTICE '📊 POLÍTICAS RESTANTES:';
  RAISE NOTICE '  • clients: % política(s)', v_count_clients;
  RAISE NOTICE '  • documents: % política(s)', v_count_documents;
  RAISE NOTICE '  • user_profiles: % política(s)', v_count_profiles;
  RAISE NOTICE '  • storage.objects: % política(s)', v_count_storage;
  RAISE NOTICE '';
  
  IF v_count_clients = 0 AND v_count_documents = 0 AND v_count_profiles = 0 AND v_count_storage = 0 THEN
    RAISE NOTICE '✅ Perfeito! Todas as políticas foram removidas.';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 PRÓXIMO PASSO:';
    RAISE NOTICE '   Execute agora o script database_setup_final.sql';
  ELSE
    RAISE NOTICE '⚠️ Ainda existem políticas. Execute este script novamente.';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ====================================================
-- LISTA DETALHADA DE POLÍTICAS RESTANTES (SE HOUVER)
-- ====================================================

-- Políticas em clients
SELECT 
  '🔍 CLIENTS' as tabela,
  policyname as nome_da_politica,
  cmd as operacao
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'clients'
ORDER BY policyname;

-- Políticas em documents
SELECT 
  '🔍 DOCUMENTS' as tabela,
  policyname as nome_da_politica,
  cmd as operacao
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'documents'
ORDER BY policyname;

-- Políticas em user_profiles
SELECT 
  '🔍 USER_PROFILES' as tabela,
  policyname as nome_da_politica,
  cmd as operacao
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'user_profiles'
ORDER BY policyname;

-- Políticas em storage
SELECT 
  '🔍 STORAGE' as tabela,
  policyname as nome_da_politica,
  cmd as operacao
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

