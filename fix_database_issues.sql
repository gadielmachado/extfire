-- ====================================================
-- SCRIPT DE CORREÇÃO - Problemas de Upload e Sincronização
-- Sistema ExtFire
-- Execute este script no SQL Editor do Supabase
-- ====================================================

-- ============================================
-- 1. ADICIONAR COLUNAS OPCIONAIS NA TABELA CLIENTS
-- ============================================

-- Adicionar coluna user_role se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'user_role'
  ) THEN
    ALTER TABLE clients ADD COLUMN user_role VARCHAR(20) DEFAULT 'client';
    RAISE NOTICE '✅ Coluna user_role adicionada à tabela clients';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna user_role já existe na tabela clients';
  END IF;
END $$;

-- Adicionar coluna user_email se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE clients ADD COLUMN user_email VARCHAR(255);
    RAISE NOTICE '✅ Coluna user_email adicionada à tabela clients';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna user_email já existe na tabela clients';
  END IF;
END $$;

-- ============================================
-- 2. VERIFICAR E CRIAR BUCKET DE DOCUMENTOS
-- ============================================

-- Verificar se o bucket 'documents' existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', false);
    RAISE NOTICE '✅ Bucket documents criado';
  ELSE
    RAISE NOTICE 'ℹ️  Bucket documents já existe';
  END IF;
END $$;

-- ============================================
-- 3. CONFIGURAR POLÍTICAS RLS DO STORAGE
-- ============================================

-- Remover políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "Admins podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem visualizar todos os documentos" ON storage.objects;
DROP POLICY IF EXISTS "Clientes podem visualizar seus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deleção para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON storage.objects;

-- Criar políticas permissivas para usuários autenticados
CREATE POLICY "Permitir upload para usuários autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Permitir leitura para usuários autenticados"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Permitir atualização para usuários autenticados"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Permitir deleção para usuários autenticados"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- ============================================
-- 4. MELHORAR POLÍTICAS RLS DA TABELA CLIENTS
-- ============================================

-- Remover políticas antigas muito restritivas
DROP POLICY IF EXISTS "Admins podem ver todos os clientes" ON clients;
DROP POLICY IF EXISTS "Clientes podem ver seus dados" ON clients;
DROP POLICY IF EXISTS "Admins podem inserir" ON clients;
DROP POLICY IF EXISTS "Admins podem atualizar" ON clients;
DROP POLICY IF EXISTS "Admins podem deletar" ON clients;

-- Criar políticas mais flexíveis
-- Permitir SELECT para admins
CREATE POLICY "Admins podem ver todos os clientes"
ON clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir SELECT para clientes verem seus próprios dados
CREATE POLICY "Clientes podem ver seus dados"
ON clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND client_id = clients.id
  )
);

-- Permitir INSERT para admins E para o sistema (service_role)
CREATE POLICY "Admins podem inserir"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir UPDATE para admins
CREATE POLICY "Admins podem atualizar"
ON clients
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir DELETE para admins
CREATE POLICY "Admins podem deletar"
ON clients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- 5. VERIFICAÇÃO FINAL
-- ============================================

-- Verificar estrutura da tabela clients
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- Verificar políticas RLS da tabela clients
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clients'
ORDER BY policyname;

-- Verificar políticas do storage
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Verificar bucket
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE name = 'documents';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CORREÇÕES APLICADAS COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 Resumo das alterações:';
  RAISE NOTICE '  1. Colunas user_role e user_email verificadas/adicionadas';
  RAISE NOTICE '  2. Bucket documents verificado/criado';
  RAISE NOTICE '  3. Políticas RLS do storage configuradas';
  RAISE NOTICE '  4. Políticas RLS da tabela clients melhoradas';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Próximos passos:';
  RAISE NOTICE '  1. Recarregue a aplicação';
  RAISE NOTICE '  2. Faça login novamente';
  RAISE NOTICE '  3. Tente fazer upload de um arquivo';
  RAISE NOTICE '========================================';
END $$;

