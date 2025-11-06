-- =====================================================
-- EXECUTE AGORA - Correção para elisiaautomacao@gmail.com
-- =====================================================

-- PASSO 1: Ver o problema
SELECT 
  'DIAGNÓSTICO' as etapa,
  d.name as documento,
  d.client_id as client_id_documento,
  c.name as cliente,
  c.email as email_cliente
FROM public.documents d
LEFT JOIN public.clients c ON c.id = d.client_id
ORDER BY d.upload_date DESC
LIMIT 5;

-- PASSO 2: Ver ID correto do cliente novo
SELECT 
  'CLIENTE NOVO' as etapa,
  id as client_id_correto,
  name,
  email
FROM public.clients
WHERE email = 'elisiaautomacao@gmail.com';

-- PASSO 3: Corrigir documentos mais recentes (ajuste LIMIT se necessário)
UPDATE public.documents
SET client_id = (SELECT id FROM public.clients WHERE email = 'elisiaautomacao@gmail.com')
WHERE id IN (
  SELECT id FROM public.documents
  ORDER BY upload_date DESC
  LIMIT 2  -- Ajuste este número conforme quantos documentos você uploadou
);

-- PASSO 4: Sincronizar user_profile e metadata
UPDATE public.user_profiles up
SET client_id = c.id, name = c.name, cnpj = c.cnpj, updated_at = NOW()
FROM public.clients c
WHERE up.email = c.email AND c.email = 'elisiaautomacao@gmail.com';

UPDATE auth.users au
SET raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{clientId}', to_jsonb(c.id::text)
      ),
      '{name}', to_jsonb(c.name)
    ),
    '{cnpj}', to_jsonb(c.cnpj)
  ),
  updated_at = NOW()
FROM public.clients c
WHERE au.email = c.email AND c.email = 'elisiaautomacao@gmail.com';

-- PASSO 5: Verificar correção
SELECT 
  'VERIFICAÇÃO' as etapa,
  c.name as cliente,
  c.email,
  COUNT(d.id) as total_documentos,
  array_agg(d.name) as documentos
FROM public.clients c
LEFT JOIN public.documents d ON d.client_id = c.id
WHERE c.email = 'elisiaautomacao@gmail.com'
GROUP BY c.id, c.name, c.email;

