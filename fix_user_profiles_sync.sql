-- ====================================================
-- CORREÇÃO: Sincronização Automática de user_profiles
-- ====================================================
-- Este script cria funções para garantir que user_profiles
-- esteja sempre sincronizado com auth.users e com os clientes

-- ====================================================
-- 1. FUNÇÃO PARA SINCRONIZAR USER_PROFILE
-- ====================================================
-- Esta função garante que um user_profile existe e está atualizado
-- Pode ser chamada manualmente ou por triggers

CREATE OR REPLACE FUNCTION public.sync_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'client',
  user_client_id UUID DEFAULT NULL,
  user_cnpj TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Inserir ou atualizar o perfil do usuário
  INSERT INTO public.user_profiles (
    id,
    email,
    name,
    role,
    client_id,
    cnpj,
    created_at,
    updated_at
  )
  VALUES (
    user_id,
    user_email,
    COALESCE(user_name, user_email),
    user_role,
    user_client_id,
    user_cnpj,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, user_profiles.name),
    role = EXCLUDED.role,
    client_id = COALESCE(EXCLUDED.client_id, user_profiles.client_id),
    cnpj = COALESCE(EXCLUDED.cnpj, user_profiles.cnpj),
    updated_at = NOW();
    
  -- Log da operação
  RAISE NOTICE 'User profile sincronizado: user_id=%, email=%, role=%', user_id, user_email, user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- 2. ATUALIZAR TRIGGER PARA NOVOS USUÁRIOS
-- ====================================================
-- Substituir a função handle_new_user para usar sync_user_profile

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
  v_client_id UUID;
  v_cnpj TEXT;
BEGIN
  -- Extrair metadados
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  v_client_id := (NEW.raw_user_meta_data->>'clientId')::UUID;
  v_cnpj := NEW.raw_user_meta_data->>'cnpj';
  
  -- Usar a função de sincronização
  PERFORM public.sync_user_profile(
    NEW.id,
    NEW.email,
    v_name,
    v_role,
    v_client_id,
    v_cnpj
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ====================================================
-- 3. TRIGGER PARA ATUALIZAR user_profiles QUANDO METADADOS MUDAM
-- ====================================================
-- Este trigger garante que mudanças em raw_user_meta_data sejam
-- refletidas em user_profiles

CREATE OR REPLACE FUNCTION public.handle_user_metadata_update()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
  v_client_id UUID;
  v_cnpj TEXT;
BEGIN
  -- Verificar se os metadados mudaram
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    -- Extrair novos metadados
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    v_client_id := (NEW.raw_user_meta_data->>'clientId')::UUID;
    v_cnpj := NEW.raw_user_meta_data->>'cnpj';
    
    -- Sincronizar perfil
    PERFORM public.sync_user_profile(
      NEW.id,
      NEW.email,
      v_name,
      v_role,
      v_client_id,
      v_cnpj
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_metadata_update();

-- ====================================================
-- 4. FUNÇÃO PARA SINCRONIZAR CLIENTE COM USER_PROFILE
-- ====================================================
-- Esta função sincroniza automaticamente quando um cliente
-- é criado ou tem seu email atualizado

CREATE OR REPLACE FUNCTION public.sync_client_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  -- Verificar se o cliente tem email
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    -- Buscar o usuário com esse email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;
    
    -- Se encontrou o usuário
    IF v_user_id IS NOT NULL THEN
      -- Determinar role (verificar se é admin)
      SELECT role INTO v_role
      FROM public.user_profiles
      WHERE id = v_user_id;
      
      -- Se não tem perfil ou não é admin, atualizar
      IF v_role IS NULL OR v_role != 'admin' THEN
        PERFORM public.sync_user_profile(
          v_user_id,
          NEW.email,
          NEW.name,
          'client',
          NEW.id,
          NEW.cnpj
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para a tabela clients
DROP TRIGGER IF EXISTS on_client_created_or_updated ON clients;
CREATE TRIGGER on_client_created_or_updated
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_user_profile();

-- ====================================================
-- 5. FUNÇÃO AUXILIAR PARA FORÇAR SINCRONIZAÇÃO MANUAL
-- ====================================================
-- Esta função pode ser chamada para sincronizar todos os usuários existentes

CREATE OR REPLACE FUNCTION public.sync_all_user_profiles()
RETURNS TABLE(user_id UUID, email TEXT, status TEXT) AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Iterar sobre todos os usuários em auth.users
  FOR v_user IN 
    SELECT 
      u.id,
      u.email,
      u.raw_user_meta_data
    FROM auth.users u
  LOOP
    BEGIN
      -- Sincronizar cada usuário
      PERFORM public.sync_user_profile(
        v_user.id,
        v_user.email,
        COALESCE(v_user.raw_user_meta_data->>'name', v_user.email),
        COALESCE(v_user.raw_user_meta_data->>'role', 'client'),
        (v_user.raw_user_meta_data->>'clientId')::UUID,
        v_user.raw_user_meta_data->>'cnpj'
      );
      
      -- Retornar sucesso
      user_id := v_user.id;
      email := v_user.email;
      status := 'SUCCESS';
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      -- Retornar erro
      user_id := v_user.id;
      email := v_user.email;
      status := 'ERROR: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- 6. SINCRONIZAR USUÁRIOS EXISTENTES
-- ====================================================
-- Executar a sincronização para todos os usuários existentes

SELECT * FROM public.sync_all_user_profiles();

-- ====================================================
-- 7. VERIFICAÇÃO
-- ====================================================
-- Verificar se as funções foram criadas

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'sync_user_profile',
    'handle_new_user',
    'handle_user_metadata_update',
    'sync_client_user_profile',
    'sync_all_user_profiles'
  )
ORDER BY routine_name;

-- Verificar user_profiles sincronizados
SELECT 
  up.id,
  up.email,
  up.role,
  up.client_id,
  c.name as client_name
FROM user_profiles up
LEFT JOIN clients c ON c.id = up.client_id
ORDER BY up.created_at DESC;

-- ====================================================
-- FIM DO SCRIPT
-- ====================================================
-- Execute este script no SQL Editor do Supabase
-- Ele garantirá que user_profiles esteja sempre sincronizado

