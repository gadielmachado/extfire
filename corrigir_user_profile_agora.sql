-- =====================================================
-- CORREÇÃO URGENTE: Atualizar user_profile com cliente correto
-- =====================================================

-- 1. VER O PROBLEMA
SELECT 
  'PROBLEMA IDENTIFICADO' as status,
  up.email,
  up.name as nome_user_profile,
  up.client_id as client_id_user_profile,
  c.id as client_id_correto,
  c.name as nome_cliente_correto
FROM public.user_profiles up
LEFT JOIN public.clients c ON up.email = c.email
WHERE up.email IN ('gadielmachado01@gmail.com', 'gadielbizerramachado@gmail.com');

-- 2. CORRIGIR user_profile para gadielmachado01@gmail.com
UPDATE public.user_profiles up
SET 
  client_id = c.id,
  name = c.name,
  cnpj = c.cnpj,
  updated_at = NOW()
FROM public.clients c
WHERE up.email = c.email
  AND up.email = 'gadielmachado01@gmail.com';

-- 3. VERIFICAR SE CORRIGIU
SELECT 
  'DEPOIS DA CORREÇÃO' as status,
  up.email,
  up.name as nome_user_profile,
  up.client_id,
  c.name as nome_cliente
FROM public.user_profiles up
LEFT JOIN public.clients c ON up.client_id = c.id
WHERE up.email = 'gadielmachado01@gmail.com';

-- 4. VERIFICAR DOCUMENTOS AGORA ASSOCIADOS
SELECT 
  'DOCUMENTOS DO CLIENTE' as status,
  d.name as documento,
  d.client_id,
  c.email as cliente_email
FROM public.documents d
JOIN public.clients c ON d.client_id = c.id
WHERE c.email = 'gadielmachado01@gmail.com';

