-- =====================================================
-- CORREÇÃO: Documentos com client_id errado
-- =====================================================

-- 1. DIAGNÓSTICO: Ver cliente novo e seus documentos
SELECT 
  'CLIENTE NOVO' as tipo,
  id as client_id,
  name,
  email
FROM public.clients
WHERE email = 'elisiaautomacao@gmail.com';

-- 2. Ver TODOS os documentos e seus client_ids
SELECT 
  'TODOS DOCUMENTOS' as tipo,
  d.id as doc_id,
  d.name as documento,
  d.client_id as client_id_atual,
  c.name as cliente_nome,
  c.email as cliente_email,
  d.upload_date
FROM public.documents d
LEFT JOIN public.clients c ON c.id = d.client_id
ORDER BY d.upload_date DESC;

-- 3. CORREÇÃO: Atualizar documentos órfãos ou com client_id errado
-- Execute este bloco DEPOIS de identificar quais documentos precisam ser corrigidos

-- Exemplo: Se você identificar que o documento X deve pertencer ao cliente Y
-- UPDATE public.documents
-- SET client_id = 'ID_CORRETO_DO_CLIENTE'
-- WHERE id = 'ID_DO_DOCUMENTO';

-- Para corrigir TODOS os documentos de um cliente específico:
-- UPDATE public.documents
-- SET client_id = (SELECT id FROM public.clients WHERE email = 'elisiaautomacao@gmail.com')
-- WHERE client_id IN (
--   SELECT id FROM public.clients WHERE email != 'elisiaautomacao@gmail.com'
-- )
-- AND name LIKE '%nome_do_arquivo%';

-- 4. VERIFICAÇÃO FINAL
SELECT 
  'VERIFICAÇÃO' as tipo,
  c.name as cliente,
  c.email,
  COUNT(d.id) as total_documentos,
  array_agg(d.name) as documentos
FROM public.clients c
LEFT JOIN public.documents d ON d.client_id = c.id
GROUP BY c.id, c.name, c.email
ORDER BY c.created_at DESC;

