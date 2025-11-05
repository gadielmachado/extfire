-- ====================================================
-- CORREÇÃO: Políticas de Storage Unificadas
-- ====================================================
-- Este script atualiza as políticas de Storage para usar
-- as funções unificadas (is_admin e get_user_client_id)
-- garantindo consistência com as políticas de tabelas

-- IMPORTANTE: Execute este script APÓS ter executado:
-- 1. fix_user_profiles_sync.sql
-- 2. fix_rls_policies_v2.sql

-- ====================================================
-- 1. REMOVER POLÍTICAS ANTIGAS DE STORAGE
-- ====================================================

DROP POLICY IF EXISTS "Admins podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem visualizar todos os documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Clientes podem visualizar seus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público para leitura de documentos" ON storage.objects;

-- ====================================================
-- 2. POLÍTICAS DE UPLOAD (INSERT)
-- ====================================================

-- Admins podem fazer upload de qualquer documento
CREATE POLICY "Admins podem fazer upload de documentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- ====================================================
-- 3. POLÍTICAS DE VISUALIZAÇÃO (SELECT)
-- ====================================================

-- Admins podem visualizar todos os documentos
CREATE POLICY "Admins podem visualizar todos os documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- Clientes podem visualizar apenas seus próprios documentos
-- Estrutura do caminho: documents/{clientId}/{arquivo}
CREATE POLICY "Clientes podem visualizar seus documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  -- Extrair clientId do caminho e comparar com o client_id do usuário
  -- (storage.foldername(name))[1] retorna o primeiro nível da pasta
  (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
);

-- ====================================================
-- 4. POLÍTICAS DE ATUALIZAÇÃO (UPDATE)
-- ====================================================

-- Apenas admins podem atualizar metadados de documentos
CREATE POLICY "Admins podem atualizar documentos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- ====================================================
-- 5. POLÍTICAS DE EXCLUSÃO (DELETE)
-- ====================================================

-- Apenas admins podem deletar documentos
CREATE POLICY "Admins podem deletar documentos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- ====================================================
-- 6. CONFIGURAÇÃO DO BUCKET
-- ====================================================

-- Garantir que o bucket 'documents' existe e está configurado como PRIVADO
-- (Execute manualmente no dashboard se o bucket não existir)

-- Tornar o bucket PRIVADO (recomendado para segurança)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documents';

-- ====================================================
-- 7. VERIFICAÇÃO
-- ====================================================

-- Verificar políticas de storage criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operacao
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

-- Verificar configuração do bucket
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE id = 'documents';

-- ====================================================
-- 8. TESTES RECOMENDADOS
-- ====================================================

-- Após executar este script, teste:

-- 1. COMO ADMIN:
--    - Fazer upload de um documento
--    - Visualizar documentos de qualquer cliente
--    - Deletar documentos

-- 2. COMO CLIENTE:
--    - Tentar visualizar documentos do seu cliente (deve funcionar)
--    - Tentar visualizar documentos de outro cliente (deve falhar)
--    - Tentar fazer upload (deve falhar)
--    - Tentar deletar (deve falhar)

-- Para testar manualmente, você pode usar estas queries:
-- (Execute logado como diferentes usuários)

-- Verificar seu client_id:
-- SELECT 
--   auth.uid() as meu_user_id,
--   public.get_user_client_id(auth.uid()) as meu_client_id,
--   public.is_admin(auth.uid()) as sou_admin;

-- ====================================================
-- 9. TROUBLESHOOTING
-- ====================================================

-- Se tiver erro "new row violates row-level security policy":

-- 1. Verificar se as funções existem:
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
--   AND routine_name IN ('is_admin', 'get_user_client_id');

-- 2. Verificar se user_profile existe para o usuário:
-- SELECT * FROM user_profiles WHERE id = auth.uid();

-- 3. Verificar se o client_id está correto:
-- SELECT 
--   up.id,
--   up.email,
--   up.client_id,
--   c.name as client_name
-- FROM user_profiles up
-- LEFT JOIN clients c ON c.id = up.client_id
-- WHERE up.id = auth.uid();

-- 4. Se user_profile não existir ou client_id estiver NULL,
--    execute a sincronização manual:
-- SELECT * FROM public.sync_all_user_profiles();

-- 5. Para forçar criação/atualização de um user_profile específico:
-- SELECT public.sync_user_profile(
--   'USER_ID_AQUI'::UUID,
--   'email@exemplo.com',
--   'Nome do Usuario',
--   'client', -- ou 'admin'
--   'CLIENT_ID_AQUI'::UUID,
--   'CNPJ_AQUI'
-- );

-- ====================================================
-- FIM DO SCRIPT
-- ====================================================
-- Execute este script no SQL Editor do Supabase
-- Isso garantirá que as políticas de Storage usem a mesma
-- lógica que as políticas de tabelas, resolvendo inconsistências

