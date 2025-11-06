-- =====================================================
-- LIBERAR TODAS AS POLÍTICAS - SEM RESTRIÇÕES
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES
-- =====================================================

-- Tabela clients
DROP POLICY IF EXISTS "Clientes visíveis para usuários autenticados" ON clients;
DROP POLICY IF EXISTS "Usuários podem inserir clientes" ON clients;
DROP POLICY IF EXISTS "Usuários podem atualizar clientes" ON clients;
DROP POLICY IF EXISTS "Usuários podem excluir clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem ver todos os clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem inserir clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem atualizar clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem excluir clientes" ON clients;
DROP POLICY IF EXISTS "allow_all_select" ON clients;
DROP POLICY IF EXISTS "allow_all_insert" ON clients;
DROP POLICY IF EXISTS "allow_all_update" ON clients;
DROP POLICY IF EXISTS "allow_all_delete" ON clients;

-- Tabela documents
DROP POLICY IF EXISTS "Usuários podem ver documentos de seus clientes" ON documents;
DROP POLICY IF EXISTS "Usuários podem inserir documentos para seus clientes" ON documents;
DROP POLICY IF EXISTS "Usuários podem atualizar documentos de seus clientes" ON documents;
DROP POLICY IF EXISTS "Usuários podem excluir documentos de seus clientes" ON documents;
DROP POLICY IF EXISTS "Admins podem ver todos os documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem inserir documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem excluir documentos" ON documents;
DROP POLICY IF EXISTS "allow_all_select" ON documents;
DROP POLICY IF EXISTS "allow_all_insert" ON documents;
DROP POLICY IF EXISTS "allow_all_update" ON documents;
DROP POLICY IF EXISTS "allow_all_delete" ON documents;

-- Tabela user_profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON user_profiles;
DROP POLICY IF EXISTS "allow_all_select" ON user_profiles;
DROP POLICY IF EXISTS "allow_all_insert" ON user_profiles;
DROP POLICY IF EXISTS "allow_all_update" ON user_profiles;
DROP POLICY IF EXISTS "allow_all_delete" ON user_profiles;

-- Storage buckets
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem ver arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem excluir arquivos" ON storage.objects;
DROP POLICY IF EXISTS "allow_all_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_all_insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_all_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_all_delete" ON storage.objects;

-- ✅ Todas as políticas antigas removidas

-- 2. CRIAR POLÍTICAS TOTALMENTE PERMISSIVAS
-- =====================================================

-- Tabela CLIENTS - Acesso Total
CREATE POLICY "allow_all_select" ON clients
    FOR SELECT
    USING (true);

CREATE POLICY "allow_all_insert" ON clients
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "allow_all_update" ON clients
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "allow_all_delete" ON clients
    FOR DELETE
    USING (true);

-- ✅ Políticas da tabela clients criadas

-- Tabela DOCUMENTS - Acesso Total
CREATE POLICY "allow_all_select" ON documents
    FOR SELECT
    USING (true);

CREATE POLICY "allow_all_insert" ON documents
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "allow_all_update" ON documents
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "allow_all_delete" ON documents
    FOR DELETE
    USING (true);

-- ✅ Políticas da tabela documents criadas

-- Tabela USER_PROFILES - Acesso Total
CREATE POLICY "allow_all_select" ON user_profiles
    FOR SELECT
    USING (true);

CREATE POLICY "allow_all_insert" ON user_profiles
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "allow_all_update" ON user_profiles
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "allow_all_delete" ON user_profiles
    FOR DELETE
    USING (true);

-- ✅ Políticas da tabela user_profiles criadas

-- STORAGE - Acesso Total
CREATE POLICY "allow_all_select" ON storage.objects
    FOR SELECT
    USING (true);

CREATE POLICY "allow_all_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "allow_all_update" ON storage.objects
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "allow_all_delete" ON storage.objects
    FOR DELETE
    USING (true);

-- ✅ Políticas do storage criadas

-- 3. GARANTIR QUE RLS ESTÁ ATIVADO
-- =====================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ✅ RLS ativado em todas as tabelas

-- 4. REMOVER FUNÇÃO RECURSIVA (se existir)
-- =====================================================

DROP FUNCTION IF EXISTS get_user_client_ids(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_client_ids(text) CASCADE;
DROP FUNCTION IF EXISTS get_user_client_ids() CASCADE;

-- ✅ Funções recursivas removidas

-- 5. VERIFICAÇÃO FINAL
-- =====================================================

SELECT '========================================' as "INFO";
SELECT 'VERIFICAÇÃO DAS POLÍTICAS CRIADAS' as "INFO";
SELECT '========================================' as "INFO";

-- Verificar policies na tabela clients
SELECT 
    '📋 CLIENTS' as tabela,
    policyname as politica,
    cmd as comando,
    CASE 
        WHEN qual IS NULL THEN '✅ SEM RESTRIÇÕES'
        ELSE '⚠️ COM RESTRIÇÕES: ' || qual::text
    END as restricao
FROM pg_policies 
WHERE tablename = 'clients'
ORDER BY policyname;

-- Verificar policies na tabela documents
SELECT 
    '📄 DOCUMENTS' as tabela,
    policyname as politica,
    cmd as comando,
    CASE 
        WHEN qual IS NULL THEN '✅ SEM RESTRIÇÕES'
        ELSE '⚠️ COM RESTRIÇÕES: ' || qual::text
    END as restricao
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY policyname;

-- Verificar policies na tabela user_profiles
SELECT 
    '👤 USER_PROFILES' as tabela,
    policyname as politica,
    cmd as comando,
    CASE 
        WHEN qual IS NULL THEN '✅ SEM RESTRIÇÕES'
        ELSE '⚠️ COM RESTRIÇÕES: ' || qual::text
    END as restricao
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Verificar policies no storage
SELECT 
    '💾 STORAGE' as tabela,
    policyname as politica,
    cmd as comando,
    CASE 
        WHEN qual IS NULL THEN '✅ SEM RESTRIÇÕES'
        ELSE '⚠️ COM RESTRIÇÕES: ' || qual::text
    END as restricao
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

SELECT '========================================' as "INFO";
SELECT '✅ TODAS AS POLÍTICAS FORAM LIBERADAS!' as "INFO";
SELECT '========================================' as "INFO";

