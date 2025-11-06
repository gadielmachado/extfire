-- =====================================================
-- CORREÇÃO DEFINITIVA - Sincronizar TUDO
-- =====================================================

-- PASSO 1: Corrigir user_profiles para TODOS os clientes
UPDATE public.user_profiles up
SET 
  client_id = c.id,
  name = c.name,
  cnpj = c.cnpj,
  updated_at = NOW()
FROM public.clients c
WHERE up.email = c.email
  AND up.role = 'client';

-- PASSO 2: Atualizar metadados do auth.users para sincronizar
UPDATE auth.users au
SET 
  raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{clientId}',
        to_jsonb(c.id::text)
      ),
      '{name}',
      to_jsonb(c.name)
    ),
    '{cnpj}',
    to_jsonb(c.cnpj)
  ),
  updated_at = NOW()
FROM public.clients c
WHERE au.email = c.email
  AND c.email IS NOT NULL;

-- PASSO 3: Verificar o resultado
SELECT 
  'VERIFICAÇÃO FINAL' as status,
  c.email,
  c.name as cliente_name,
  c.id as cliente_id,
  up.client_id as user_profile_client_id,
  au.raw_user_meta_data->>'clientId' as metadata_client_id,
  CASE 
    WHEN c.id::text = up.client_id::text 
      AND c.id::text = au.raw_user_meta_data->>'clientId' 
    THEN 'OK ✅'
    ELSE 'ERRO ❌'
  END as status_sync
FROM public.clients c
LEFT JOIN public.user_profiles up ON c.email = up.email
LEFT JOIN auth.users au ON c.email = au.email
WHERE c.email IS NOT NULL
ORDER BY c.name;

