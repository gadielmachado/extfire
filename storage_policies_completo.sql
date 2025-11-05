-- ====================================================
-- POLÍTICAS DE STORAGE PARA O BUCKET 'documents'
-- Execute este script no SQL Editor do Supabase
-- ====================================================

-- IMPORTANTE: Antes de executar este script:
-- 1. Crie o bucket 'documents' em Storage > Create bucket
-- 2. Configure como PRIVADO (não público)
-- 3. Execute este script

-- ====================================================
-- REMOVER POLÍTICAS ANTIGAS (se existirem)
-- ====================================================
DROP POLICY IF EXISTS "Admins podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem visualizar todos os documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Clientes podem visualizar seus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público para leitura de documentos" ON storage.objects;

-- ====================================================
-- 1. POLÍTICAS PARA ADMINISTRADORES
-- ====================================================

-- Permitir admins fazer UPLOAD (INSERT)
CREATE POLICY "Admins podem fazer upload de documentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin' OR
      auth.users.email IN (
        'gadielmachado.bm@gmail.com',
        'gadyel.bm@gmail.com',
        'extfire.extfire@gmail.com',
        'paoliellocristiano@gmail.com'
      )
    )
  )
);

-- Permitir admins VISUALIZAR (SELECT) todos os documentos
CREATE POLICY "Admins podem visualizar todos os documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin' OR
      auth.users.email IN (
        'gadielmachado.bm@gmail.com',
        'gadyel.bm@gmail.com',
        'extfire.extfire@gmail.com',
        'paoliellocristiano@gmail.com'
      )
    )
  )
);

-- Permitir admins DELETAR (DELETE) documentos
CREATE POLICY "Admins podem deletar documentos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin' OR
      auth.users.email IN (
        'gadielmachado.bm@gmail.com',
        'gadyel.bm@gmail.com',
        'extfire.extfire@gmail.com',
        'paoliellocristiano@gmail.com'
      )
    )
  )
);

-- Permitir admins ATUALIZAR (UPDATE) documentos
CREATE POLICY "Admins podem atualizar documentos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin' OR
      auth.users.email IN (
        'gadielmachado.bm@gmail.com',
        'gadyel.bm@gmail.com',
        'extfire.extfire@gmail.com',
        'paoliellocristiano@gmail.com'
      )
    )
  )
);

-- ====================================================
-- 2. POLÍTICAS PARA CLIENTES NÃO-ADMIN
-- ====================================================

-- Permitir clientes visualizarem APENAS seus próprios documentos
-- Estrutura do caminho: documents/{clientId}/{arquivo}
CREATE POLICY "Clientes podem visualizar seus documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  -- Verificar se o clientId no caminho corresponde ao clientId do usuário
  (storage.foldername(name))[1] = (
    SELECT auth.users.raw_user_meta_data->>'clientId'
    FROM auth.users
    WHERE auth.users.id = auth.uid()
  )
);

-- ====================================================
-- 3. POLÍTICA DE ACESSO PÚBLICO PARA LEITURA (OPCIONAL)
-- ====================================================
-- ATENÇÃO: Descomente apenas se quiser que QUALQUER pessoa
-- possa acessar os documentos através da URL pública
-- Não recomendado para documentos sensíveis!

-- CREATE POLICY "Acesso público para leitura de documentos"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'documents');

-- ====================================================
-- VERIFICAÇÃO DAS POLÍTICAS
-- ====================================================
-- Execute esta query para verificar se as políticas foram criadas:

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

-- ====================================================
-- CONFIGURAÇÃO ADICIONAL DO BUCKET
-- ====================================================
-- Se você precisa alterar as configurações do bucket:

-- Para tornar o bucket PRIVADO (recomendado):
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documents';

-- Para tornar o bucket PÚBLICO (não recomendado):
-- UPDATE storage.buckets 
-- SET public = true 
-- WHERE id = 'documents';

-- ====================================================
-- TESTES
-- ====================================================
-- Para testar as políticas:

-- 1. Faça login como admin na aplicação
-- 2. Tente fazer upload de um documento
-- 3. Verifique se o arquivo aparece em Storage > documents
-- 4. Tente visualizar/baixar o documento
-- 5. Faça login como cliente não-admin
-- 6. Verifique se consegue ver apenas seus documentos

-- ====================================================
-- TROUBLESHOOTING
-- ====================================================

-- Se tiver erro "new row violates row-level security policy":
-- 1. Verifique se o usuário tem role='admin' nos metadados
-- 2. Execute: SELECT auth.uid(); para ver o ID do usuário logado
-- 3. Execute: SELECT * FROM auth.users WHERE id = auth.uid();
-- 4. Verifique se raw_user_meta_data contém role='admin'

-- Para atualizar metadados de um usuário manualmente:
-- UPDATE auth.users 
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{role}',
--   '"admin"'
-- )
-- WHERE email = 'seu-email@exemplo.com';

-- ====================================================
-- FIM DO SCRIPT
-- ====================================================

