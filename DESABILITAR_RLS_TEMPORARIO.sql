-- ====================================================
-- DESABILITAR RLS TEMPORARIAMENTE (PARA TESTE)
-- ====================================================
-- Este script desabilita completamente o RLS para testar
-- ====================================================

-- DESABILITAR RLS nas tabelas
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Verificação
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '⚠️ RLS DESABILITADO TEMPORARIAMENTE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabelas afetadas:';
  RAISE NOTICE '  • clients - RLS DESABILITADO';
  RAISE NOTICE '  • documents - RLS DESABILITADO';
  RAISE NOTICE '  • user_profiles - RLS DESABILITADO';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 TESTE AGORA:';
  RAISE NOTICE '   Tente excluir o cliente na aplicação';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   Isso é apenas para teste!';
  RAISE NOTICE '   Vamos reabilitar depois.';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

