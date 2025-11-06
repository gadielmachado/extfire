-- ====================================================
-- CORREÇÃO: Permitir que CLIENTES façam upload de documentos
-- ====================================================
-- Este script corrige o problema onde os clientes não conseguem
-- ver os documentos que fazem upload porque:
-- 1. A política de INSERT em 'documents' só permite admins
-- 2. O client_id nem sempre está sincronizado corretamente
-- ====================================================

-- ====================================================
-- PARTE 1: ATUALIZAR POLÍTICA DE INSERT EM DOCUMENTS
-- ====================================================

-- Remover política antiga que só permite admins
DROP POLICY IF EXISTS "Apenas admins podem inserir documentos" ON documents;

-- Criar nova política que permite tanto admins quanto clientes inserirem documentos
CREATE POLICY "Admins e clientes podem inserir documentos"
  ON documents FOR INSERT
  WITH CHECK (
    -- Admin pode inserir documentos para qualquer cliente
    public.is_admin(auth.uid()) 
    OR
    -- Cliente pode inserir documentos apenas para si mesmo
    (
      NOT public.is_admin(auth.uid()) 
      AND 
      public.get_user_client_id(auth.uid()) = client_id
    )
  );

-- ====================================================
-- PARTE 2: ATUALIZAR POLÍTICA DE STORAGE PARA UPLOAD
-- ====================================================

-- Remover política antiga de upload
DROP POLICY IF EXISTS "Admins podem fazer upload de documentos" ON storage.objects;

-- Criar nova política que permite tanto admins quanto clientes fazerem upload
CREATE POLICY "Admins e clientes podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND 
  (
    -- Admin pode fazer upload em qualquer pasta
    public.is_admin(auth.uid())
    OR
    -- Cliente pode fazer upload apenas na sua própria pasta
    -- O caminho deve ser: clientId/arquivo.ext
    (
      NOT public.is_admin(auth.uid())
      AND
      (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
    )
  )
);

-- ====================================================
-- PARTE 3: MELHORAR A FUNÇÃO get_user_client_id
-- ====================================================

-- Recriar a função com melhor lógica de fallback
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
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 1. Buscar em user_profiles (fonte primária)
  SELECT client_id INTO v_client_id
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- 2. Fallback: buscar em raw_user_meta_data
  SELECT (raw_user_meta_data->>'clientId')::UUID INTO v_client_id
  FROM auth.users
  WHERE id = user_id
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- 3. Último fallback: buscar cliente pelo email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = user_id
  LIMIT 1;
  
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE email = v_email
    LIMIT 1;
    
    -- Se encontrou o cliente pelo email, sincronizar o user_profile
    IF v_client_id IS NOT NULL THEN
      UPDATE public.user_profiles
      SET client_id = v_client_id,
          updated_at = NOW()
      WHERE id = user_id;
    END IF;
  END IF;
  
  RETURN v_client_id;
END;
$$;

-- ====================================================
-- PARTE 4: SINCRONIZAR TODOS OS USER_PROFILES EXISTENTES
-- ====================================================

-- Função para sincronizar todos os clientes com user_profiles
CREATE OR REPLACE FUNCTION public.sync_all_client_profiles()
RETURNS VOID AS $$
DECLARE
  client_record RECORD;
  v_user_id UUID;
BEGIN
  -- Para cada cliente com email
  FOR client_record IN 
    SELECT id, email, name, cnpj 
    FROM public.clients 
    WHERE email IS NOT NULL AND email != ''
  LOOP
    -- Encontrar o usuário correspondente
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = client_record.email
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      -- Sincronizar ou criar user_profile
      PERFORM public.sync_user_profile(
        v_user_id,
        client_record.email,
        client_record.name,
        'client',
        client_record.id,
        client_record.cnpj
      );
      
      RAISE NOTICE 'Sincronizado: % (%) -> user_id: %', 
        client_record.name, client_record.email, v_user_id;
    ELSE
      RAISE NOTICE 'Usuário não encontrado para: % (%)', 
        client_record.name, client_record.email;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Executar a sincronização agora
SELECT public.sync_all_client_profiles();

-- ====================================================
-- PARTE 5: VERIFICAÇÃO
-- ====================================================

-- Mostrar todos os clientes e seus user_profiles
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.email as client_email,
  up.id as user_id,
  up.client_id as profile_client_id,
  CASE 
    WHEN up.client_id = c.id THEN '✅ OK'
    WHEN up.client_id IS NULL THEN '⚠️ NULL'
    ELSE '❌ DIFERENTE'
  END as status
FROM clients c
LEFT JOIN auth.users u ON u.email = c.email
LEFT JOIN user_profiles up ON up.id = u.id
WHERE c.email IS NOT NULL AND c.email != ''
ORDER BY c.name;

-- Verificar políticas de documents
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY cmd;

-- Verificar políticas de storage
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd;

