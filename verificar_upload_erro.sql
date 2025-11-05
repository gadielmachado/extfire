-- ====================================================
-- VERIFICAÇÃO: Problemas com Upload de Documentos
-- ====================================================
-- Este script verifica se há problemas nas políticas RLS
-- ou na estrutura da tabela documents que podem estar
-- causando erro 400 no upload

-- ====================================================
-- 1. VERIFICAR ESTRUTURA DA TABELA DOCUMENTS
-- ====================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'documents'
ORDER BY ordinal_position;

-- ====================================================
-- 2. VERIFICAR POLÍTICAS RLS DA TABELA DOCUMENTS
-- ====================================================

SELECT 
  policyname,
  cmd as operacao,
  roles,
  qual as condicao_using,
  with_check as condicao_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'documents'
ORDER BY policyname;

-- ====================================================
-- 3. VERIFICAR SE RLS ESTÁ HABILITADO
-- ====================================================

SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'documents';

-- ====================================================
-- 4. VERIFICAR SE A FUNÇÃO is_admin() EXISTE
-- ====================================================

SELECT 
  routine_name,
  routine_type,
  data_type as retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin';

-- ====================================================
-- 5. TESTAR POLÍTICA DE INSERÇÃO (SIMULAÇÃO)
-- ====================================================
-- Verificar se um usuário autenticado pode inserir
-- (Execute este como admin para ver o resultado)

-- Descomente e ajuste para testar:
-- SELECT public.is_admin() as usuario_eh_admin;

-- ====================================================
-- SOLUÇÃO RÁPIDA: Se as políticas não existirem
-- ====================================================

-- Se não houver políticas ou se houver erro, execute:

-- 1. Garantir que a função is_admin existe
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = user_id 
    AND role = 'admin'
  );
END;
$$;

-- 2. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Admins podem ver todos os documentos" ON documents;
DROP POLICY IF EXISTS "Clientes podem ver seus documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem inserir documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON documents;

-- 3. Recriar políticas
CREATE POLICY "Admins podem ver todos os documentos"
  ON documents FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Clientes podem ver seus documentos"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.client_id = documents.client_id
    )
  );

CREATE POLICY "Admins podem inserir documentos"
  ON documents FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins podem atualizar documentos"
  ON documents FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins podem deletar documentos"
  ON documents FOR DELETE
  USING (public.is_admin());

-- ====================================================
-- FIM DO SCRIPT
-- ====================================================

