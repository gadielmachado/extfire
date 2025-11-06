-- ====================================================
-- REMOVER TODOS OS TRIGGERS (EXCETO INTERNOS)
-- ====================================================

-- REMOVER TRIGGERS DA TABELA CLIENTS
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo triggers de CLIENTS...';
  
  FOR r IN 
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'clients'::regclass
      AND tgname NOT LIKE 'pg_%'
      AND tgname NOT LIKE 'RI_%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON clients', r.tgname);
    RAISE NOTICE '  ✓ Removido: %', r.tgname;
  END LOOP;
END $$;

-- REMOVER TRIGGERS DA TABELA DOCUMENTS
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo triggers de DOCUMENTS...';
  
  FOR r IN 
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'documents'::regclass
      AND tgname NOT LIKE 'pg_%'
      AND tgname NOT LIKE 'RI_%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON documents', r.tgname);
    RAISE NOTICE '  ✓ Removido: %', r.tgname;
  END LOOP;
END $$;

-- REMOVER TRIGGERS DA TABELA USER_PROFILES
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo triggers de USER_PROFILES...';
  
  FOR r IN 
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'user_profiles'::regclass
      AND tgname NOT LIKE 'pg_%'
      AND tgname NOT LIKE 'RI_%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON user_profiles', r.tgname);
    RAISE NOTICE '  ✓ Removido: %', r.tgname;
  END LOOP;
END $$;

-- Verificação
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TODOS OS TRIGGERS REMOVIDOS';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 TESTE AGORA:';
  RAISE NOTICE '   Tente excluir o cliente na aplicação';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

