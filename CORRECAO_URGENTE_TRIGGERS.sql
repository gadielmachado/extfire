-- =====================================================
-- CORREÇÃO URGENTE: Remover triggers problemáticos
-- =====================================================
-- Execute este script IMEDIATAMENTE no SQL Editor
-- =====================================================

-- PASSO 1: REMOVER o trigger problemático on_auth_user_created
-- Este trigger está causando o erro "Database error saving new user"
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger problemático removido!';
END $$;

-- PASSO 2: Simplificar o trigger de sync_client_user_profile
-- Vamos fazer uma versão mais simples e segura
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
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;
  
  BEGIN
    -- Buscar user_id correspondente ao email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;
    
    -- Se não encontrar usuário, apenas retornar (será criado depois no signup)
    IF v_user_id IS NULL THEN
      RAISE NOTICE 'Usuário ainda não existe para email %. Será sincronizado no login.', NEW.email;
      RETURN NEW;
    END IF;
    
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
        
        RAISE NOTICE '✅ User_profile atualizado para % com client_id %', NEW.email, NEW.id;
      END IF;
    ELSE
      -- Se não existir, criar novo user_profile
      INSERT INTO public.user_profiles (
        id, email, name, role, client_id, cnpj, created_at, updated_at
      ) VALUES (
        v_user_id, NEW.email, NEW.name, 'client', NEW.id, NEW.cnpj, NOW(), NOW()
      );
      
      RAISE NOTICE '✅ User_profile criado para % com client_id %', NEW.email, NEW.id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Se houver qualquer erro, apenas registrar e continuar
      RAISE WARNING 'Erro ao sincronizar user_profile para %: %', NEW.email, SQLERRM;
      RETURN NEW;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_client_created_or_updated
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_user_profile();

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger simplificado criado!';
END $$;

-- PASSO 3: Corrigir user_profiles existentes que ainda estão com problema
UPDATE user_profiles up
SET 
  client_id = c.id,
  name = COALESCE(up.name, c.name),
  cnpj = COALESCE(up.cnpj, c.cnpj),
  updated_at = NOW()
FROM clients c
WHERE up.email = c.email
  AND up.role = 'client'
  AND (up.client_id IS NULL OR up.client_id != c.id)
  AND c.email IS NOT NULL
  AND c.email != '';

DO $$
BEGIN
  RAISE NOTICE '✅ User_profiles corrigidos!';
END $$;

-- PASSO 4: Criar user_profiles faltantes (se houver)
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
  )
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ User_profiles faltantes criados!';
END $$;

-- PASSO 5: Verificação final
SELECT 
  '=== RESULTADO ===' as status,
  COUNT(*) as total_clientes_com_email
FROM clients
WHERE email IS NOT NULL AND email != '';

SELECT 
  '=== USER_PROFILES ===' as status,
  COUNT(*) as total_profiles,
  COUNT(client_id) as profiles_com_client_id
FROM user_profiles
WHERE role = 'client';

SELECT 
  '=== PROBLEMAS RESTANTES ===' as status,
  COUNT(*) as clientes_sem_profile
FROM clients c
WHERE c.email IS NOT NULL AND c.email != ''
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    INNER JOIN auth.users au ON au.id = up.id
    WHERE au.email = c.email
  );

