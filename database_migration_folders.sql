-- ====================================================
-- MIGRAÇÃO: Sistema Hierárquico de Pastas
-- ====================================================
-- Este script adiciona suporte para organização hierárquica
-- de documentos através de pastas
-- ====================================================

-- ====================================================
-- PARTE 1: CRIAR TABELA FOLDERS
-- ====================================================

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint para evitar nomes duplicados no mesmo nível
  CONSTRAINT unique_folder_name_per_level UNIQUE (client_id, parent_folder_id, name)
);

-- Índices para Folders
CREATE INDEX IF NOT EXISTS idx_folders_client_id ON folders(client_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_folder_id ON folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name);

-- ====================================================
-- PARTE 2: MODIFICAR TABELA DOCUMENTS
-- ====================================================

-- Adicionar coluna folder_id (nullable para documentos na raiz)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Índice para folder_id
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);

-- ====================================================
-- PARTE 3: FUNÇÃO PARA CALCULAR PROFUNDIDADE DE PASTA
-- ====================================================

CREATE OR REPLACE FUNCTION get_folder_depth(folder_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  depth INTEGER := 0;
  current_folder_id UUID := folder_uuid;
  parent_id UUID;
  max_iterations INTEGER := 10; -- Proteção contra loops infinitos
  iteration_count INTEGER := 0;
BEGIN
  -- Se folder_uuid é NULL, está na raiz (profundidade 0)
  IF folder_uuid IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Percorrer a hierarquia até a raiz
  LOOP
    -- Buscar pasta pai
    SELECT parent_folder_id INTO parent_id
    FROM folders
    WHERE id = current_folder_id;
    
    -- Se não encontrou a pasta ou chegou na raiz, parar
    IF NOT FOUND OR parent_id IS NULL THEN
      EXIT;
    END IF;
    
    -- Incrementar profundidade
    depth := depth + 1;
    current_folder_id := parent_id;
    
    -- Proteção contra loops infinitos
    iteration_count := iteration_count + 1;
    IF iteration_count >= max_iterations THEN
      RAISE EXCEPTION 'Detectado loop infinito na hierarquia de pastas';
    END IF;
  END LOOP;
  
  RETURN depth;
END;
$$;

-- ====================================================
-- PARTE 4: FUNÇÃO PARA VALIDAR PROFUNDIDADE MÁXIMA
-- ====================================================

CREATE OR REPLACE FUNCTION validate_folder_depth()
RETURNS TRIGGER AS $$
DECLARE
  current_depth INTEGER;
  max_depth INTEGER := 4; -- 0-4 = 5 níveis (raiz + 4 subníveis)
BEGIN
  -- Calcular profundidade da pasta pai
  current_depth := get_folder_depth(NEW.parent_folder_id);
  
  -- Se a nova pasta exceder o limite, bloquear
  IF current_depth >= max_depth THEN
    RAISE EXCEPTION 'Profundidade máxima de pastas excedida (máximo: 5 níveis)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar profundidade ao inserir ou atualizar pasta
DROP TRIGGER IF EXISTS check_folder_depth_on_insert ON folders;
CREATE TRIGGER check_folder_depth_on_insert
  BEFORE INSERT OR UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION validate_folder_depth();

-- ====================================================
-- PARTE 5: TRIGGER PARA ATUALIZAR updated_at
-- ====================================================

DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================================
-- PARTE 6: FUNÇÃO PARA PREVENIR MOVIMENTAÇÃO RECURSIVA
-- ====================================================

CREATE OR REPLACE FUNCTION prevent_folder_recursion()
RETURNS TRIGGER AS $$
DECLARE
  ancestor_id UUID;
  current_id UUID;
  max_iterations INTEGER := 10;
  iteration_count INTEGER := 0;
BEGIN
  -- Apenas checar se parent_folder_id está sendo alterado
  IF NEW.parent_folder_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Não pode ser pai de si mesmo
  IF NEW.id = NEW.parent_folder_id THEN
    RAISE EXCEPTION 'Uma pasta não pode ser pai de si mesma';
  END IF;
  
  -- Verificar se o novo pai não é um descendente desta pasta
  current_id := NEW.parent_folder_id;
  
  LOOP
    -- Buscar o pai do current_id
    SELECT parent_folder_id INTO ancestor_id
    FROM folders
    WHERE id = current_id;
    
    -- Se não encontrou ou chegou na raiz, OK
    IF NOT FOUND OR ancestor_id IS NULL THEN
      EXIT;
    END IF;
    
    -- Se encontrou a própria pasta como ancestral, é recursão!
    IF ancestor_id = NEW.id THEN
      RAISE EXCEPTION 'Não é possível mover uma pasta para dentro de si mesma';
    END IF;
    
    -- Subir mais um nível
    current_id := ancestor_id;
    
    -- Proteção contra loops
    iteration_count := iteration_count + 1;
    IF iteration_count >= max_iterations THEN
      RAISE EXCEPTION 'Detectado loop infinito ao validar hierarquia de pastas';
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para prevenir recursão
DROP TRIGGER IF EXISTS prevent_folder_recursion_trigger ON folders;
CREATE TRIGGER prevent_folder_recursion_trigger
  BEFORE INSERT OR UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_folder_recursion();

-- ====================================================
-- PARTE 7: RLS POLICIES PARA FOLDERS
-- ====================================================

-- Habilitar RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- SELECT: Admins veem todas, clientes veem apenas suas pastas
CREATE POLICY "folders_select_policy"
  ON folders FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    public.get_user_client_id(auth.uid()) = client_id
  );

-- INSERT: Apenas admins podem criar pastas
CREATE POLICY "folders_insert_policy"
  ON folders FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: Apenas admins podem renomear pastas
CREATE POLICY "folders_update_policy"
  ON folders FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: Apenas admins podem deletar pastas
CREATE POLICY "folders_delete_policy"
  ON folders FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ====================================================
-- PARTE 8: FUNÇÃO AUXILIAR PARA OBTER CAMINHO COMPLETO
-- ====================================================

CREATE OR REPLACE FUNCTION get_folder_path(folder_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  path_parts TEXT[] := ARRAY[]::TEXT[];
  current_folder_id UUID := folder_uuid;
  folder_name TEXT;
  parent_id UUID;
  max_iterations INTEGER := 10;
  iteration_count INTEGER := 0;
BEGIN
  -- Se folder_uuid é NULL, retornar "Raiz"
  IF folder_uuid IS NULL THEN
    RETURN 'Raiz';
  END IF;
  
  -- Percorrer a hierarquia do fim para o início
  LOOP
    -- Buscar nome e pai da pasta atual
    SELECT name, parent_folder_id INTO folder_name, parent_id
    FROM folders
    WHERE id = current_folder_id;
    
    -- Se não encontrou, parar
    IF NOT FOUND THEN
      EXIT;
    END IF;
    
    -- Adicionar nome ao início do array
    path_parts := array_prepend(folder_name, path_parts);
    
    -- Se chegou na raiz, parar
    IF parent_id IS NULL THEN
      EXIT;
    END IF;
    
    -- Subir um nível
    current_folder_id := parent_id;
    
    -- Proteção contra loops
    iteration_count := iteration_count + 1;
    IF iteration_count >= max_iterations THEN
      RAISE EXCEPTION 'Detectado loop infinito ao construir caminho de pasta';
    END IF;
  END LOOP;
  
  -- Juntar partes com " > "
  RETURN 'Raiz > ' || array_to_string(path_parts, ' > ');
END;
$$;

-- ====================================================
-- PARTE 9: VERIFICAÇÃO FINAL
-- ====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ MIGRAÇÃO DE PASTAS CONCLUÍDA COM SUCESSO          ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 COMPONENTES CRIADOS:';
  RAISE NOTICE '  ✓ Tabela folders com suporte hierárquico';
  RAISE NOTICE '  ✓ Coluna folder_id adicionada em documents';
  RAISE NOTICE '  ✓ Funções de validação de profundidade (máx 5 níveis)';
  RAISE NOTICE '  ✓ Proteção contra recursão infinita';
  RAISE NOTICE '  ✓ Políticas RLS (admin full access, client read-only)';
  RAISE NOTICE '  ✓ Função auxiliar para obter caminho completo';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SEGURANÇA:';
  RAISE NOTICE '  ✓ Apenas admins podem criar/editar/deletar pastas';
  RAISE NOTICE '  ✓ Clientes podem apenas visualizar suas pastas';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ PRÓXIMOS PASSOS:';
  RAISE NOTICE '  1. Execute esta migração no SQL Editor do Supabase';
  RAISE NOTICE '  2. Atualize o código frontend para usar folders';
  RAISE NOTICE '  3. Teste criação de pastas e documentos';
  RAISE NOTICE '';
END $$;

-- Verificar criação da tabela folders
SELECT 
  '📁 TABELA FOLDERS' as info,
  COUNT(*) as colunas
FROM information_schema.columns
WHERE table_name = 'folders' AND table_schema = 'public';

-- Verificar coluna folder_id em documents
SELECT 
  '📄 COLUNA folder_id EM DOCUMENTS' as info,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'folder_id'
  ) THEN '✅ Adicionada' ELSE '❌ Não encontrada' END as status;

-- Verificar políticas RLS
SELECT 
  '🔒 POLÍTICAS RLS FOLDERS' as info,
  COUNT(*) as quantidade
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'folders';

