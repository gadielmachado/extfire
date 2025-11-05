-- ============================================
-- POLÍTICAS DE STORAGE PARA O BUCKET 'documents'
-- Execute este script após criar o banco de dados
-- ============================================

-- Criar o bucket 'documents' (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas (caso existam)
DROP POLICY IF EXISTS "Admins podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem visualizar todos os documentos" ON storage.objects;
DROP POLICY IF EXISTS "Clientes podem visualizar seus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deleção para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON storage.objects;

-- ============================================
-- POLÍTICAS PERMISSIVAS (DESENVOLVIMENTO/PRODUÇÃO)
-- ============================================

-- Permitir INSERT (upload) para usuários autenticados
CREATE POLICY "Permitir upload para usuários autenticados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Permitir SELECT (visualização) para usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Permitir UPDATE para usuários autenticados
CREATE POLICY "Permitir atualização para usuários autenticados"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Permitir DELETE para usuários autenticados
CREATE POLICY "Permitir deleção para usuários autenticados"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar políticas criadas
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- Verificar bucket
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE name = 'documents';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas de storage configuradas com sucesso!';
  RAISE NOTICE '📁 Bucket: documents';
  RAISE NOTICE '🔐 Acesso: Usuários autenticados';
END $$;

