-- ====================================================
-- CORREÇÃO: Recursão Infinita nas Políticas RLS
-- ====================================================
-- Problema: Políticas RLS na tabela user_profiles estão causando
-- recursão infinita porque tentam consultar user_profiles para
-- verificar se o usuário é admin, mas precisam passar pela política
-- que tenta consultar user_profiles novamente.

-- ====================================================
-- 1. REMOVER POLÍTICAS PROBLEMÁTICAS
-- ====================================================

-- Remover políticas que causam recursão
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem inserir perfis" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem deletar perfis" ON user_profiles;

-- ====================================================
-- 2. CRIAR FUNÇÃO AUXILIAR PARA VERIFICAR ROLE
-- ====================================================
-- Esta função usa SECURITY DEFINER para acessar user_profiles
-- sem passar pelas políticas RLS, evitando recursão

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

-- ====================================================
-- 3. RECRIAR POLÍTICAS SEM RECURSÃO
-- ====================================================

-- Política: Usuários podem ver seu próprio perfil
DROP POLICY IF EXISTS "Usuários podem ver seu perfil" ON user_profiles;
CREATE POLICY "Usuários podem ver seu perfil"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Política: Admins podem ver todos os perfis (SEM RECURSÃO)
CREATE POLICY "Admins podem ver todos os perfis"
  ON user_profiles FOR SELECT
  USING (public.is_admin());

-- Política: Usuários podem atualizar seu próprio perfil
DROP POLICY IF EXISTS "Usuários podem atualizar seu perfil" ON user_profiles;
CREATE POLICY "Usuários podem atualizar seu perfil"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Política: Admins podem inserir perfis (SEM RECURSÃO)
CREATE POLICY "Admins podem inserir perfis"
  ON user_profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- Política: Admins podem atualizar qualquer perfil (SEM RECURSÃO)
CREATE POLICY "Admins podem atualizar perfis"
  ON user_profiles FOR UPDATE
  USING (public.is_admin());

-- Política: Admins podem deletar perfis (SEM RECURSÃO)
CREATE POLICY "Admins podem deletar perfis"
  ON user_profiles FOR DELETE
  USING (public.is_admin());

-- ====================================================
-- 4. CORRIGIR POLÍTICAS DA TABELA CLIENTS
-- ====================================================
-- As políticas de clients também precisam usar a função
-- is_admin() para evitar recursão

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins podem ver todos os clientes" ON clients;
DROP POLICY IF EXISTS "Clientes podem ver seus próprios dados" ON clients;
DROP POLICY IF EXISTS "Admins podem inserir clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem atualizar clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem deletar clientes" ON clients;

-- Recriar políticas usando a função is_admin()
CREATE POLICY "Admins podem ver todos os clientes"
  ON clients FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Clientes podem ver seus próprios dados"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.client_id = clients.id
    )
  );

CREATE POLICY "Admins podem inserir clientes"
  ON clients FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins podem atualizar clientes"
  ON clients FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins podem deletar clientes"
  ON clients FOR DELETE
  USING (public.is_admin());

-- ====================================================
-- 5. CORRIGIR POLÍTICAS DA TABELA DOCUMENTS
-- ====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins podem ver todos os documentos" ON documents;
DROP POLICY IF EXISTS "Clientes podem ver seus documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem inserir documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON documents;

-- Recriar políticas usando a função is_admin()
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
-- 6. VERIFICAÇÃO
-- ====================================================

-- Verificar se as políticas foram criadas corretamente
SELECT 
  tablename,
  policyname,
  cmd as operacao
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'documents', 'user_profiles')
ORDER BY tablename, policyname;

-- Verificar se a função foi criada
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin';

-- ====================================================
-- FIM DO SCRIPT
-- ====================================================
-- Execute este script no SQL Editor do Supabase
-- Isso deve resolver o erro de recursão infinita

