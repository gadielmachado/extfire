-- ====================================================
-- CORREÇÃO URGENTE - gadielbizerramachado@gmail.com
-- ====================================================

-- PARTE 1: GARANTIR QUE O USER_PROFILE TENHA O CLIENT_ID CORRETO
DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID;
  v_current_client_id UUID;
BEGIN
  RAISE NOTICE '🔧 Iniciando correção para gadielbizerramachado@gmail.com...';
  RAISE NOTICE '';
  
  -- Buscar user_id
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'gadielbizerramachado@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ ERRO: Usuário não encontrado!';
    RETURN;
  END IF;
  
  RAISE NOTICE 'User ID: %', v_user_id;
  
  -- Buscar client_id correto (do console você informou)
  v_client_id := 'ffe29e12-00c0-47eb-9df7-a76903280da5'::uuid;
  
  -- Verificar se existe um cliente com esse ID
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = v_client_id) THEN
    RAISE NOTICE '❌ ERRO: Cliente com ID % não encontrado!', v_client_id;
    RETURN;
  END IF;
  
  -- Verificar client_id atual no user_profile
  SELECT client_id INTO v_current_client_id
  FROM user_profiles
  WHERE id = v_user_id;
  
  RAISE NOTICE 'Client ID atual no user_profile: %', v_current_client_id;
  RAISE NOTICE 'Client ID correto (do console): %', v_client_id;
  RAISE NOTICE '';
  
  -- Inserir ou atualizar user_profile com client_id correto
  INSERT INTO user_profiles (id, email, name, role, client_id)
  SELECT 
    v_user_id,
    'gadielbizerramachado@gmail.com',
    COALESCE(c.name, 'Teste Cliente 2'),
    'client',
    v_client_id
  FROM clients c
  WHERE c.id = v_client_id
  ON CONFLICT (id) DO UPDATE SET
    client_id = v_client_id,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = 'client',
    updated_at = NOW();
  
  RAISE NOTICE '✅ User_profile atualizado!';
  RAISE NOTICE '';
  
  -- Testar a função
  IF public.get_user_client_id(v_user_id) = v_client_id THEN
    RAISE NOTICE '✅ Função get_user_client_id() retorna o valor correto!';
  ELSE
    RAISE NOTICE '❌ Função get_user_client_id() retorna: %', public.get_user_client_id(v_user_id);
    RAISE NOTICE '   Mas deveria retornar: %', v_client_id;
  END IF;
  RAISE NOTICE '';
  
  -- Verificar se existem documentos
  DECLARE
    v_doc_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_doc_count
    FROM documents
    WHERE client_id = v_client_id;
    
    RAISE NOTICE 'Documentos encontrados para este cliente: %', v_doc_count;
    
    IF v_doc_count = 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '⚠️  ATENÇÃO: Não há documentos para este cliente!';
      RAISE NOTICE '   Possíveis causas:';
      RAISE NOTICE '   1. Documentos foram salvos com outro client_id';
      RAISE NOTICE '   2. Documentos foram deletados';
      RAISE NOTICE '   3. Upload ainda não foi feito';
      RAISE NOTICE '';
      RAISE NOTICE '📋 AÇÃO: Verifique todos os documentos no banco:';
      RAISE NOTICE '   SELECT * FROM documents ORDER BY upload_date DESC;';
    ELSE
      RAISE NOTICE '✅ Existem documentos para este cliente!';
    END IF;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║              ✅ CORREÇÃO CONCLUÍDA!                    ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Faça LOGOUT no app';
  RAISE NOTICE '2. Limpe o cache (Ctrl + Shift + Delete)';
  RAISE NOTICE '3. Faça LOGIN novamente';
  RAISE NOTICE '4. Se NÃO houver documentos, faça upload de um novo';
  RAISE NOTICE '5. Atualize (F5) e verifique se permanece';
  RAISE NOTICE '';
END $$;

-- PARTE 2: VERIFICAR SE HÁ DOCUMENTOS "ÓRFÃOS" (salvos com client_id errado)
SELECT '═══ DOCUMENTOS ÓRFÃOS ═══' as info;
SELECT 
  d.id,
  d.name,
  d.client_id as doc_client_id,
  d.upload_date,
  'DOCUMENTO ÓRFÃO - Não pertence a nenhum cliente ativo' as problema
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM clients c WHERE c.id = d.client_id
)
ORDER BY d.upload_date DESC;

-- PARTE 3: MOSTRAR TODOS OS DOCUMENTOS E SEUS CLIENTES
SELECT '═══ TODOS OS DOCUMENTOS ═══' as info;
SELECT 
  d.id,
  d.name,
  d.client_id,
  c.name as cliente_nome,
  c.email as cliente_email,
  d.upload_date,
  CASE 
    WHEN d.client_id = 'ffe29e12-00c0-47eb-9df7-a76903280da5'::uuid 
    THEN '✅ Pertence ao cliente correto'
    ELSE '❌ Pertence a outro cliente'
  END as status
FROM documents d
LEFT JOIN clients c ON d.client_id = c.id
ORDER BY d.upload_date DESC
LIMIT 20;

