-- =====================================================
-- CORREÇÃO DEFINITIVA: Cliente não vê documentos
-- =====================================================
-- Este script corrige TODOS os problemas de user_profile
-- Execute este script no SQL Editor do Supabase DEPOIS
-- de executar o diagnóstico
-- =====================================================

-- PASSO 1: Corrigir user_profiles existentes que estão com client_id NULL
-- mas deveriam ter um client_id associado
UPDATE user_profiles up
SET 
  client_id = c.id,
  name = COALESCE(up.name, c.name),
  cnpj = COALESCE(up.cnpj, c.cnpj),
  updated_at = NOW()
FROM clients c
WHERE up.email = c.email
  AND up.role = 'client'
  AND up.client_id IS NULL
  AND c.email IS NOT NULL
  AND c.email != '';

-- PASSO 2: Criar user_profiles que não existem para clientes com email
INSERT INTO user_profiles (id, email, name, role, client_id, cnpj, created_at, updated_at)
SELECT 
  au.id,
  c.email,
  c.name,
  'client',
  c.id,
  c.cnpj,
  NOW(),
  NOW()
FROM clients c
INNER JOIN auth.users au ON au.email = c.email
WHERE c.email IS NOT NULL 
  AND c.email != ''
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = au.id
  )
  AND au.email NOT IN (
    'gadielmachado.bm@gmail.com',
    'gadyel.bm@gmail.com',
    'extfire.extfire@gmail.com',
    'paoliellocristiano@gmail.com'
  );

-- PASSO 3: Atualizar metadados em auth.users para incluir clientId
-- IMPORTANTE: Isso só funciona se você tiver acesso ao service_role_key
-- Se não funcionar, não se preocupe - a correção acima já resolve o problema
DO $$
DECLARE
  r RECORD;
  v_meta jsonb;
BEGIN
  FOR r IN 
    SELECT 
      au.id,
      c.id as client_id,
      c.name as client_name,
      c.cnpj
    FROM auth.users au
    INNER JOIN clients c ON c.email = au.email
    WHERE c.email IS NOT NULL 
      AND c.email != ''
      AND au.email NOT IN (
        'gadielmachado.bm@gmail.com',
        'gadyel.bm@gmail.com',
        'extfire.extfire@gmail.com',
        'paoliellocristiano@gmail.com'
      )
  LOOP
    -- Obter metadados atuais
    SELECT raw_user_meta_data INTO v_meta
    FROM auth.users
    WHERE id = r.id;
    
    -- Atualizar metadados
    v_meta = COALESCE(v_meta, '{}'::jsonb);
    v_meta = v_meta || jsonb_build_object(
      'clientId', r.client_id::text,
      'name', r.client_name,
      'cnpj', r.cnpj,
      'role', 'client'
    );
    
    -- Salvar metadados atualizados
    UPDATE auth.users
    SET raw_user_meta_data = v_meta
    WHERE id = r.id;
    
    RAISE NOTICE 'Atualizado user % (%) com clientId %', r.client_name, r.id, r.client_id;
  END LOOP;
END $$;

-- PASSO 4: Melhorar o trigger para garantir que SEMPRE crie user_profile
-- quando um cliente é criado com email
DROP TRIGGER IF EXISTS on_client_created_or_updated ON clients;
DROP FUNCTION IF EXISTS public.sync_client_user_profile();

CREATE OR REPLACE FUNCTION public.sync_client_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_profile_exists BOOLEAN;
BEGIN
  -- Só processar se o cliente tiver email
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    -- Buscar user_id correspondente ao email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      -- Verificar se user_profile existe
      SELECT EXISTS(
        SELECT 1 FROM public.user_profiles WHERE id = v_user_id
      ) INTO v_profile_exists;
      
      IF v_profile_exists THEN
        -- Se existir, buscar role
        SELECT role INTO v_role
        FROM public.user_profiles
        WHERE id = v_user_id;
        
        -- Só atualizar se NÃO for admin
        IF v_role IS NULL OR v_role != 'admin' THEN
          UPDATE public.user_profiles
          SET 
            client_id = NEW.id,
            name = COALESCE(NEW.name, name),
            cnpj = COALESCE(NEW.cnpj, cnpj),
            role = 'client',
            updated_at = NOW()
          WHERE id = v_user_id;
          
          RAISE NOTICE 'User_profile atualizado para % (%) com client_id %', NEW.name, NEW.email, NEW.id;
        END IF;
      ELSE
        -- Se não existir, criar novo user_profile
        INSERT INTO public.user_profiles (
          id, email, name, role, client_id, cnpj, created_at, updated_at
        ) VALUES (
          v_user_id, NEW.email, NEW.name, 'client', NEW.id, NEW.cnpj, NOW(), NOW()
        );
        
        RAISE NOTICE 'User_profile criado para % (%) com client_id %', NEW.name, NEW.email, NEW.id;
      END IF;
    ELSE
      RAISE NOTICE 'Usuário ainda não existe em auth.users para email %. Será criado quando o usuário fizer signup.', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_client_created_or_updated
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_user_profile();

-- PASSO 5: Criar trigger para quando um novo usuário é criado no auth.users
-- Este trigger garante que o user_profile seja criado automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_client_name TEXT;
  v_client_cnpj TEXT;
  v_role TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar se é admin
  v_is_admin := NEW.email IN (
    'gadielmachado.bm@gmail.com',
    'gadyel.bm@gmail.com',
    'extfire.extfire@gmail.com',
    'paoliellocristiano@gmail.com'
  );
  
  IF v_is_admin THEN
    v_role := 'admin';
    v_client_id := NULL;
  ELSE
    v_role := 'client';
    
    -- Buscar cliente correspondente ao email
    SELECT id, name, cnpj INTO v_client_id, v_client_name, v_client_cnpj
    FROM clients
    WHERE email = NEW.email
    LIMIT 1;
    
    -- Se não encontrar cliente, usar metadados do signup
    IF v_client_id IS NULL THEN
      v_client_id := (NEW.raw_user_meta_data->>'clientId')::UUID;
      v_client_name := NEW.raw_user_meta_data->>'name';
      v_client_cnpj := NEW.raw_user_meta_data->>'cnpj';
    END IF;
  END IF;
  
  -- Criar user_profile se não existir
  INSERT INTO public.user_profiles (
    id, 
    email, 
    name, 
    role, 
    client_id, 
    cnpj,
    created_at, 
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(v_client_name, NEW.raw_user_meta_data->>'name'),
    v_role,
    v_client_id,
    COALESCE(v_client_cnpj, NEW.raw_user_meta_data->>'cnpj'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    client_id = COALESCE(EXCLUDED.client_id, user_profiles.client_id),
    name = COALESCE(EXCLUDED.name, user_profiles.name),
    cnpj = COALESCE(EXCLUDED.cnpj, user_profiles.cnpj),
    role = EXCLUDED.role,
    updated_at = NOW();
  
  RAISE NOTICE 'User_profile criado/atualizado para % com role % e client_id %', NEW.email, v_role, v_client_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- PASSO 6: Verificação final - mostrar resultado
SELECT 
  '=== RESULTADO FINAL ===' as status,
  COUNT(*) as total_user_profiles_clientes,
  COUNT(client_id) as profiles_com_client_id,
  COUNT(*) - COUNT(client_id) as profiles_sem_client_id
FROM user_profiles
WHERE role = 'client';

SELECT 
  'Clientes com email mas sem user_profile' as problema,
  COUNT(*) as total
FROM clients c
WHERE c.email IS NOT NULL AND c.email != ''
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    INNER JOIN auth.users au ON au.id = up.id
    WHERE au.email = c.email
  );

