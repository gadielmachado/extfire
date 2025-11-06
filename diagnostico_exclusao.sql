-- ====================================================
-- DIAGNÓSTICO: Por que não consigo excluir clientes?
-- ====================================================
-- Execute este script para descobrir o problema
-- ====================================================

-- PARTE 1: Verificar se o cliente existe
SELECT 
  '🔍 VERIFICANDO SE O CLIENTE EXISTE' as status,
  id,
  name,
  email,
  cnpj
FROM clients
WHERE id = 'd05a7985-2374-41f1-9373-5147c9c9f4e1';

-- PARTE 2: Verificar políticas DELETE na tabela clients
SELECT 
  '🔒 POLÍTICAS DELETE EM CLIENTS' as tipo,
  policyname as nome_politica,
  cmd as comando,
  qual::text as condicao_usando,
  with_check::text as condicao_check
FROM pg_policies
WHERE tablename = 'clients' 
  AND schemaname = 'public'
  AND cmd = 'DELETE';

-- PARTE 3: Verificar se você é admin
SELECT 
  '👤 VERIFICANDO SE É ADMIN' as status,
  public.is_admin(auth.uid()) as sou_admin,
  auth.uid() as meu_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as meu_email;

-- PARTE 4: Verificar documentos associados
SELECT 
  '📄 DOCUMENTOS DO CLIENTE' as tipo,
  id,
  name,
  client_id
FROM documents
WHERE client_id = 'd05a7985-2374-41f1-9373-5147c9c9f4e1';

-- PARTE 5: Verificar foreign keys e constraints
SELECT 
  '🔗 CONSTRAINTS E FOREIGN KEYS' as tipo,
  conname as nome_constraint,
  contype as tipo,
  CASE contype
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    ELSE contype::text
  END as descricao
FROM pg_constraint
WHERE conrelid = 'clients'::regclass;

-- PARTE 6: TESTE DE EXCLUSÃO DIRETO (sem políticas RLS)
DO $$
BEGIN
  RAISE NOTICE '🧪 TENTANDO EXCLUIR (TESTE)...';
  
  -- Tentar excluir com bypass de RLS (só funciona para superuser)
  -- Se der erro, vamos ver qual é
  BEGIN
    DELETE FROM clients WHERE id = 'd05a7985-2374-41f1-9373-5147c9c9f4e1';
    RAISE NOTICE '✅ EXCLUSÃO FUNCIONOU!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO AO EXCLUIR: % - %', SQLSTATE, SQLERRM;
  END;
  
  -- Rollback para não excluir de verdade
  RAISE EXCEPTION 'Rollback proposital - não queremos excluir de verdade ainda';
END $$;

