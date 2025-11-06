-- ====================================================
-- CORREÇÃO: Atualizar políticas RLS
-- ====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Visualizar documentos com permissão" ON documents;
DROP POLICY IF EXISTS "Inserir documentos com permissão" ON documents;
DROP POLICY IF EXISTS "Atualizar documentos (admin apenas)" ON documents;
DROP POLICY IF EXISTS "Deletar documentos (admin apenas)" ON documents;

-- Criar políticas corretas
CREATE POLICY "Visualizar documentos com permissão"
  ON documents FOR SELECT
  USING (
    public.is_admin(auth.uid()) 
    OR
    client_id = public.get_user_client_id(auth.uid())
  );

CREATE POLICY "Inserir documentos com permissão"
  ON documents FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR
    client_id = public.get_user_client_id(auth.uid())
  );

CREATE POLICY "Atualizar documentos (admin apenas)"
  ON documents FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Deletar documentos (admin apenas)"
  ON documents FOR DELETE
  USING (public.is_admin(auth.uid()));

