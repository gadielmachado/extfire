-- ====================================================
-- SCRIPTS SQL CONSOLIDADOS
-- ====================================================
-- Este arquivo consolida todos os scripts SQL relacionados
-- ao sistema de gerenciamento de documentos
-- ====================================================
-- 
-- ÍNDICE:
-- 1. DIAGNÓSTICO DE CLIENTES
-- 2. DIAGNÓSTICO DIAMOND SIMPLES
-- 3. CORREÇÃO DE POLÍTICAS DE VISUALIZAÇÃO
-- 4. CORREÇÃO DE POLÍTICAS DE VISUALIZAÇÃO V2
-- 5. CORREÇÃO URGENTE DO ACESSO DIAMOND
-- 6. LIBERAR POLÍTICAS PARA CLIENTES
-- 7. TESTAR ACESSO DIAMOND
-- 8. VERIFICAR ACESSO CLIENTE
--
-- ====================================================


-- ====================================================
-- 1. DIAGNÓSTICO DE CLIENTES
-- ====================================================
-- Este script verifica se os usuários estão corretamente
-- associados aos seus clientes para visualizar documentos
-- ====================================================

-- PARTE 1: VERIFICAR CLIENTES CADASTRADOS
SELECT 
  '=== CLIENTES CADASTRADOS ===' as info;

SELECT 
  id as client_id,
  name as nome_cliente,
  email as email_cliente,
  cnpj,
  is_blocked as bloqueado,
  created_at as criado_em
FROM clients
ORDER BY created_at DESC;

-- PARTE 2: VERIFICAR USUÁRIOS DE AUTENTICAÇÃO
SELECT 
  '=== USUÁRIOS DE AUTENTICAÇÃO ===' as info;

SELECT 
  id as user_id,
  email as email_usuario,
  raw_user_meta_data->>'name' as nome,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'clientId' as client_id_metadata,
  created_at as criado_em,
  last_sign_in_at as ultimo_login
FROM auth.users
ORDER BY created_at DESC;

-- PARTE 3: VERIFICAR USER_PROFILES
SELECT 
  '=== PERFIS DE USUÁRIO (USER_PROFILES) ===' as info;

SELECT 
  up.id as user_id,
  up.email as email_perfil,
  up.name as nome_perfil,
  up.role as role_perfil,
  up.client_id as client_id_perfil,
  up.cnpj as cnpj_perfil,
  up.created_at as criado_em
FROM user_profiles up
ORDER BY up.created_at DESC;

-- PARTE 4: CRUZAMENTO - CLIENTES X USUÁRIOS
SELECT 
  '=== ASSOCIAÇÃO CLIENTES ↔ USUÁRIOS ===' as info;

SELECT 
  c.id as client_id,
  c.name as nome_cliente,
  c.email as email_cliente,
  u.id as user_id,
  u.email as email_usuario,
  u.raw_user_meta_data->>'clientId' as clientId_metadata,
  up.client_id as clientId_profile,
  CASE 
    WHEN u.id IS NULL THEN '❌ Sem usuário de autenticação'
    WHEN up.client_id IS NULL AND (u.raw_user_meta_data->>'clientId') IS NULL THEN '⚠️ Usuário existe mas sem client_id'
    WHEN up.client_id = c.id OR (u.raw_user_meta_data->>'clientId')::uuid = c.id THEN '✅ Associação correta'
    ELSE '❌ Associação incorreta'
  END as status_associacao
FROM clients c
LEFT JOIN auth.users u ON u.email = c.email
LEFT JOIN user_profiles up ON up.id = u.id
WHERE c.email IS NOT NULL AND c.email != ''
ORDER BY c.created_at DESC;

-- PARTE 5: VERIFICAR DOCUMENTOS POR CLIENTE
SELECT 
  '=== DOCUMENTOS POR CLIENTE ===' as info;

SELECT 
  c.id as client_id,
  c.name as nome_cliente,
  COUNT(d.id) as total_documentos,
  array_agg(d.name) FILTER (WHERE d.name IS NOT NULL) as nomes_documentos
FROM clients c
LEFT JOIN documents d ON d.client_id = c.id
GROUP BY c.id, c.name
ORDER BY total_documentos DESC;

-- PARTE 6: TESTAR FUNÇÃO get_user_client_id
SELECT 
  '=== TESTE DA FUNÇÃO get_user_client_id() ===' as info;

SELECT 
  u.id as user_id,
  u.email as email_usuario,
  public.get_user_client_id(u.id) as client_id_retornado,
  up.client_id as client_id_esperado,
  CASE 
    WHEN public.get_user_client_id(u.id) = up.client_id THEN '✅ Função OK'
    WHEN public.get_user_client_id(u.id) IS NULL AND up.client_id IS NULL THEN '⚠️ Ambos NULL'
    ELSE '❌ Função retornando valor errado'
  END as status_funcao
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.raw_user_meta_data->>'role' != 'admin' 
  OR u.raw_user_meta_data->>'role' IS NULL
ORDER BY u.created_at DESC;

-- PARTE 7: VERIFICAR POLÍTICAS ATUAIS
SELECT 
  '=== POLÍTICAS RLS - DOCUMENTS ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as comando,
  qual as condicao_using,
  with_check as condicao_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd, policyname;

SELECT 
  '=== POLÍTICAS RLS - STORAGE.OBJECTS ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as comando
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;

-- PARTE 8: RESUMO E RECOMENDAÇÕES
DO $$
DECLARE
  total_clientes INT;
  clientes_com_email INT;
  clientes_sem_usuario INT;
  clientes_sem_associacao INT;
BEGIN
  -- Contar clientes
  SELECT COUNT(*) INTO total_clientes FROM clients;
  SELECT COUNT(*) INTO clientes_com_email FROM clients WHERE email IS NOT NULL AND email != '';
  
  -- Contar problemas
  SELECT COUNT(*) INTO clientes_sem_usuario
  FROM clients c
  LEFT JOIN auth.users u ON u.email = c.email
  WHERE c.email IS NOT NULL AND c.email != '' AND u.id IS NULL;
  
  SELECT COUNT(*) INTO clientes_sem_associacao
  FROM clients c
  LEFT JOIN auth.users u ON u.email = c.email
  LEFT JOIN user_profiles up ON up.id = u.id
  WHERE c.email IS NOT NULL AND c.email != ''
    AND u.id IS NOT NULL
    AND up.client_id IS NULL 
    AND (u.raw_user_meta_data->>'clientId') IS NULL;
  
  -- Exibir resumo
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           DIAGNÓSTICO DE ASSOCIAÇÕES                  ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ESTATÍSTICAS:';
  RAISE NOTICE '  • Total de clientes: %', total_clientes;
  RAISE NOTICE '  • Clientes com email: %', clientes_com_email;
  RAISE NOTICE '  • Clientes sem usuário de autenticação: %', clientes_sem_usuario;
  RAISE NOTICE '  • Clientes sem client_id associado: %', clientes_sem_associacao;
  RAISE NOTICE '';
  
  IF clientes_sem_usuario > 0 THEN
    RAISE NOTICE '⚠️  PROBLEMA: % cliente(s) com email mas sem usuário de autenticação', clientes_sem_usuario;
    RAISE NOTICE '   Solução: Execute o script de correção para criar os usuários';
    RAISE NOTICE '';
  END IF;
  
  IF clientes_sem_associacao > 0 THEN
    RAISE NOTICE '⚠️  PROBLEMA: % usuário(s) sem client_id nos metadados', clientes_sem_associacao;
    RAISE NOTICE '   Solução: Execute o script de correção para sincronizar os metadados';
    RAISE NOTICE '';
  END IF;
  
  IF clientes_sem_usuario = 0 AND clientes_sem_associacao = 0 THEN
    RAISE NOTICE '✅ ÓTIMO: Todas as associações estão corretas!';
    RAISE NOTICE '   Se ainda houver problemas, verifique as políticas RLS';
    RAISE NOTICE '';
  END IF;
END $$;


-- ====================================================
-- 2. DIAGNÓSTICO DIAMOND SIMPLES
-- ====================================================
-- Este script mostra EXATAMENTE onde está o problema
-- ====================================================

-- 1️⃣ CLIENTE DIAMOND EXISTE?
SELECT '1️⃣ CLIENTE DIAMOND' as passo;
SELECT id, name, email FROM clients WHERE LOWER(email) = 'gadielmachado01@gmail.com';

-- 2️⃣ USUÁRIO EXISTE?
SELECT '2️⃣ USUÁRIO AUTH' as passo;
SELECT id, email FROM auth.users WHERE LOWER(email) = 'gadielmachado01@gmail.com';

-- 3️⃣ USER_PROFILE TEM CLIENT_ID?
SELECT '3️⃣ USER_PROFILE' as passo;
SELECT id, email, client_id FROM user_profiles WHERE LOWER(email) = 'gadielmachado01@gmail.com';

-- 4️⃣ FUNÇÃO get_user_client_id FUNCIONA?
SELECT '4️⃣ TESTE DA FUNÇÃO' as passo;
SELECT 
  u.id as user_id,
  public.get_user_client_id(u.id) as retorna,
  c.id as deveria_retornar,
  CASE 
    WHEN public.get_user_client_id(u.id) = c.id THEN '✅ OK'
    WHEN public.get_user_client_id(u.id) IS NULL THEN '❌ RETORNA NULL - PROBLEMA AQUI!'
    ELSE '❌ RETORNA ERRADO'
  END as status
FROM auth.users u
CROSS JOIN clients c
WHERE LOWER(u.email) = 'gadielmachado01@gmail.com'
  AND LOWER(c.email) = 'gadielmachado01@gmail.com';

-- 5️⃣ DOCUMENTOS EXISTEM NO BANCO?
SELECT '5️⃣ DOCUMENTOS NO BANCO' as passo;
SELECT 
  d.id,
  d.name,
  d.client_id as doc_client_id,
  c.id as diamond_client_id,
  CASE 
    WHEN d.client_id = c.id THEN '✅ Client ID correto'
    ELSE '❌ Client ID ERRADO!'
  END as status
FROM documents d
CROSS JOIN clients c
WHERE LOWER(c.email) = 'gadielmachado01@gmail.com';

-- 6️⃣ QUERY SIMULADA (O QUE O APP FAZ)
SELECT '6️⃣ SIMULAÇÃO DO APP' as passo;
SELECT 
  d.id,
  d.name,
  'Via RLS' as origem
FROM documents d
WHERE d.client_id = public.get_user_client_id(
  (SELECT id FROM auth.users WHERE LOWER(email) = 'gadielmachado01@gmail.com')
);


-- ====================================================
-- 3. CORREÇÃO DE POLÍTICAS DE VISUALIZAÇÃO
-- ====================================================
-- Este script corrige as políticas RLS para garantir que
-- clientes possam visualizar seus documentos
-- ====================================================

-- PARTE 1: MELHORAR FUNÇÃO get_user_client_id
CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_client_id UUID;
  v_email TEXT;
BEGIN
  -- Retornar NULL se não houver user_id
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- MÉTODO 1: Buscar em user_profiles (mais confiável)
  SELECT client_id INTO v_client_id
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- MÉTODO 2: Buscar em raw_user_meta_data
  SELECT (raw_user_meta_data->>'clientId')::UUID INTO v_client_id
  FROM auth.users
  WHERE id = user_id
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- MÉTODO 3: Buscar por email (fallback)
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = user_id;
  
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE LOWER(email) = LOWER(v_email)
    LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
      RETURN v_client_id;
    END IF;
  END IF;
  
  -- Se nada foi encontrado, retornar NULL
  RETURN NULL;
END;
$$;

-- PARTE 2: ATUALIZAR POLÍTICAS RLS - DOCUMENTS
DROP POLICY IF EXISTS "Admins e clientes podem ver documentos autorizados" ON documents;
DROP POLICY IF EXISTS "Apenas admins podem inserir documentos" ON documents;
DROP POLICY IF EXISTS "Apenas admins podem atualizar documentos" ON documents;
DROP POLICY IF EXISTS "Apenas admins podem deletar documentos" ON documents;
DROP POLICY IF EXISTS "Usuários autenticados podem ver documentos" ON documents;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir documentos" ON documents;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar documentos" ON documents;
DROP POLICY IF EXISTS "Visualizar documentos com permissão" ON documents;
DROP POLICY IF EXISTS "Inserir documentos com permissão" ON documents;
DROP POLICY IF EXISTS "Atualizar documentos (admin apenas)" ON documents;
DROP POLICY IF EXISTS "Deletar documentos (admin apenas)" ON documents;

-- SELECT: Admins veem tudo, clientes veem apenas seus documentos
CREATE POLICY "Visualizar documentos com permissão"
  ON documents FOR SELECT
  USING (
    public.is_admin(auth.uid()) 
    OR
    client_id = public.get_user_client_id(auth.uid())
  );

-- INSERT: Admin pode inserir, clientes também podem
CREATE POLICY "Inserir documentos com permissão"
  ON documents FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR
    client_id = public.get_user_client_id(auth.uid())
  );

-- UPDATE: Apenas admins
CREATE POLICY "Atualizar documentos (admin apenas)"
  ON documents FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- DELETE: Apenas admins
CREATE POLICY "Deletar documentos (admin apenas)"
  ON documents FOR DELETE
  USING (public.is_admin(auth.uid()));

-- PARTE 3: ATUALIZAR POLÍTICAS RLS - STORAGE
DROP POLICY IF EXISTS "Admins podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem visualizar todos os documentos" ON storage.objects;
DROP POLICY IF EXISTS "Clientes podem visualizar seus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem ver arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Apenas admins podem deletar do storage" ON storage.objects;
DROP POLICY IF EXISTS "Upload com permissão" ON storage.objects;
DROP POLICY IF EXISTS "Visualizar arquivos com permissão" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar arquivos (admin apenas)" ON storage.objects;
DROP POLICY IF EXISTS "Deletar arquivos (admin apenas)" ON storage.objects;

-- INSERT: Admin pode fazer upload, clientes podem fazer upload para suas pastas
CREATE POLICY "Upload com permissão"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' 
    AND (
      public.is_admin(auth.uid())
      OR
      (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
    )
  );

-- SELECT: Admins veem tudo, clientes veem apenas seus arquivos
CREATE POLICY "Visualizar arquivos com permissão"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' 
    AND (
      public.is_admin(auth.uid())
      OR
      (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
    )
  );

-- UPDATE: Apenas admins
CREATE POLICY "Atualizar arquivos (admin apenas)"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' 
    AND public.is_admin(auth.uid())
  );

-- DELETE: Apenas admins
CREATE POLICY "Deletar arquivos (admin apenas)"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' 
    AND public.is_admin(auth.uid())
  );

-- PARTE 4: SINCRONIZAR METADADOS EXISTENTES
DO $$
DECLARE
  v_client RECORD;
  v_user_id UUID;
BEGIN
  RAISE NOTICE '🔄 Sincronizando metadados de usuários existentes...';
  
  FOR v_client IN 
    SELECT id, email, name, cnpj 
    FROM clients 
    WHERE email IS NOT NULL AND email != ''
  LOOP
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_client.email;
    
    IF v_user_id IS NOT NULL THEN
      INSERT INTO user_profiles (id, email, name, role, client_id, cnpj)
      VALUES (
        v_user_id,
        v_client.email,
        v_client.name,
        'client',
        v_client.id,
        v_client.cnpj
      )
      ON CONFLICT (id) DO UPDATE SET
        client_id = v_client.id,
        cnpj = v_client.cnpj,
        updated_at = NOW();
      
      RAISE NOTICE '  ✅ Sincronizado: % (client_id: %)', v_client.email, v_client.id;
    ELSE
      RAISE NOTICE '  ⚠️  Usuário não encontrado para: %', v_client.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Sincronização concluída!';
END $$;


-- ====================================================
-- 4. CORREÇÃO DE POLÍTICAS DE VISUALIZAÇÃO V2
-- ====================================================
-- Este script corrige o erro "permission denied for table users"
-- e garante que as políticas funcionem corretamente
-- ====================================================

-- PARTE 1: GARANTIR QUE A FUNÇÃO get_user_client_id FUNCIONE
CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id UUID;
  v_email TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- MÉTODO 1: Buscar em user_profiles
  SELECT client_id INTO v_client_id
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- MÉTODO 2: Buscar em raw_user_meta_data
  BEGIN
    SELECT (raw_user_meta_data->>'clientId')::UUID INTO v_client_id
    FROM auth.users
    WHERE id = user_id
    LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
      RETURN v_client_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- MÉTODO 3: Buscar por email (fallback)
  BEGIN
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = user_id;
    
    IF v_email IS NOT NULL THEN
      SELECT id INTO v_client_id
      FROM public.clients
      WHERE LOWER(email) = LOWER(v_email)
      LIMIT 1;
      
      IF v_client_id IS NOT NULL THEN
        RETURN v_client_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_client_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_client_id(UUID) TO anon;

-- PARTE 2: REMOVER TODAS AS POLÍTICAS ANTIGAS
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'documents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON documents', r.policyname);
  END LOOP;
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (policyname LIKE '%documento%' 
           OR policyname LIKE '%arquivo%'
           OR policyname LIKE '%upload%'
           OR policyname LIKE '%visualizar%'
           OR policyname LIKE '%permissão%'
           OR policyname LIKE '%TEMPORÁRIO%'
           OR policyname LIKE '%PERMISSIVO%'
           OR policyname LIKE '%autenticado%'
           OR policyname LIKE '%admin%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- PARTE 3: CRIAR POLÍTICAS CORRETAS
-- Mesmas políticas da versão anterior (omitidas por brevidade)


-- ====================================================
-- 5. CORREÇÃO URGENTE DO ACESSO DIAMOND
-- ====================================================
-- Execute este script para corrigir o acesso imediatamente
-- ====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID;
BEGIN
  RAISE NOTICE '🔄 Sincronizando cliente DIAMOND...';
  
  SELECT id INTO v_client_id FROM clients WHERE LOWER(email) = 'gadielmachado01@gmail.com';
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = 'gadielmachado01@gmail.com';
  
  IF v_client_id IS NULL THEN
    RAISE NOTICE '❌ Cliente DIAMOND não encontrado!';
    RETURN;
  END IF;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Usuário gadielmachado01@gmail.com não encontrado!';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Client ID: %', v_client_id;
  RAISE NOTICE 'User ID: %', v_user_id;
  
  INSERT INTO user_profiles (id, email, name, role, client_id, cnpj)
  SELECT 
    v_user_id,
    c.email,
    c.name,
    'client',
    c.id,
    c.cnpj
  FROM clients c
  WHERE c.id = v_client_id
  ON CONFLICT (id) DO UPDATE SET
    client_id = EXCLUDED.client_id,
    cnpj = EXCLUDED.cnpj,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = 'client',
    updated_at = NOW();
  
  RAISE NOTICE '✅ User profile sincronizado!';
  
  IF public.get_user_client_id(v_user_id) = v_client_id THEN
    RAISE NOTICE '✅ Função get_user_client_id() retorna o ID correto!';
  ELSE
    RAISE NOTICE '❌ AINDA HÁ PROBLEMA! Função retorna: %', public.get_user_client_id(v_user_id);
  END IF;
END $$;


-- ====================================================
-- 6. LIBERAR POLÍTICAS PARA CLIENTES
-- ====================================================
-- Este script torna as políticas mais permissivas
-- ====================================================

-- NOTA: Este script é para TESTES apenas!
-- Remove políticas restritivas e permite que todos
-- os usuários autenticados vejam todos os documentos

DROP POLICY IF EXISTS "Admins e clientes podem ver documentos autorizados" ON documents;
DROP POLICY IF EXISTS "Apenas admins podem inserir documentos" ON documents;
DROP POLICY IF EXISTS "Admins e clientes podem inserir documentos" ON documents;
DROP POLICY IF EXISTS "Apenas admins podem atualizar documentos" ON documents;
DROP POLICY IF EXISTS "Apenas admins podem deletar documentos" ON documents;

CREATE POLICY "Usuários autenticados podem ver documentos"
  ON documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir documentos"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar documentos"
  ON documents FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem deletar documentos"
  ON documents FOR DELETE
  USING (public.is_admin(auth.uid()));


-- ====================================================
-- 7. TESTAR ACESSO DIAMOND
-- ====================================================
-- Este script testa especificamente o cliente DIAMOND
-- ====================================================

SELECT '=== DADOS DO CLIENTE DIAMOND ===' as info;

SELECT 
  id as client_id,
  name,
  email,
  cnpj,
  is_blocked
FROM clients
WHERE LOWER(email) = 'gadielmachado01@gmail.com';

SELECT '=== USUÁRIO DE AUTENTICAÇÃO ===' as info;

SELECT 
  id as user_id,
  email,
  raw_user_meta_data->>'name' as nome_metadata,
  raw_user_meta_data->>'role' as role_metadata,
  raw_user_meta_data->>'clientId' as clientId_metadata,
  created_at
FROM auth.users
WHERE LOWER(email) = 'gadielmachado01@gmail.com';

SELECT '=== USER_PROFILE DO DIAMOND ===' as info;

SELECT 
  up.id as user_id,
  up.email,
  up.name,
  up.role,
  up.client_id,
  up.cnpj
FROM user_profiles up
WHERE LOWER(up.email) = 'gadielmachado01@gmail.com';


-- ====================================================
-- 8. VERIFICAR ACESSO CLIENTE
-- ====================================================
-- Este script simula o acesso de um cliente aos documentos
-- ====================================================

SELECT '=== CLIENTES DISPONÍVEIS PARA TESTE ===' as info;

SELECT 
  c.id as client_id,
  c.name as nome_cliente,
  c.email as email_cliente,
  u.id as user_id,
  COUNT(d.id) as total_documentos,
  CASE 
    WHEN u.id IS NULL THEN '❌ SEM USUÁRIO'
    WHEN public.get_user_client_id(u.id) = c.id THEN '✅ ASSOCIAÇÃO OK'
    WHEN public.get_user_client_id(u.id) IS NULL THEN '⚠️ CLIENT_ID NULL'
    ELSE '❌ CLIENT_ID ERRADO'
  END as status
FROM clients c
LEFT JOIN auth.users u ON LOWER(u.email) = LOWER(c.email)
LEFT JOIN documents d ON d.client_id = c.id
WHERE c.email IS NOT NULL AND c.email != ''
GROUP BY c.id, c.name, c.email, u.id
ORDER BY c.name;

-- ====================================================
-- 9. DIAGNÓSTICO ESPECÍFICO - PROBLEMA DE PERSISTÊNCIA
-- ====================================================
-- Execute este script para diagnosticar o problema de 
-- documentos que aparecem mas somem ao atualizar
-- ====================================================

-- 1️⃣ VERIFICAR CLIENTE ESPECÍFICO
SELECT '1️⃣ DADOS DO CLIENTE' as passo;
SELECT id, name, email, cnpj FROM clients 
WHERE email = 'gadielmachado01@gmail.com'
  OR name LIKE '%Nova Política%'
  OR cnpj = '321941204012401';

-- 2️⃣ VERIFICAR USUÁRIO DE AUTENTICAÇÃO
SELECT '2️⃣ USUÁRIO AUTH' as passo;
SELECT 
  id, 
  email,
  raw_user_meta_data->>'clientId' as clientId_metadata,
  raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email = 'gadielmachado01@gmail.com';

-- 3️⃣ VERIFICAR USER_PROFILE (AQUI ESTÁ O PROBLEMA!)
SELECT '3️⃣ USER_PROFILE - ESTE É O PROBLEMA!' as passo;
SELECT 
  id, 
  email, 
  name,
  role,
  client_id,
  CASE 
    WHEN client_id IS NULL THEN '❌ CLIENT_ID ESTÁ NULL - PROBLEMA AQUI!'
    ELSE '✅ CLIENT_ID OK'
  END as status
FROM user_profiles 
WHERE email = 'gadielmachado01@gmail.com';

-- 4️⃣ TESTAR A FUNÇÃO get_user_client_id()
SELECT '4️⃣ TESTE DA FUNÇÃO' as passo;
SELECT 
  u.id as user_id,
  u.email,
  public.get_user_client_id(u.id) as retorna,
  c.id as deveria_retornar,
  CASE 
    WHEN public.get_user_client_id(u.id) = c.id THEN '✅ OK'
    WHEN public.get_user_client_id(u.id) IS NULL THEN '❌ RETORNA NULL - ESTE É O PROBLEMA!'
    ELSE '❌ RETORNA VALOR ERRADO'
  END as status
FROM auth.users u
CROSS JOIN clients c
WHERE u.email = 'gadielmachado01@gmail.com'
  AND (c.email = 'gadielmachado01@gmail.com' 
       OR c.name LIKE '%Nova Política%'
       OR c.cnpj = '321941204012401');

-- 5️⃣ DOCUMENTOS NO BANCO
SELECT '5️⃣ DOCUMENTOS NO BANCO' as passo;
SELECT 
  d.id,
  d.name,
  d.client_id,
  c.name as cliente_nome,
  c.email as cliente_email
FROM documents d
LEFT JOIN clients c ON d.client_id = c.id
WHERE d.client_id IN (
  SELECT id FROM clients 
  WHERE email = 'gadielmachado01@gmail.com'
    OR name LIKE '%Nova Política%'
    OR cnpj = '321941204012401'
);

-- 6️⃣ SIMULAÇÃO (O QUE ACONTECE NO APP)
SELECT '6️⃣ SIMULAÇÃO - O QUE O APP TENTA FAZER' as passo;
SELECT 
  d.id,
  d.name,
  'Via Política RLS' as origem,
  public.get_user_client_id(
    (SELECT id FROM auth.users WHERE email = 'gadielmachado01@gmail.com')
  ) as client_id_usado
FROM documents d
WHERE d.client_id = public.get_user_client_id(
  (SELECT id FROM auth.users WHERE email = 'gadielmachado01@gmail.com')
);


-- ====================================================
-- 10. CORREÇÃO DEFINITIVA - PROBLEMA DE PERSISTÊNCIA
-- ====================================================
-- Execute este script DEPOIS do diagnóstico para corrigir
-- o problema de documentos que somem ao atualizar
-- ====================================================

-- PARTE 1: MELHORAR A FUNÇÃO get_user_client_id
CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id UUID;
  v_email TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- MÉTODO 1: Buscar em user_profiles (mais confiável)
  SELECT client_id INTO v_client_id
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- MÉTODO 2: Buscar em raw_user_meta_data
  BEGIN
    SELECT (raw_user_meta_data->>'clientId')::UUID INTO v_client_id
    FROM auth.users
    WHERE id = user_id
    LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
      RETURN v_client_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- MÉTODO 3: Buscar por email (fallback crítico)
  BEGIN
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = user_id;
    
    IF v_email IS NOT NULL THEN
      SELECT id INTO v_client_id
      FROM public.clients
      WHERE LOWER(email) = LOWER(v_email)
      LIMIT 1;
      
      IF v_client_id IS NOT NULL THEN
        RETURN v_client_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_client_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_client_id(UUID) TO anon;

-- PARTE 2: SINCRONIZAR TODOS OS USER_PROFILES
DO $$
DECLARE
  v_client RECORD;
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando sincronização de todos os clientes...';
  
  FOR v_client IN 
    SELECT id, email, name, cnpj 
    FROM clients 
    WHERE email IS NOT NULL AND email != ''
  LOOP
    -- Buscar usuário pelo email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(v_client.email);
    
    IF v_user_id IS NOT NULL THEN
      -- Inserir ou atualizar user_profile com client_id correto
      INSERT INTO user_profiles (id, email, name, role, client_id, cnpj)
      VALUES (
        v_user_id,
        v_client.email,
        v_client.name,
        CASE 
          WHEN v_client.email IN ('gadielmachado.bm@gmail.com', 'gadyel.bm@gmail.com', 'extfire.extfire@gmail.com', 'paoliellocristiano@gmail.com') 
          THEN 'admin'
          ELSE 'client'
        END,
        v_client.id,
        v_client.cnpj
      )
      ON CONFLICT (id) DO UPDATE SET
        client_id = v_client.id,
        email = v_client.email,
        name = v_client.name,
        cnpj = v_client.cnpj,
        updated_at = NOW();
      
      v_count := v_count + 1;
      RAISE NOTICE '  ✅ [%] Sincronizado: % (client_id: %)', v_count, v_client.email, v_client.id;
    ELSE
      RAISE NOTICE '  ⚠️  Usuário não encontrado para: %', v_client.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sincronização concluída! Total: % clientes', v_count;
END $$;

-- PARTE 3: REMOVER POLÍTICAS ANTIGAS
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'documents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON documents', r.policyname);
  END LOOP;
END $$;

-- PARTE 4: CRIAR POLÍTICAS RLS CORRETAS
-- SELECT: Admins veem tudo, clientes veem apenas seus documentos
CREATE POLICY "Visualizar documentos com permissão"
  ON documents FOR SELECT
  USING (
    public.is_admin(auth.uid()) 
    OR
    client_id = public.get_user_client_id(auth.uid())
  );

-- INSERT: Admin pode inserir, clientes podem inserir para si mesmos
CREATE POLICY "Inserir documentos com permissão"
  ON documents FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR
    client_id = public.get_user_client_id(auth.uid())
  );

-- UPDATE: Apenas admins
CREATE POLICY "Atualizar documentos (admin apenas)"
  ON documents FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- DELETE: Apenas admins
CREATE POLICY "Deletar documentos (admin apenas)"
  ON documents FOR DELETE
  USING (public.is_admin(auth.uid()));

-- PARTE 5: POLÍTICAS DE STORAGE
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (policyname LIKE '%documento%' 
           OR policyname LIKE '%arquivo%'
           OR policyname LIKE '%upload%'
           OR policyname LIKE '%visualizar%'
           OR policyname LIKE '%permissão%'
           OR policyname LIKE '%admin%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- SELECT: Admins veem tudo, clientes veem seus arquivos
CREATE POLICY "Visualizar arquivos com permissão"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' 
    AND (
      public.is_admin(auth.uid())
      OR
      (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
    )
  );

-- INSERT: Admin pode fazer upload, clientes podem fazer upload na sua pasta
CREATE POLICY "Upload com permissão"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' 
    AND (
      public.is_admin(auth.uid())
      OR
      (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
    )
  );

-- UPDATE: Apenas admins
CREATE POLICY "Atualizar arquivos (admin apenas)"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' 
    AND public.is_admin(auth.uid())
  );

-- DELETE: Apenas admins
CREATE POLICY "Deletar arquivos (admin apenas)"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' 
    AND public.is_admin(auth.uid())
  );

-- PARTE 6: MENSAGEM FINAL
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║        ✅ CORREÇÃO APLICADA COM SUCESSO!              ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 O QUE FOI FEITO:';
  RAISE NOTICE '  ✓ Função get_user_client_id() melhorada com 3 métodos';
  RAISE NOTICE '  ✓ Todos os user_profiles sincronizados com client_id';
  RAISE NOTICE '  ✓ Políticas RLS de documents atualizadas';
  RAISE NOTICE '  ✓ Políticas RLS de storage atualizadas';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PRÓXIMO PASSO:';
  RAISE NOTICE '  1. Execute o script de VERIFICAÇÃO';
  RAISE NOTICE '  2. Faça logout e login novamente no app';
  RAISE NOTICE '  3. Tente fazer upload de um documento';
  RAISE NOTICE '  4. Atualize a página (F5)';
  RAISE NOTICE '  5. O documento deve permanecer visível!';
  RAISE NOTICE '';
END $$;


-- ====================================================
-- 11. VERIFICAÇÃO FINAL - APÓS CORREÇÃO
-- ====================================================
-- Execute este script para confirmar que tudo está funcionando
-- ====================================================

SELECT '=== VERIFICAÇÃO COMPLETA ===' as info;

-- 1. Verificar se a função retorna corretamente
SELECT 
  u.email,
  public.get_user_client_id(u.id) as client_id_retornado,
  up.client_id as client_id_esperado,
  CASE 
    WHEN public.get_user_client_id(u.id) = up.client_id THEN '✅ OK'
    WHEN public.get_user_client_id(u.id) IS NULL THEN '❌ AINDA NULL!'
    ELSE '❌ VALOR ERRADO'
  END as status
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.email = 'gadielmachado01@gmail.com';

-- 2. Verificar user_profiles
SELECT 
  email,
  name,
  role,
  client_id,
  CASE 
    WHEN client_id IS NOT NULL THEN '✅ CLIENT_ID PREENCHIDO'
    ELSE '❌ AINDA VAZIO'
  END as status
FROM user_profiles
WHERE email = 'gadielmachado01@gmail.com';

-- 3. Testar SELECT de documentos
SELECT 
  d.id,
  d.name,
  'Deve aparecer!' as resultado
FROM documents d
WHERE d.client_id = public.get_user_client_id(
  (SELECT id FROM auth.users WHERE email = 'gadielmachado01@gmail.com')
);

-- 4. Verificar políticas ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('documents', 'objects')
  AND schemaname IN ('public', 'storage')
ORDER BY tablename, cmd;


-- ====================================================
-- 12. DIAGNÓSTICO AVANÇADO - SE AINDA NÃO FUNCIONAR
-- ====================================================
-- Execute este script se após tudo o problema persistir
-- ====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID;
  v_email TEXT := 'gadielmachado01@gmail.com';
BEGIN
  -- Buscar IDs
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  SELECT id INTO v_client_id FROM clients WHERE email = v_email OR name LIKE '%Nova Política%' OR cnpj = '321941204012401';
  
  RAISE NOTICE '=== DIAGNÓSTICO DETALHADO ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Client ID esperado: %', v_client_id;
  RAISE NOTICE 'Client ID retornado pela função: %', public.get_user_client_id(v_user_id);
  RAISE NOTICE '';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ PROBLEMA: Usuário não existe no auth.users!';
    RAISE NOTICE '   Solução: Criar o usuário através do app';
    RETURN;
  END IF;
  
  IF v_client_id IS NULL THEN
    RAISE NOTICE '❌ PROBLEMA: Cliente não existe na tabela clients!';
    RAISE NOTICE '   Solução: Verificar o CNPJ ou nome do cliente';
    RETURN;
  END IF;
  
  IF public.get_user_client_id(v_user_id) IS NULL THEN
    RAISE NOTICE '❌ PROBLEMA CRÍTICO: Função retorna NULL!';
    RAISE NOTICE '   Verificando camadas...';
    RAISE NOTICE '';
    
    -- Verificar user_profiles
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user_id AND client_id = v_client_id) THEN
      RAISE NOTICE '   ✅ user_profiles tem client_id correto';
    ELSIF EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user_id) THEN
      RAISE NOTICE '   ⚠️  user_profiles existe mas client_id está NULL ou errado';
      UPDATE user_profiles SET client_id = v_client_id WHERE id = v_user_id;
      RAISE NOTICE '   ✅ CORRIGIDO! Execute o teste novamente';
    ELSE
      RAISE NOTICE '   ❌ user_profiles não existe!';
      INSERT INTO user_profiles (id, email, name, role, client_id)
      SELECT v_user_id, email, COALESCE(name, email), 'client', v_client_id
      FROM clients WHERE id = v_client_id;
      RAISE NOTICE '   ✅ CRIADO! Execute o teste novamente';
    END IF;
  ELSE
    RAISE NOTICE '✅ TUDO OK! A função retorna o client_id correto';
  END IF;
END $$;


-- ====================================================
-- FIM DOS SCRIPTS CONSOLIDADOS
-- ====================================================

