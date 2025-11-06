-- =====================================================
-- TESTE RÁPIDO - Execute DEPOIS da correção
-- =====================================================

-- 1. Verificar se há problemas restantes
SELECT 
  '🔍 VERIFICAÇÃO 1: Clientes sem user_profile' as teste,
  COUNT(*) as total,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK - Todos os clientes têm user_profile'
    ELSE '❌ PROBLEMA - Há clientes sem user_profile'
  END as resultado
FROM clients c
WHERE c.email IS NOT NULL AND c.email != ''
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    INNER JOIN auth.users au ON au.id = up.id
    WHERE au.email = c.email
  );

-- 2. Verificar user_profiles sem client_id
SELECT 
  '🔍 VERIFICAÇÃO 2: User_profiles sem client_id' as teste,
  COUNT(*) as total,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK - Todos os profiles têm client_id'
    ELSE '❌ PROBLEMA - Há profiles sem client_id'
  END as resultado
FROM user_profiles
WHERE role = 'client' AND client_id IS NULL;

-- 3. Verificar se get_user_client_id() funciona para todos
SELECT 
  '🔍 VERIFICAÇÃO 3: Função get_user_client_id()' as teste,
  COUNT(*) as total_clientes,
  COUNT(public.get_user_client_id(up.id)) as com_client_id,
  COUNT(*) - COUNT(public.get_user_client_id(up.id)) as sem_client_id,
  CASE 
    WHEN COUNT(*) = COUNT(public.get_user_client_id(up.id)) THEN '✅ OK - Função retorna client_id para todos'
    ELSE '❌ PROBLEMA - Função não retorna client_id para alguns clientes'
  END as resultado
FROM user_profiles up
WHERE up.role = 'client';

-- 4. Mostrar relação completa Cliente → User_profile → Documentos
SELECT 
  '📊 VISÃO GERAL' as tipo,
  c.name as cliente_nome,
  c.email as cliente_email,
  up.id as user_profile_id,
  up.client_id as user_profile_client_id,
  public.get_user_client_id(up.id) as client_id_via_funcao,
  (
    SELECT COUNT(*) 
    FROM documents d 
    WHERE d.client_id = c.id
  ) as total_documentos,
  CASE 
    WHEN up.client_id = c.id AND public.get_user_client_id(up.id) = c.id THEN '✅ TUDO OK'
    WHEN up.client_id IS NULL THEN '❌ user_profile sem client_id'
    WHEN public.get_user_client_id(up.id) IS NULL THEN '❌ função retorna NULL'
    ELSE '⚠️ VERIFICAR'
  END as status
FROM clients c
LEFT JOIN user_profiles up ON up.email = c.email
WHERE c.email IS NOT NULL AND c.email != ''
ORDER BY c.created_at DESC;

-- 5. Resultado Final Resumido
SELECT 
  '🎯 RESULTADO FINAL' as titulo,
  (
    SELECT COUNT(*) FROM clients WHERE email IS NOT NULL AND email != ''
  ) as total_clientes_com_email,
  (
    SELECT COUNT(*) FROM user_profiles WHERE role = 'client'
  ) as total_user_profiles,
  (
    SELECT COUNT(*) FROM user_profiles WHERE role = 'client' AND client_id IS NOT NULL
  ) as profiles_com_client_id,
  (
    SELECT COUNT(*) FROM documents
  ) as total_documentos,
  CASE 
    WHEN (SELECT COUNT(*) FROM user_profiles WHERE role = 'client' AND client_id IS NULL) = 0 
    THEN '✅ TUDO FUNCIONANDO!'
    ELSE '❌ AINDA HÁ PROBLEMAS'
  END as status_geral;

