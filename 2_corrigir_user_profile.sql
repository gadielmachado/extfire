-- CORREÇÃO: Atualizar user_profile com client_id correto

-- Primeiro, vamos ver o que precisa ser corrigido
SELECT 
  'ANTES DA CORREÇÃO' as status,
  up.id as user_id,
  up.email,
  up.client_id as client_id_atual,
  c.id as client_id_correto
FROM public.user_profiles up
JOIN public.clients c ON up.email = c.email
WHERE up.email = 'gadielbizerramachado@gmail.com';

-- Agora vamos corrigir
UPDATE public.user_profiles up
SET 
  client_id = c.id,
  updated_at = NOW()
FROM public.clients c
WHERE up.email = c.email
  AND up.email = 'gadielbizerramachado@gmail.com';

-- Verificar após a correção
SELECT 
  'DEPOIS DA CORREÇÃO' as status,
  up.id as user_id,
  up.email,
  up.name,
  up.role,
  up.client_id,
  c.name as client_name
FROM public.user_profiles up
LEFT JOIN public.clients c ON up.client_id = c.id
WHERE up.email = 'gadielbizerramachado@gmail.com';

