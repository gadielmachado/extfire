-- =====================================================
-- CORREÇÃO: client_id errado para jumpsorteio@gmail.com
-- =====================================================
-- Este script corrige o problema de client_id duplicado
-- Execute DEPOIS do diagnóstico para ver o problema
-- =====================================================

-- PASSO 1: Identificar qual é o client_id CORRETO
-- (O correto é o que está na tabela clients)
DO $$
DECLARE
  v_correct_client_id UUID;
  v_user_id UUID;
  v_wrong_client_id UUID;
BEGIN
  -- Buscar o client_id correto da tabela clients
  SELECT id INTO v_correct_client_id
  FROM clients
  WHERE email = 'jumpsorteio@gmail.com';
  
  IF v_correct_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente jumpsorteio@gmail.com não encontrado na tabela clients';
  END IF;
  
  -- Buscar o user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'jumpsorteio@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário jumpsorteio@gmail.com não encontrado em auth.users';
  END IF;
  
  -- Buscar o client_id errado (se houver)
  SELECT client_id INTO v_wrong_client_id
  FROM user_profiles
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ Client ID correto: %', v_correct_client_id;
  RAISE NOTICE '⚠️ Client ID no user_profile: %', v_wrong_client_id;
  
  IF v_wrong_client_id IS NOT NULL AND v_wrong_client_id != v_correct_client_id THEN
    RAISE NOTICE '❌ PROBLEMA: client_id está ERRADO no user_profile!';
  END IF;
END $$;

-- PASSO 2: Corrigir o user_profile para usar o client_id correto
UPDATE user_profiles up
SET 
  client_id = c.id,
  name = COALESCE(up.name, c.name),
  cnpj = COALESCE(up.cnpj, c.cnpj),
  updated_at = NOW()
FROM clients c
INNER JOIN auth.users au ON au.email = c.email
WHERE up.id = au.id
  AND c.email = 'jumpsorteio@gmail.com'
  AND (up.client_id IS NULL OR up.client_id != c.id);

DO $$
BEGIN
  RAISE NOTICE '✅ User_profile corrigido para jumpsorteio@gmail.com';
END $$;

-- PASSO 3: Corrigir os metadados do auth.users
DO $$
DECLARE
  v_correct_client_id UUID;
  v_user_id UUID;
  v_meta jsonb;
BEGIN
  -- Buscar o client_id correto
  SELECT c.id, au.id 
  INTO v_correct_client_id, v_user_id
  FROM clients c
  INNER JOIN auth.users au ON au.email = c.email
  WHERE c.email = 'jumpsorteio@gmail.com';
  
  -- Obter metadados atuais
  SELECT raw_user_meta_data INTO v_meta
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Atualizar metadados
  v_meta = COALESCE(v_meta, '{}'::jsonb);
  v_meta = v_meta || jsonb_build_object('clientId', v_correct_client_id::text);
  
  -- Salvar metadados atualizados
  UPDATE auth.users
  SET raw_user_meta_data = v_meta
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ Metadados de auth.users corrigidos para jumpsorteio@gmail.com';
  RAISE NOTICE '✅ clientId nos metadados agora é: %', v_correct_client_id;
END $$;

-- PASSO 4: CORREÇÃO GERAL - Para TODOS os clientes com problema similar
UPDATE user_profiles up
SET 
  client_id = c.id,
  name = COALESCE(up.name, c.name),
  cnpj = COALESCE(up.cnpj, c.cnpj),
  updated_at = NOW()
FROM clients c
INNER JOIN auth.users au ON au.email = c.email
WHERE up.id = au.id
  AND c.email IS NOT NULL
  AND c.email != ''
  AND (up.client_id IS NULL OR up.client_id != c.id)
  AND up.role = 'client';

DO $$
BEGIN
  RAISE NOTICE '✅ TODOS os user_profiles corrigidos!';
END $$;

-- PASSO 5: Atualizar metadados para TODOS os clientes
DO $$
DECLARE
  r RECORD;
  v_meta jsonb;
BEGIN
  FOR r IN 
    SELECT 
      au.id as user_id,
      c.id as correct_client_id,
      c.email,
      c.name,
      c.cnpj
    FROM clients c
    INNER JOIN auth.users au ON au.email = c.email
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
    WHERE id = r.user_id;
    
    -- Atualizar metadados
    v_meta = COALESCE(v_meta, '{}'::jsonb);
    v_meta = v_meta || jsonb_build_object(
      'clientId', r.correct_client_id::text,
      'name', r.name,
      'cnpj', r.cnpj,
      'role', 'client'
    );
    
    -- Salvar metadados atualizados
    UPDATE auth.users
    SET raw_user_meta_data = v_meta
    WHERE id = r.user_id;
    
    RAISE NOTICE 'Atualizado: % → clientId: %', r.email, r.correct_client_id;
  END LOOP;
  
  RAISE NOTICE '✅ Metadados de TODOS os clientes atualizados!';
END $$;

-- PASSO 6: Remover clientes órfãos (que não têm email na tabela clients)
-- IMPORTANTE: Isso remove client_ids que não são válidos
DO $$
DECLARE
  v_deleted_count INT := 0;
BEGIN
  -- Contar quantos serão afetados
  SELECT COUNT(*) INTO v_deleted_count
  FROM clients c
  WHERE c.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN auth.users au ON au.id = up.id
      WHERE au.email = c.email
    );
  
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '⚠️ Encontrados % clientes sem user_profile correspondente', v_deleted_count;
    
    -- Não vamos deletar automaticamente, apenas avisar
    RAISE NOTICE 'ℹ️ Esses clientes provavelmente não são mais usados';
  ELSE
    RAISE NOTICE '✅ Nenhum cliente órfão encontrado';
  END IF;
END $$;

-- PASSO 7: Verificação final específica para jumpsorteio@gmail.com
SELECT 
  '=== RESULTADO FINAL ===' as status,
  c.id as client_id_correto,
  c.name as cliente_nome,
  up.client_id as user_profile_client_id,
  (au.raw_user_meta_data->>'clientId')::uuid as metadata_client_id,
  public.get_user_client_id(au.id) as funcao_retorna,
  (
    SELECT COUNT(*) 
    FROM documents d 
    WHERE d.client_id = c.id
  ) as documentos_visiveis,
  CASE 
    WHEN up.client_id = c.id 
     AND (au.raw_user_meta_data->>'clientId')::uuid = c.id
     AND public.get_user_client_id(au.id) = c.id
    THEN '✅ TUDO CORRETO!'
    ELSE '❌ AINDA HÁ PROBLEMAS'
  END as status_final
FROM clients c
INNER JOIN auth.users au ON au.email = c.email
INNER JOIN user_profiles up ON up.id = au.id
WHERE c.email = 'jumpsorteio@gmail.com';

-- PASSO 8: Mostrar TODOS os documentos que o cliente deveria ver
SELECT 
  '=== DOCUMENTOS DO CLIENTE ===' as titulo,
  d.id as document_id,
  d.name as document_name,
  d.client_id,
  d.upload_date,
  c.name as cliente_dono
FROM documents d
INNER JOIN clients c ON d.client_id = c.id
WHERE c.email = 'jumpsorteio@gmail.com'
ORDER BY d.upload_date DESC;

