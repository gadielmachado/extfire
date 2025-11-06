-- =====================================================
-- CORREÇÃO COMPLETA AUTOMÁTICA
-- Execute TUDO de uma vez
-- =====================================================

-- PARTE 1: DIAGNÓSTICO ANTES
SELECT 'ANTES - CLIENTES' as etapa, id, name, email FROM public.clients;
SELECT 'ANTES - DOCUMENTOS' as etapa, d.name, d.client_id, c.email 
FROM public.documents d 
LEFT JOIN public.clients c ON c.id = d.client_id
ORDER BY d.upload_date DESC LIMIT 5;

-- PARTE 2: CORREÇÕES

-- 1. Corrigir user_profiles
UPDATE public.user_profiles up
SET 
  client_id = c.id,
  name = c.name,
  cnpj = COALESCE(c.cnpj, ''),
  updated_at = NOW()
FROM public.clients c
WHERE up.email = c.email 
  AND up.role = 'client';

-- 2. Corrigir metadata do auth.users
UPDATE auth.users au
SET 
  raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(au.raw_user_meta_data, '{}'::jsonb),
        '{clientId}', 
        to_jsonb(c.id::text)
      ),
      '{name}', 
      to_jsonb(c.name)
    ),
    '{cnpj}', 
    to_jsonb(COALESCE(c.cnpj, ''))
  ),
  updated_at = NOW()
FROM public.clients c
WHERE au.email = c.email
  AND c.email IS NOT NULL;

-- PARTE 3: VERIFICAÇÃO DEPOIS
SELECT 
  'DEPOIS - VERIFICACAO' as etapa,
  c.email,
  c.id as client_id_clients,
  up.client_id as client_id_user_profile,
  au.raw_user_meta_data->>'clientId' as client_id_metadata,
  CASE 
    WHEN c.id::text = up.client_id::text 
      AND c.id::text = au.raw_user_meta_data->>'clientId'
    THEN 'OK'
    ELSE 'ERRO'
  END as status
FROM public.clients c
LEFT JOIN public.user_profiles up ON up.email = c.email
LEFT JOIN auth.users au ON au.email = c.email
WHERE c.email IS NOT NULL
ORDER BY c.email;

-- PARTE 4: RESUMO
SELECT 
  'RESUMO FINAL' as etapa,
  c.name as cliente,
  c.email,
  COUNT(d.id) as total_docs,
  string_agg(d.name, ', ') as documentos
FROM public.clients c
LEFT JOIN public.documents d ON d.client_id = c.id
GROUP BY c.id, c.name, c.email
ORDER BY c.created_at DESC;

