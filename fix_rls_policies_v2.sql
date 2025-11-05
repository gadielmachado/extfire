-- ====================================================
-- CORREÇÃO: Políticas RLS Unificadas
-- ====================================================
-- Este script cria funções para unificar a verificação de
-- permissões entre user_profiles e raw_user_meta_data,
-- resolvendo inconsistências nas políticas RLS

-- ====================================================
-- 1. FUNÇÃO PARA OBTER CLIENT_ID DE FORMA UNIFICADA
-- ====================================================
-- Esta função verifica tanto user_profiles quanto raw_user_meta_data
-- para obter o client_id do usuário atual

CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Primeiro, tentar obter de user_profiles (fonte primária)
  SELECT client_id INTO v_client_id
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  -- Se encontrou, retornar
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- Se não encontrou em user_profiles, tentar raw_user_meta_data (fallback)
  SELECT (raw_user_meta_data->>'clientId')::UUID INTO v_client_id
  FROM auth.users
  WHERE id = user_id
  LIMIT 1;
  
  RETURN v_client_id;
END;
$$;

-- ====================================================
-- 2. FUNÇÃO PARA VERIFICAR SE USUÁRIO É ADMIN
-- ====================================================
-- Esta função verifica tanto user_profiles quanto raw_user_meta_data
-- e também a lista de emails de admin

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
  v_email TEXT;
  v_role TEXT;
BEGIN
  -- Se user_id é NULL, retornar false
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Obter email do usuário
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = user_id;
  
  -- Verificar se o email está na lista de admins
  IF v_email IN (
    'gadielmachado.bm@gmail.com',
    'gadyel.bm@gmail.com',
    'extfire.extfire@gmail.com',
    'paoliellocristiano@gmail.com'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar role em user_profiles
  SELECT role INTO v_role
  FROM public.user_profiles
  WHERE id = user_id;
  
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar role em raw_user_meta_data (fallback)
  SELECT raw_user_meta_data->>'role' INTO v_role
  FROM auth.users
  WHERE id = user_id;
  
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ====================================================
-- 3. FUNÇÃO PARA VERIFICAR SE USUÁRIO TEM ACESSO A UM CLIENTE
-- ====================================================
-- Esta função verifica se o usuário é admin OU se é o próprio cliente

CREATE OR REPLACE FUNCTION public.has_client_access(
  user_id UUID,
  target_client_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Se é admin, tem acesso
  IF public.is_admin(user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Se o client_id do usuário corresponde ao alvo, tem acesso
  IF public.get_user_client_id(user_id) = target_client_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ====================================================
-- 4. REMOVER POLÍTICAS ANTIGAS
-- ====================================================

-- Políticas de clients
DROP POLICY IF EXISTS "Admins podem ver todos os clientes" ON clients;
DROP POLICY IF EXISTS "Clientes podem ver seus próprios dados" ON clients;
DROP POLICY IF EXISTS "Admins podem inserir clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem atualizar clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem deletar clientes" ON clients;

-- Políticas de documents
DROP POLICY IF EXISTS "Admins podem ver todos os documentos" ON documents;
DROP POLICY IF EXISTS "Clientes podem ver seus documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem inserir documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON documents;

-- Políticas de user_profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON user_profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem inserir perfis" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem deletar perfis" ON user_profiles;

-- ====================================================
-- 5. CRIAR NOVAS POLÍTICAS PARA CLIENTS
-- ====================================================

-- SELECT: Admins veem todos, clientes veem só o seu
CREATE POLICY "Admins e clientes podem ver dados autorizados"
  ON clients FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    public.get_user_client_id(auth.uid()) = id
  );

-- INSERT: Apenas admins podem inserir
CREATE POLICY "Apenas admins podem inserir clientes"
  ON clients FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: Apenas admins podem atualizar
CREATE POLICY "Apenas admins podem atualizar clientes"
  ON clients FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- DELETE: Apenas admins podem deletar
CREATE POLICY "Apenas admins podem deletar clientes"
  ON clients FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ====================================================
-- 6. CRIAR NOVAS POLÍTICAS PARA DOCUMENTS
-- ====================================================

-- SELECT: Admins veem todos, clientes veem apenas seus documentos
CREATE POLICY "Admins e clientes podem ver documentos autorizados"
  ON documents FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    public.get_user_client_id(auth.uid()) = client_id
  );

-- INSERT: Apenas admins podem inserir documentos
CREATE POLICY "Apenas admins podem inserir documentos"
  ON documents FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: Apenas admins podem atualizar documentos
CREATE POLICY "Apenas admins podem atualizar documentos"
  ON documents FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- DELETE: Apenas admins podem deletar documentos
CREATE POLICY "Apenas admins podem deletar documentos"
  ON documents FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ====================================================
-- 7. CRIAR NOVAS POLÍTICAS PARA USER_PROFILES
-- ====================================================

-- SELECT: Usuários veem seu próprio perfil, admins veem todos
CREATE POLICY "Usuários veem seu perfil, admins veem todos"
  ON user_profiles FOR SELECT
  USING (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  );

-- INSERT: Apenas admins podem inserir perfis
-- (Trigger handle_new_user cria automaticamente, mas precisa de permissão)
CREATE POLICY "Sistema e admins podem inserir perfis"
  ON user_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  );

-- UPDATE: Usuários podem atualizar seu próprio perfil, admins podem atualizar todos
CREATE POLICY "Usuários atualizam seu perfil, admins atualizam todos"
  ON user_profiles FOR UPDATE
  USING (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  );

-- DELETE: Apenas admins podem deletar perfis
CREATE POLICY "Apenas admins podem deletar perfis"
  ON user_profiles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ====================================================
-- 8. GARANTIR QUE RLS ESTÁ HABILITADO
-- ====================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- 9. VERIFICAÇÃO
-- ====================================================

-- Verificar funções criadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_client_id',
    'is_admin',
    'has_client_access'
  )
ORDER BY routine_name;

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operacao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'documents', 'user_profiles')
ORDER BY tablename, policyname;

-- Testar funções (substitua pelo ID de um usuário real para testar)
-- SELECT 
--   auth.uid() as current_user_id,
--   public.is_admin(auth.uid()) as is_admin,
--   public.get_user_client_id(auth.uid()) as client_id;

-- ====================================================
-- FIM DO SCRIPT
-- ====================================================
-- Execute este script no SQL Editor do Supabase após
-- ter executado o fix_user_profiles_sync.sql

