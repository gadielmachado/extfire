-- ====================================================
-- INVESTIGAR TRIGGERS E CONSTRAINTS
-- ====================================================

-- PARTE 1: Listar todos os triggers na tabela clients
SELECT 
  '🔥 TRIGGERS EM CLIENTS' as tipo,
  tgname as nome_trigger,
  tgenabled as habilitado,
  tgtype as tipo,
  proname as funcao_executada
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'clients'::regclass
  AND tgname NOT LIKE 'pg_%';  -- Excluir triggers internos

-- PARTE 2: Ver constraints da tabela clients
SELECT 
  '🔗 CONSTRAINTS EM CLIENTS' as tipo,
  conname as nome_constraint,
  contype as tipo,
  CASE contype
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    ELSE contype::text
  END as descricao,
  pg_get_constraintdef(oid) as definicao
FROM pg_constraint
WHERE conrelid = 'clients'::regclass;

-- PARTE 3: Verificar se existe alguma coluna UUID vazia
SELECT 
  '📊 COLUNAS DA TABELA CLIENTS' as tipo,
  column_name as coluna,
  data_type as tipo_dado,
  is_nullable as pode_ser_null
FROM information_schema.columns
WHERE table_name = 'clients'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- PARTE 4: Verificar os dados do cliente específico
SELECT 
  '🔍 DADOS DO CLIENTE' as tipo,
  *
FROM clients
WHERE id = 'd05a7985-2374-41f1-9373-5147c9c9f4e1';

-- PARTE 5: Tentar excluir e capturar o erro exato
DO $$
DECLARE
  v_error_detail text;
  v_error_hint text;
  v_error_context text;
BEGIN
  RAISE NOTICE '🧪 TENTANDO EXCLUIR DIRETAMENTE...';
  
  BEGIN
    -- Tentar excluir
    DELETE FROM clients WHERE id = 'd05a7985-2374-41f1-9373-5147c9c9f4e1';
    
    RAISE NOTICE '✅ EXCLUSÃO FUNCIONOU!';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Fazendo ROLLBACK para não excluir de verdade...';
    RAISE EXCEPTION 'Rollback proposital';
    
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      v_error_detail = PG_EXCEPTION_DETAIL,
      v_error_hint = PG_EXCEPTION_HINT,
      v_error_context = PG_EXCEPTION_CONTEXT;
    
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERRO AO EXCLUIR:';
    RAISE NOTICE '  SQLSTATE: %', SQLSTATE;
    RAISE NOTICE '  SQLERRM: %', SQLERRM;
    RAISE NOTICE '  DETAIL: %', v_error_detail;
    RAISE NOTICE '  HINT: %', v_error_hint;
    RAISE NOTICE '  CONTEXT: %', v_error_context;
    RAISE NOTICE '';
  END;
  
  -- Rollback de qualquer forma
  RAISE EXCEPTION 'Teste concluído - rollback';
END $$;

