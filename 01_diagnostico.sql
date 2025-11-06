-- ====================================================
-- DIAGNÓSTICO - gadielbizerramachado@gmail.com
-- ====================================================
-- Execute este script PRIMEIRO para ver o problema
-- ====================================================

-- 1️⃣ VERIFICAR CLIENTE
SELECT 
  id, 
  name, 
  email, 
  cnpj,
  is_blocked
FROM clients 
WHERE email = 'gadielbizerramachado@gmail.com';

