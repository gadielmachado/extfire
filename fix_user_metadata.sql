-- ====================================================
-- CORREÇÃO DEFINITIVA: Sincronizar Metadados de Usuários
-- ====================================================
-- Este script resolve o problema onde o cliente não consegue ver
-- os documentos porque os metadados (raw_user_meta_data) não estão
-- sincronizados com a tabela user_profiles.
-- 
-- PROBLEMA:
-- - user_profiles.client_id está correto ✅
-- - auth.users.raw_user_meta_data.clientId está NULL ou incorreto ❌
-- - Frontend usa currentUser.clientId que vem dos metadados
-- 
-- SOLUÇÃO:
-- - Sincronizar metadados com user_profiles
-- - Melhorar função sync_user_profile para manter sincronização
-- ====================================================

-- ====================================================
-- PARTE 1: ATUALIZAR METADADOS DOS USUÁRIOS EXISTENTES
-- ====================================================

DO $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  -- Atualizar metadados de todos os usuários que têm client_id em user_profiles
  UPDATE auth.users u
  SET raw_user_meta_data = 
    CASE 
      WHEN u.raw_user_meta_data IS NULL THEN 
        jsonb_build_object(
          'clientId', up.client_id::text,
          'role', up.role,
          'name', up.name,
          'cnpj', COALESCE(up.cnpj, '')
        )
      ELSE 
        u.raw_user_meta_data || 
        jsonb_build_object(
          'clientId', up.client_id::text,
          'role', up.role,
          'name', up.name,
          'cnpj', COALESCE(up.cnpj, '')
        )
    END
  FROM user_profiles up
  WHERE u.id = up.id
    AND up.client_id IS NOT NULL
    AND (
      u.raw_user_meta_data IS NULL 
      OR u.raw_user_meta_data->>'clientId' IS NULL 
      OR (u.raw_user_meta_data->>'clientId')::uuid != up.client_id
    );
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Metadados atualizados para % usuário(s)', v_updated_count;
END $$;

-- ====================================================
-- PARTE 2: MELHORAR FUNÇÃO sync_user_profile
-- ====================================================

-- Substituir a função existente por uma versão que também sincroniza metadados
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
  -- 1. Atualizar ou criar user_profile
  INSERT INTO public.user_profiles (
    id, email, name, role, client_id, cnpj, created_at, updated_at
  )
  VALUES (
    user_id, user_email, COALESCE(user_name, user_email),
    user_role, user_client_id, user_cnpj, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, user_profiles.name),
    role = EXCLUDED.role,
    client_id = COALESCE(EXCLUDED.client_id, user_profiles.client_id),
    cnpj = COALESCE(EXCLUDED.cnpj, user_profiles.cnpj),
    updated_at = NOW();
  
  -- 2. NOVO: Também atualizar os metadados em auth.users
  -- Isso garante que o frontend sempre tenha os dados corretos
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN 
        jsonb_build_object(
          'clientId', COALESCE(user_client_id::text, ''),
          'role', user_role,
          'name', COALESCE(user_name, user_email),
          'cnpj', COALESCE(user_cnpj, '')
        )
      ELSE 
        raw_user_meta_data || 
        jsonb_build_object(
          'clientId', COALESCE(user_client_id::text, ''),
          'role', user_role,
          'name', COALESCE(user_name, user_email),
          'cnpj', COALESCE(user_cnpj, '')
        )
    END
  WHERE id = user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- PARTE 3: CRIAR TRIGGER PARA SINCRONIZAR AUTOMATICAMENTE
-- ====================================================

-- Quando user_profiles.client_id for atualizado, sincronizar os metadados
CREATE OR REPLACE FUNCTION public.sync_metadata_on_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o client_id mudou, atualizar os metadados
  IF NEW.client_id IS DISTINCT FROM OLD.client_id OR 
     NEW.role IS DISTINCT FROM OLD.role OR
     NEW.name IS DISTINCT FROM OLD.name OR
     NEW.cnpj IS DISTINCT FROM OLD.cnpj THEN
    
    UPDATE auth.users
    SET raw_user_meta_data = 
      CASE 
        WHEN raw_user_meta_data IS NULL THEN 
          jsonb_build_object(
            'clientId', COALESCE(NEW.client_id::text, ''),
            'role', NEW.role,
            'name', NEW.name,
            'cnpj', COALESCE(NEW.cnpj, '')
          )
        ELSE 
          raw_user_meta_data || 
          jsonb_build_object(
            'clientId', COALESCE(NEW.client_id::text, ''),
            'role', NEW.role,
            'name', NEW.name,
            'cnpj', COALESCE(NEW.cnpj, '')
          )
      END
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS sync_metadata_on_user_profile_update ON user_profiles;
CREATE TRIGGER sync_metadata_on_user_profile_update
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_metadata_on_profile_change();

-- ====================================================
-- PARTE 4: FORÇAR SINCRONIZAÇÃO PARA USUÁRIO ESPECÍFICO
-- ====================================================

-- Sincronizar especificamente o usuário gadielmachado01@gmail.com
DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID;
  v_name TEXT;
  v_cnpj TEXT;
BEGIN
  -- Buscar dados do user_profile
  SELECT up.id, up.client_id, up.name, up.cnpj
  INTO v_user_id, v_client_id, v_name, v_cnpj
  FROM user_profiles up
  WHERE up.email = 'gadielmachado01@gmail.com'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Atualizar metadados
    UPDATE auth.users
    SET raw_user_meta_data = 
      CASE 
        WHEN raw_user_meta_data IS NULL THEN 
          jsonb_build_object(
            'clientId', v_client_id::text,
            'role', 'client',
            'name', v_name,
            'cnpj', COALESCE(v_cnpj, '')
          )
        ELSE 
          raw_user_meta_data || 
          jsonb_build_object(
            'clientId', v_client_id::text,
            'role', 'client',
            'name', v_name,
            'cnpj', COALESCE(v_cnpj, '')
          )
      END
    WHERE id = v_user_id;
    
    RAISE NOTICE '✅ Metadados sincronizados para gadielmachado01@gmail.com';
    RAISE NOTICE '   User ID: %', v_user_id;
    RAISE NOTICE '   Client ID: %', v_client_id;
  ELSE
    RAISE NOTICE '⚠️ Usuário gadielmachado01@gmail.com não encontrado em user_profiles';
  END IF;
END $$;

-- ====================================================
-- PARTE 5: VERIFICAÇÃO
-- ====================================================

-- Verificar sincronização de todos os clientes
SELECT 
  '=== VERIFICAÇÃO DE SINCRONIZAÇÃO ===' as title;

SELECT 
  up.email as email,
  up.name as nome,
  up.role as role,
  up.client_id as profile_client_id,
  (u.raw_user_meta_data->>'clientId')::uuid as metadata_client_id,
  CASE 
    WHEN up.client_id IS NULL AND (u.raw_user_meta_data->>'clientId') IS NULL THEN '✅ OK (ambos NULL)'
    WHEN up.client_id = (u.raw_user_meta_data->>'clientId')::uuid THEN '✅ SINCRONIZADO'
    WHEN (u.raw_user_meta_data->>'clientId') IS NULL THEN '❌ METADADOS NULL'
    ELSE '❌ DESSINCRONIZADO'
  END as status
FROM user_profiles up
JOIN auth.users u ON u.id = up.id
ORDER BY up.email;

-- Verificar especificamente gadielmachado01@gmail.com
SELECT 
  '=== DETALHES: gadielmachado01@gmail.com ===' as title;

SELECT 
  u.id as user_id,
  u.email,
  up.client_id as profile_client_id,
  (u.raw_user_meta_data->>'clientId')::uuid as metadata_client_id,
  u.raw_user_meta_data->>'role' as metadata_role,
  u.raw_user_meta_data->>'name' as metadata_name,
  u.raw_user_meta_data as all_metadata
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.email = 'gadielmachado01@gmail.com';

-- ====================================================
-- PARTE 6: INSTRUÇÕES FINAIS
-- ====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ CORREÇÃO DE METADADOS CONCLUÍDA                   ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 O QUE FOI FEITO:';
  RAISE NOTICE '  ✓ Metadados sincronizados para todos os usuários';
  RAISE NOTICE '  ✓ Função sync_user_profile melhorada';
  RAISE NOTICE '  ✓ Trigger criado para sincronização automática';
  RAISE NOTICE '  ✓ Usuário gadielmachado01@gmail.com sincronizado';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 PRÓXIMOS PASSOS:';
  RAISE NOTICE '  1. Verificar tabelas de verificação acima';
  RAISE NOTICE '  2. Fazer logout da aplicação';
  RAISE NOTICE '  3. Fazer login como gadielmachado01@gmail.com';
  RAISE NOTICE '  4. Verificar se os documentos aparecem';
  RAISE NOTICE '';
END $$;

