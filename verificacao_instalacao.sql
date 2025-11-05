-- ====================================================
-- SCRIPT DE VERIFICAÇÃO DA INSTALAÇÃO
-- Execute este script após configurar o banco de dados
-- para confirmar que tudo está funcionando corretamente
-- ====================================================

-- ====================================================
-- 1. VERIFICAR TABELAS CRIADAS
-- ====================================================
SELECT 
  '✅ TABELAS' as verificacao,
  table_name as nome,
  table_type as tipo
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clients', 'documents', 'user_profiles')
ORDER BY table_name;

-- ====================================================
-- 2. VERIFICAR COLUNAS DA TABELA CLIENTS
-- ====================================================
SELECT 
  '📋 CLIENTS' as verificacao,
  column_name as coluna,
  data_type as tipo,
  is_nullable as nulo
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
ORDER BY ordinal_position;

-- ====================================================
-- 3. VERIFICAR COLUNAS DA TABELA DOCUMENTS
-- ====================================================
SELECT 
  '📄 DOCUMENTS' as verificacao,
  column_name as coluna,
  data_type as tipo,
  is_nullable as nulo
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'documents'
ORDER BY ordinal_position;

-- ====================================================
-- 4. VERIFICAR COLUNAS DA TABELA USER_PROFILES
-- ====================================================
SELECT 
  '👤 USER_PROFILES' as verificacao,
  column_name as coluna,
  data_type as tipo,
  is_nullable as nulo
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ====================================================
-- 5. VERIFICAR ÍNDICES CRIADOS
-- ====================================================
SELECT 
  '🔍 ÍNDICES' as verificacao,
  tablename as tabela,
  indexname as indice,
  indexdef as definicao
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'documents', 'user_profiles')
ORDER BY tablename, indexname;

-- ====================================================
-- 6. VERIFICAR POLÍTICAS RLS
-- ====================================================
SELECT 
  '🔒 RLS POLICIES' as verificacao,
  tablename as tabela,
  policyname as politica,
  permissive as permissivo,
  cmd as comando
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ====================================================
-- 7. VERIFICAR RLS HABILITADO
-- ====================================================
SELECT 
  '🛡️ RLS STATUS' as verificacao,
  tablename as tabela,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'documents', 'user_profiles')
ORDER BY tablename;

-- ====================================================
-- 8. VERIFICAR FOREIGN KEYS
-- ====================================================
SELECT 
  '🔗 FOREIGN KEYS' as verificacao,
  tc.table_name as tabela,
  kcu.column_name as coluna,
  ccu.table_name as tabela_referencia,
  ccu.column_name as coluna_referencia
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('documents', 'user_profiles')
ORDER BY tc.table_name;

-- ====================================================
-- 9. VERIFICAR TRIGGERS
-- ====================================================
SELECT 
  '⚡ TRIGGERS' as verificacao,
  trigger_name as trigger,
  event_object_table as tabela,
  action_timing as timing,
  event_manipulation as evento
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('clients', 'documents', 'user_profiles')
ORDER BY event_object_table, trigger_name;

-- ====================================================
-- 10. VERIFICAR FUNÇÕES CRIADAS
-- ====================================================
SELECT 
  '🔧 FUNÇÕES' as verificacao,
  routine_name as funcao,
  routine_type as tipo,
  data_type as retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_updated_at_column', 'handle_new_user')
ORDER BY routine_name;

-- ====================================================
-- 11. VERIFICAR BUCKET DE STORAGE
-- ====================================================
SELECT 
  '💾 STORAGE BUCKET' as verificacao,
  id,
  name as nome,
  public as publico,
  created_at as criado_em
FROM storage.buckets
WHERE name = 'documents';

-- ====================================================
-- 12. VERIFICAR POLÍTICAS DE STORAGE
-- ====================================================
SELECT 
  '🔐 STORAGE POLICIES' as verificacao,
  policyname as politica,
  permissive as permissivo,
  cmd as comando
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- ====================================================
-- 13. VERIFICAR USUÁRIOS CADASTRADOS
-- ====================================================
SELECT 
  '👥 USUÁRIOS' as verificacao,
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'client' THEN 1 END) as clients
FROM user_profiles;

-- ====================================================
-- 14. VERIFICAR CLIENTES CADASTRADOS
-- ====================================================
SELECT 
  '🏢 CLIENTES' as verificacao,
  COUNT(*) as total_clientes,
  COUNT(CASE WHEN is_blocked = true THEN 1 END) as bloqueados,
  COUNT(CASE WHEN is_blocked = false THEN 1 END) as ativos
FROM clients;

-- ====================================================
-- 15. VERIFICAR DOCUMENTOS CADASTRADOS
-- ====================================================
SELECT 
  '📚 DOCUMENTOS' as verificacao,
  COUNT(*) as total_documentos,
  COUNT(DISTINCT client_id) as clientes_com_docs
FROM documents;

-- ====================================================
-- 16. RESUMO FINAL
-- ====================================================
SELECT 
  '📊 RESUMO' as verificacao,
  'Tabelas' as item,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('clients', 'documents', 'user_profiles'))::text as quantidade
UNION ALL
SELECT 
  '📊 RESUMO',
  'Índices',
  (SELECT COUNT(*) FROM pg_indexes 
   WHERE schemaname = 'public' 
   AND tablename IN ('clients', 'documents', 'user_profiles'))::text
UNION ALL
SELECT 
  '📊 RESUMO',
  'Políticas RLS',
  (SELECT COUNT(*) FROM pg_policies 
   WHERE schemaname = 'public')::text
UNION ALL
SELECT 
  '📊 RESUMO',
  'Triggers',
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE trigger_schema = 'public' 
   AND event_object_table IN ('clients', 'documents', 'user_profiles'))::text
UNION ALL
SELECT 
  '📊 RESUMO',
  'Funções',
  (SELECT COUNT(*) FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('update_updated_at_column', 'handle_new_user'))::text
UNION ALL
SELECT 
  '📊 RESUMO',
  'Buckets Storage',
  (SELECT COUNT(*)::text FROM storage.buckets WHERE name = 'documents')
UNION ALL
SELECT 
  '📊 RESUMO',
  'Usuários',
  (SELECT COUNT(*)::text FROM user_profiles)
UNION ALL
SELECT 
  '📊 RESUMO',
  'Clientes',
  (SELECT COUNT(*)::text FROM clients)
UNION ALL
SELECT 
  '📊 RESUMO',
  'Documentos',
  (SELECT COUNT(*)::text FROM documents);

-- ====================================================
-- 17. VERIFICAÇÃO DE INTEGRIDADE
-- ====================================================
DO $$
DECLARE
  v_tables INTEGER;
  v_rls INTEGER;
  v_policies INTEGER;
  v_triggers INTEGER;
  v_functions INTEGER;
  v_bucket INTEGER;
BEGIN
  -- Contar elementos
  SELECT COUNT(*) INTO v_tables 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('clients', 'documents', 'user_profiles');
  
  SELECT COUNT(*) INTO v_rls 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'documents', 'user_profiles') 
  AND rowsecurity = true;
  
  SELECT COUNT(*) INTO v_policies 
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  SELECT COUNT(*) INTO v_triggers 
  FROM information_schema.triggers 
  WHERE trigger_schema = 'public' 
  AND event_object_table IN ('clients', 'documents', 'user_profiles');
  
  SELECT COUNT(*) INTO v_functions 
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('update_updated_at_column', 'handle_new_user');
  
  SELECT COUNT(*) INTO v_bucket 
  FROM storage.buckets 
  WHERE name = 'documents';
  
  -- Mostrar resultados
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ VERIFICAÇÃO DE INTEGRIDADE';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  
  IF v_tables = 3 THEN
    RAISE NOTICE '✅ Tabelas: % de 3 (OK)', v_tables;
  ELSE
    RAISE NOTICE '❌ Tabelas: % de 3 (ERRO)', v_tables;
  END IF;
  
  IF v_rls = 3 THEN
    RAISE NOTICE '✅ RLS Habilitado: % de 3 (OK)', v_rls;
  ELSE
    RAISE NOTICE '❌ RLS Habilitado: % de 3 (ERRO)', v_rls;
  END IF;
  
  IF v_policies >= 15 THEN
    RAISE NOTICE '✅ Políticas RLS: % (OK)', v_policies;
  ELSE
    RAISE NOTICE '⚠️ Políticas RLS: % (esperado >= 15)', v_policies;
  END IF;
  
  IF v_triggers = 3 THEN
    RAISE NOTICE '✅ Triggers: % de 3 (OK)', v_triggers;
  ELSE
    RAISE NOTICE '❌ Triggers: % de 3 (ERRO)', v_triggers;
  END IF;
  
  IF v_functions = 2 THEN
    RAISE NOTICE '✅ Funções: % de 2 (OK)', v_functions;
  ELSE
    RAISE NOTICE '❌ Funções: % de 2 (ERRO)', v_functions;
  END IF;
  
  IF v_bucket = 1 THEN
    RAISE NOTICE '✅ Bucket Storage: 1 (OK)';
  ELSE
    RAISE NOTICE '⚠️ Bucket Storage: % (criar bucket "documents")', v_bucket;
  END IF;
  
  RAISE NOTICE '';
  
  IF v_tables = 3 AND v_rls = 3 AND v_policies >= 15 AND v_triggers = 3 AND v_functions = 2 THEN
    RAISE NOTICE '🎉 INSTALAÇÃO COMPLETA E FUNCIONAL!';
  ELSE
    RAISE NOTICE '⚠️ INSTALAÇÃO INCOMPLETA - Verifique os itens acima';
  END IF;
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
END $$;

