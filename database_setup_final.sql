-- ====================================================
-- CONFIGURAÇÃO DEFINITIVA DO BANCO DE DADOS - ExtFire
-- ====================================================
-- Este é o script ÚNICO e DEFINITIVO para configurar o banco de dados
-- Execute este script COMPLETO no SQL Editor do Supabase
-- ====================================================

-- ====================================================
-- PARTE 1: EXTENSÕES E CONFIGURAÇÕES INICIAIS
-- ====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================
-- PARTE 2: CRIAÇÃO/ATUALIZAÇÃO DE TABELAS
-- ====================================================

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  maintenance_date TIMESTAMPTZ,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Clients
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_is_blocked ON clients(is_blocked);

-- Tabela de Documentos
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  size VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Documents
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date);

-- Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'client')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  cnpj VARCHAR(18),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para User_Profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_client_id ON user_profiles(client_id);

-- ====================================================
-- PARTE 3: TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================================
-- PARTE 4: FUNÇÕES AUXILIARES
-- ====================================================

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role TEXT;
  v_email TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar por email (lista de admins hardcoded)
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = user_id;
  
  IF v_email IN (
    'gadielmachado.bm@gmail.com',
    'gadyel.bm@gmail.com',
    'extfire.extfire@gmail.com',
    'paoliellocristiano@gmail.com'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar role em user_profiles
  SELECT role INTO v_role
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  RETURN v_role = 'admin';
END;
$$;

-- Função para obter client_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar em user_profiles
  SELECT client_id INTO v_client_id
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- Fallback: buscar em raw_user_meta_data
  SELECT (raw_user_meta_data->>'clientId')::UUID INTO v_client_id
  FROM auth.users
  WHERE id = user_id
  LIMIT 1;
  
  RETURN v_client_id;
END;
$$;

-- Função para sincronizar user_profile
CREATE OR REPLACE FUNCTION public.sync_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'client',
  user_client_id UUID DEFAULT NULL,
  user_cnpj TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, email, name, role, client_id, cnpj, created_at, updated_at
  )
  VALUES (
    user_id, user_email, COALESCE(user_name, user_email),
    user_role, user_client_id, user_cnpj, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, user_profiles.name),
    role = EXCLUDED.role,
    client_id = COALESCE(EXCLUDED.client_id, user_profiles.client_id),
    cnpj = COALESCE(EXCLUDED.cnpj, user_profiles.cnpj),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- PARTE 5: TRIGGERS DE SINCRONIZAÇÃO
-- ====================================================

-- Trigger para criar user_profile quando novo usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
  v_client_id UUID;
  v_cnpj TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  v_client_id := (NEW.raw_user_meta_data->>'clientId')::UUID;
  v_cnpj := NEW.raw_user_meta_data->>'cnpj';
  
  PERFORM public.sync_user_profile(
    NEW.id, NEW.email, v_name, v_role, v_client_id, v_cnpj
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar user_profile quando metadados mudam
CREATE OR REPLACE FUNCTION public.handle_user_metadata_update()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
  v_client_id UUID;
  v_cnpj TEXT;
BEGIN
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    v_client_id := (NEW.raw_user_meta_data->>'clientId')::UUID;
    v_cnpj := NEW.raw_user_meta_data->>'cnpj';
    
    PERFORM public.sync_user_profile(
      NEW.id, NEW.email, v_name, v_role, v_client_id, v_cnpj
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_metadata_update();

-- Trigger para sincronizar cliente com user_profile
CREATE OR REPLACE FUNCTION public.sync_client_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      SELECT role INTO v_role
      FROM public.user_profiles
      WHERE id = v_user_id;
      
      IF v_role IS NULL OR v_role != 'admin' THEN
        PERFORM public.sync_user_profile(
          v_user_id, NEW.email, NEW.name, 'client', NEW.id, NEW.cnpj
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_client_created_or_updated ON clients;
CREATE TRIGGER on_client_created_or_updated
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_user_profile();

-- ====================================================
-- PARTE 6: REMOVER TODAS AS POLÍTICAS ANTIGAS
-- ====================================================

-- Remover políticas da tabela clients
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'clients'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON clients', r.policyname);
  END LOOP;
END $$;

-- Remover políticas da tabela documents
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON documents', r.policyname);
  END LOOP;
END $$;

-- Remover políticas da tabela user_profiles
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', r.policyname);
  END LOOP;
END $$;

-- Remover políticas de storage
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- ====================================================
-- PARTE 7: HABILITAR RLS
-- ====================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- PARTE 8: POLÍTICAS RLS - CLIENTS
-- ====================================================

-- SELECT: Admins veem todos, clientes veem apenas o seu
CREATE POLICY "clients_select_policy"
  ON clients FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    public.get_user_client_id(auth.uid()) = id
  );

-- INSERT: Apenas admins
CREATE POLICY "clients_insert_policy"
  ON clients FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: Apenas admins
CREATE POLICY "clients_update_policy"
  ON clients FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: Apenas admins
CREATE POLICY "clients_delete_policy"
  ON clients FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ====================================================
-- PARTE 9: POLÍTICAS RLS - DOCUMENTS
-- ====================================================

-- SELECT: Admins veem todos, clientes veem apenas seus documentos
CREATE POLICY "documents_select_policy"
  ON documents FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    public.get_user_client_id(auth.uid()) = client_id
  );

-- INSERT: Admins podem inserir para qualquer cliente, clientes podem inserir para si mesmos
CREATE POLICY "documents_insert_policy"
  ON documents FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) OR
    public.get_user_client_id(auth.uid()) = client_id
  );

-- UPDATE: Apenas admins
CREATE POLICY "documents_update_policy"
  ON documents FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: Apenas admins
CREATE POLICY "documents_delete_policy"
  ON documents FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ====================================================
-- PARTE 10: POLÍTICAS RLS - USER_PROFILES
-- ====================================================

-- SELECT: Usuários veem seu próprio perfil, admins veem todos
CREATE POLICY "user_profiles_select_policy"
  ON user_profiles FOR SELECT
  USING (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  );

-- INSERT: Usuário pode inserir seu próprio perfil, admins podem inserir qualquer perfil
CREATE POLICY "user_profiles_insert_policy"
  ON user_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  );

-- UPDATE: Usuários atualizam seu perfil, admins atualizam todos
CREATE POLICY "user_profiles_update_policy"
  ON user_profiles FOR UPDATE
  USING (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  );

-- DELETE: Apenas admins
CREATE POLICY "user_profiles_delete_policy"
  ON user_profiles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ====================================================
-- PARTE 11: CONFIGURAR BUCKET DE STORAGE
-- ====================================================

-- Criar bucket se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', false);
  END IF;
END $$;

-- Garantir que bucket é privado
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documents';

-- ====================================================
-- PARTE 12: POLÍTICAS DE STORAGE
-- ====================================================

-- INSERT: Admins podem fazer upload para qualquer pasta, clientes podem fazer upload na sua pasta
CREATE POLICY "storage_insert_policy"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND (
    public.is_admin(auth.uid()) OR
    (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
  )
);

-- SELECT: Admins veem tudo, clientes veem apenas arquivos na sua pasta
CREATE POLICY "storage_select_policy"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND (
    public.is_admin(auth.uid()) OR
    (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
  )
);

-- UPDATE: Apenas admins
CREATE POLICY "storage_update_policy"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- DELETE: Apenas admins
CREATE POLICY "storage_delete_policy"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- ====================================================
-- PARTE 13: POPULAR USER_PROFILES COM USUÁRIOS EXISTENTES
-- ====================================================

-- Inserir perfis para usuários que ainda não têm
INSERT INTO user_profiles (id, email, name, role, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.email),
  CASE 
    WHEN u.email IN (
      'gadielmachado.bm@gmail.com',
      'gadyel.bm@gmail.com',
      'extfire.extfire@gmail.com',
      'paoliellocristiano@gmail.com'
    ) THEN 'admin'
    ELSE COALESCE(u.raw_user_meta_data->>'role', 'client')
  END,
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ====================================================
-- PARTE 14: VERIFICAÇÃO FINAL
-- ====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS           ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 COMPONENTES CRIADOS/ATUALIZADOS:';
  RAISE NOTICE '  ✓ Tabelas: clients, documents, user_profiles';
  RAISE NOTICE '  ✓ Funções auxiliares (is_admin, get_user_client_id, sync_user_profile)';
  RAISE NOTICE '  ✓ Triggers de sincronização automática';
  RAISE NOTICE '  ✓ Políticas RLS para todas as tabelas';
  RAISE NOTICE '  ✓ Bucket de Storage e políticas';
  RAISE NOTICE '  ✓ User_profiles sincronizados';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 POLÍTICAS DE SEGURANÇA:';
  RAISE NOTICE '  ✓ Admins: Acesso completo a tudo';
  RAISE NOTICE '  ✓ Clientes: Acesso apenas aos seus próprios dados';
  RAISE NOTICE '  ✓ Clientes podem fazer upload de documentos';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
  RAISE NOTICE '  1. Recarregue a aplicação';
  RAISE NOTICE '  2. Teste o login';
  RAISE NOTICE '  3. Teste exclusão de clientes';
  RAISE NOTICE '  4. Teste upload de documentos (admin e cliente)';
  RAISE NOTICE '';
END $$;

-- Verificar tabelas
SELECT 
  '📊 TABELAS' as info,
  table_name as nome,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('clients', 'documents', 'user_profiles')
ORDER BY table_name;

-- Verificar funções
SELECT 
  '⚙️ FUNÇÕES' as info,
  routine_name as nome
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_admin',
    'get_user_client_id',
    'sync_user_profile',
    'handle_new_user',
    'handle_user_metadata_update',
    'sync_client_user_profile'
  )
ORDER BY routine_name;

-- Verificar políticas RLS
SELECT 
  '🔒 POLÍTICAS RLS' as info,
  tablename as tabela,
  COUNT(*) as quantidade
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'documents', 'user_profiles')
GROUP BY tablename
ORDER BY tablename;

-- Verificar políticas de storage
SELECT 
  '💾 STORAGE POLICIES' as info,
  COUNT(*) as quantidade
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Verificar bucket
SELECT 
  '📦 BUCKET' as info,
  id as nome,
  CASE WHEN public THEN '⚠️ Público' ELSE '✅ Privado' END as status
FROM storage.buckets
WHERE id = 'documents';

-- Verificar user_profiles
SELECT 
  '👥 USER_PROFILES' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'client' THEN 1 END) as clientes
FROM user_profiles;

-- ====================================================
-- FIM DA CONFIGURAÇÃO
-- ====================================================

