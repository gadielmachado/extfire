-- ====================================================
-- SCRIPT DE VERIFICAÇÃO DA CONFIGURAÇÃO DO SUPABASE
-- Execute este script para verificar se tudo está OK
-- ====================================================

-- ====================================================
-- 1. VERIFICAR TABELAS EXISTENTES
-- ====================================================
SELECT 
  'VERIFICAÇÃO DE TABELAS' as verificacao,
  table_name as tabela,
  CASE 
    WHEN table_name IN ('clients', 'documents', 'user_profiles') THEN '✅ OK'
    ELSE '⚠️ Inesperada'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clients', 'documents', 'user_profiles')
ORDER BY table_name;

-- Resultado esperado: 3 tabelas marcadas como ✅ OK

-- ====================================================
-- 2. VERIFICAR COLUNAS DAS TABELAS
-- ====================================================

-- Verificar tabela CLIENTS
SELECT 
  'CLIENTS' as tabela,
  column_name as coluna,
  data_type as tipo,
  is_nullable as permite_nulo
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
ORDER BY ordinal_position;

-- Colunas esperadas: id, cnpj, name, password, email, maintenance_date, is_blocked, created_at, updated_at

-- Verificar tabela DOCUMENTS
SELECT 
  'DOCUMENTS' as tabela,
  column_name as coluna,
  data_type as tipo,
  is_nullable as permite_nulo
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'documents'
ORDER BY ordinal_position;

-- Colunas esperadas: id, client_id, name, type, size, file_url, upload_date, created_at, updated_at

-- ====================================================
-- 3. VERIFICAR BUCKETS DE STORAGE
-- ====================================================
SELECT 
  'BUCKETS DE STORAGE' as verificacao,
  id as bucket_id,
  name as nome,
  public as publico,
  CASE 
    WHEN id = 'documents' THEN '✅ Configurado'
    ELSE '⚠️ Verificar'
  END as status
FROM storage.buckets
WHERE id = 'documents';

-- Resultado esperado: 1 bucket 'documents' (public pode ser true ou false)

-- ====================================================
-- 4. VERIFICAR POLÍTICAS RLS NAS TABELAS
-- ====================================================
SELECT 
  'POLÍTICAS RLS' as verificacao,
  tablename as tabela,
  policyname as politica,
  cmd as comando,
  CASE 
    WHEN tablename IN ('clients', 'documents', 'user_profiles') THEN '✅ Configurada'
    ELSE '⚠️ Verificar'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'documents', 'user_profiles')
ORDER BY tablename, policyname;

-- Resultado esperado: Várias políticas para cada tabela

-- ====================================================
-- 5. VERIFICAR POLÍTICAS DE STORAGE
-- ====================================================
SELECT 
  'POLÍTICAS DE STORAGE' as verificacao,
  policyname as politica,
  cmd as comando,
  CASE 
    WHEN cmd IN ('SELECT', 'INSERT', 'DELETE', 'UPDATE') THEN '✅ OK'
    ELSE '⚠️ Verificar'
  END as status
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- Resultado esperado: Políticas para admins (INSERT, SELECT, DELETE, UPDATE)

-- ====================================================
-- 6. CONTAR REGISTROS EXISTENTES
-- ====================================================

-- Contar clientes
SELECT 
  'CLIENTES' as tipo,
  COUNT(*) as total
FROM clients;

-- Contar documentos
SELECT 
  'DOCUMENTOS' as tipo,
  COUNT(*) as total
FROM documents;

-- Contar usuários
SELECT 
  'USUÁRIOS (auth)' as tipo,
  COUNT(*) as total
FROM auth.users;

-- ====================================================
-- 7. VERIFICAR ADMINISTRADORES
-- ====================================================
SELECT 
  'ADMINISTRADORES' as tipo,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'name' as nome,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' OR 
         email IN (
           'gadielmachado.bm@gmail.com',
           'gadyel.bm@gmail.com',
           'extfire.extfire@gmail.com',
           'paoliellocristiano@gmail.com'
         ) THEN '✅ É Admin'
    ELSE '❌ Não é Admin'
  END as status_admin
FROM auth.users
ORDER BY email;

-- ====================================================
-- 8. VERIFICAR INTEGRIDADE DOS DADOS
-- ====================================================

-- Verificar se há documentos sem cliente associado
SELECT 
  'DOCUMENTOS ÓRFÃOS' as verificacao,
  d.id as documento_id,
  d.name as documento_nome,
  d.client_id as client_id_referenciado,
  CASE 
    WHEN c.id IS NULL THEN '⚠️ Cliente não existe!'
    ELSE '✅ OK'
  END as status
FROM documents d
LEFT JOIN clients c ON d.client_id = c.id
WHERE c.id IS NULL;

-- Resultado esperado: Nenhum resultado (sem documentos órfãos)

-- ====================================================
-- 9. TESTAR PERMISSÕES DO USUÁRIO ATUAL
-- ====================================================

-- Ver quem é o usuário logado
SELECT 
  'USUÁRIO ATUAL' as info,
  auth.uid() as user_id,
  auth.email() as email,
  auth.role() as role;

-- Ver metadados do usuário logado
SELECT 
  'METADADOS DO USUÁRIO' as info,
  email,
  raw_user_meta_data as metadados
FROM auth.users
WHERE id = auth.uid();

-- ====================================================
-- 10. RESUMO DA VERIFICAÇÃO
-- ====================================================
SELECT 
  '=== RESUMO DA VERIFICAÇÃO ===' as titulo
UNION ALL
SELECT '1. Tabelas criadas: ' || 
  (SELECT COUNT(*)::text FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('clients', 'documents', 'user_profiles')) || '/3'
UNION ALL
SELECT '2. Bucket documents: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') 
    THEN '✅ Existe' 
    ELSE '❌ NÃO EXISTE' 
  END
UNION ALL
SELECT '3. Políticas RLS: ' || 
  (SELECT COUNT(*)::text FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('clients', 'documents', 'user_profiles'))
UNION ALL
SELECT '4. Políticas Storage: ' || 
  (SELECT COUNT(*)::text FROM pg_policies 
   WHERE schemaname = 'storage' 
   AND tablename = 'objects')
UNION ALL
SELECT '5. Total de Clientes: ' || (SELECT COUNT(*)::text FROM clients)
UNION ALL
SELECT '6. Total de Documentos: ' || (SELECT COUNT(*)::text FROM documents)
UNION ALL
SELECT '7. Total de Usuários: ' || (SELECT COUNT(*)::text FROM auth.users)
UNION ALL
SELECT '8. Administradores: ' || 
  (SELECT COUNT(*)::text FROM auth.users 
   WHERE raw_user_meta_data->>'role' = 'admin' 
   OR email IN (
     'gadielmachado.bm@gmail.com',
     'gadyel.bm@gmail.com', 
     'extfire.extfire@gmail.com',
     'paoliellocristiano@gmail.com'
   ));

-- ====================================================
-- RESULTADO ESPERADO
-- ====================================================
-- 1. Tabelas criadas: 3/3
-- 2. Bucket documents: ✅ Existe
-- 3. Políticas RLS: 12+ (várias políticas)
-- 4. Políticas Storage: 4+ (admins + clientes)
-- 5. Total de Clientes: X (número de clientes)
-- 6. Total de Documentos: Y (número de documentos)
-- 7. Total de Usuários: Z (número de usuários)
-- 8. Administradores: 1+ (pelo menos 1 admin)

-- ====================================================
-- SE ALGO ESTIVER ERRADO
-- ====================================================
-- 1. Tabelas faltando? Execute: database_setup_complete.sql
-- 2. Bucket faltando? Crie manualmente: Storage > Create bucket > 'documents'
-- 3. Políticas faltando? Execute: storage_policies_completo.sql
-- 4. Sem admins? Atualize um usuário para admin:
--    UPDATE auth.users 
--    SET raw_user_meta_data = jsonb_set(
--      raw_user_meta_data, '{role}', '"admin"'
--    ) 
--    WHERE email = 'seu-email@exemplo.com';

-- ====================================================
-- FIM DA VERIFICAÇÃO
-- ====================================================

