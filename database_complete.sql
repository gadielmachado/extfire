-- ====================================================
-- CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS - ExtFire
-- ====================================================
-- Este script consolidado contém TODA a configuração necessária
-- para o sistema ExtFire, incluindo:
-- - Criação de tabelas
-- - Funções auxiliares
-- - Políticas RLS
-- - Políticas de Storage
-- - Triggers de sincronização
-- - Scripts de verificação
-- ====================================================

-- ====================================================
-- PARTE 1: EXTENSÕES E CONFIGURAÇÕES INICIAIS
-- ====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================
-- PARTE 2: CRIAÇÃO DE TABELAS
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
  user_role VARCHAR(20) DEFAULT 'client',
  user_email VARCHAR(255),
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
  
  -- Verificar por email (lista de admins)
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

-- Função para verificar acesso a cliente específico
CREATE OR REPLACE FUNCTION public.has_client_access(
  user_id UUID,
  target_client_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF public.is_admin(user_id) THEN
    RETURN TRUE;
  END IF;
  
  IF public.get_user_client_id(user_id) = target_client_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
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
-- PARTE 6: HABILITAR RLS
-- ====================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- PARTE 7: POLÍTICAS RLS - CLIENTS
-- ====================================================

DROP POLICY IF EXISTS "Admins podem ver todos os clientes" ON clients;
DROP POLICY IF EXISTS "Clientes podem ver seus próprios dados" ON clients;
DROP POLICY IF EXISTS "Admins podem inserir clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem atualizar clientes" ON clients;
DROP POLICY IF EXISTS "Admins podem deletar clientes" ON clients;
DROP POLICY IF EXISTS "Admins e clientes podem ver dados autorizados" ON clients;
DROP POLICY IF EXISTS "Apenas admins podem inserir clientes" ON clients;
DROP POLICY IF EXISTS "Apenas admins podem atualizar clientes" ON clients;
DROP POLICY IF EXISTS "Apenas admins podem deletar clientes" ON clients;
DROP POLICY IF EXISTS "Clientes podem ver seus dados" ON clients;
DROP POLICY IF EXISTS "Admins podem inserir" ON clients;
DROP POLICY IF EXISTS "Admins podem atualizar" ON clients;
DROP POLICY IF EXISTS "Admins podem deletar" ON clients;

CREATE POLICY "Admins e clientes podem ver dados autorizados"
  ON clients FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    public.get_user_client_id(auth.uid()) = id
  );

CREATE POLICY "Apenas admins podem inserir clientes"
  ON clients FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem atualizar clientes"
  ON clients FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem deletar clientes"
  ON clients FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ====================================================
-- PARTE 8: POLÍTICAS RLS - DOCUMENTS
-- ====================================================

DROP POLICY IF EXISTS "Admins podem ver todos os documentos" ON documents;
DROP POLICY IF EXISTS "Clientes podem ver seus documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem inserir documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON documents;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON documents;
DROP POLICY IF EXISTS "Admins e clientes podem ver documentos autorizados" ON documents;
DROP POLICY IF EXISTS "Apenas admins podem inserir documentos" ON documents;
DROP POLICY IF EXISTS "Apenas admins podem atualizar documentos" ON documents;
DROP POLICY IF EXISTS "Apenas admins podem deletar documentos" ON documents;
DROP POLICY IF EXISTS "Visualizar documentos autorizados" ON documents;
DROP POLICY IF EXISTS "Inserir documentos (admin)" ON documents;
DROP POLICY IF EXISTS "Atualizar documentos (admin)" ON documents;
DROP POLICY IF EXISTS "Deletar documentos (admin)" ON documents;
DROP POLICY IF EXISTS "Ver documentos" ON documents;
DROP POLICY IF EXISTS "Inserir documentos" ON documents;
DROP POLICY IF EXISTS "Atualizar documentos" ON documents;
DROP POLICY IF EXISTS "Deletar documentos" ON documents;
DROP POLICY IF EXISTS "Ver todos documentos (TEMPORÁRIO)" ON documents;
DROP POLICY IF EXISTS "Inserir documentos (TEMPORÁRIO)" ON documents;
DROP POLICY IF EXISTS "Atualizar documentos (TEMPORÁRIO)" ON documents;
DROP POLICY IF EXISTS "Deletar documentos (TEMPORÁRIO)" ON documents;
DROP POLICY IF EXISTS "Ver documentos (PERMISSIVO)" ON documents;
DROP POLICY IF EXISTS "Inserir documentos (PERMISSIVO)" ON documents;
DROP POLICY IF EXISTS "Atualizar documentos (PERMISSIVO)" ON documents;
DROP POLICY IF EXISTS "Deletar documentos (PERMISSIVO)" ON documents;

CREATE POLICY "Admins e clientes podem ver documentos autorizados"
  ON documents FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    public.get_user_client_id(auth.uid()) = client_id
  );

CREATE POLICY "Apenas admins podem inserir documentos"
  ON documents FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem atualizar documentos"
  ON documents FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem deletar documentos"
  ON documents FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ====================================================
-- PARTE 9: POLÍTICAS RLS - USER_PROFILES
-- ====================================================

DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON user_profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem inserir perfis" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem deletar perfis" ON user_profiles;
DROP POLICY IF EXISTS "Usuários veem seu perfil, admins veem todos" ON user_profiles;
DROP POLICY IF EXISTS "Sistema e admins podem inserir perfis" ON user_profiles;
DROP POLICY IF EXISTS "Usuários atualizam seu perfil, admins atualizam todos" ON user_profiles;
DROP POLICY IF EXISTS "Apenas admins podem deletar perfis" ON user_profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu perfil" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Usuários veem seu perfil, admins veem todos"
  ON user_profiles FOR SELECT
  USING (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Sistema e admins podem inserir perfis"
  ON user_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Usuários atualizam seu perfil, admins atualizam todos"
  ON user_profiles FOR UPDATE
  USING (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Apenas admins podem deletar perfis"
  ON user_profiles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ====================================================
-- PARTE 10: CONFIGURAR BUCKET DE STORAGE
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
-- PARTE 11: POLÍTICAS DE STORAGE
-- ====================================================

DROP POLICY IF EXISTS "Admins podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem visualizar todos os documentos" ON storage.objects;
DROP POLICY IF EXISTS "Clientes podem visualizar seus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público para leitura de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Upload de documentos (admin)" ON storage.objects;
DROP POLICY IF EXISTS "Visualizar documentos storage (admin)" ON storage.objects;
DROP POLICY IF EXISTS "Visualizar documentos storage (cliente)" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar documentos storage (admin)" ON storage.objects;
DROP POLICY IF EXISTS "Deletar documentos storage (admin)" ON storage.objects;
DROP POLICY IF EXISTS "Upload storage" ON storage.objects;
DROP POLICY IF EXISTS "Ver storage admin" ON storage.objects;
DROP POLICY IF EXISTS "Ver storage cliente" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar storage" ON storage.objects;
DROP POLICY IF EXISTS "Deletar storage" ON storage.objects;
DROP POLICY IF EXISTS "Upload storage (TEMPORÁRIO)" ON storage.objects;
DROP POLICY IF EXISTS "Ver storage (TEMPORÁRIO)" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar storage (TEMPORÁRIO)" ON storage.objects;
DROP POLICY IF EXISTS "Deletar storage (TEMPORÁRIO)" ON storage.objects;
DROP POLICY IF EXISTS "Upload storage (PERMISSIVO)" ON storage.objects;
DROP POLICY IF EXISTS "Ver storage (PERMISSIVO)" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar storage (PERMISSIVO)" ON storage.objects;
DROP POLICY IF EXISTS "Deletar storage (PERMISSIVO)" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deleção para usuários autenticados" ON storage.objects;

-- INSERT: Admins podem fazer upload
CREATE POLICY "Admins podem fazer upload de documentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- SELECT: Admins veem tudo
CREATE POLICY "Admins podem visualizar todos os documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- SELECT: Clientes veem apenas seus arquivos
CREATE POLICY "Clientes podem visualizar seus documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
);

-- UPDATE: Apenas admins
CREATE POLICY "Admins podem atualizar documentos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- DELETE: Apenas admins
CREATE POLICY "Admins podem deletar documentos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- ====================================================
-- PARTE 12: POPULAR USER_PROFILES COM USUÁRIOS EXISTENTES
-- ====================================================

-- Inserir usuários que ainda não têm perfil
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
-- PARTE 13: VERIFICAÇÃO FINAL
-- ====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS           ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 COMPONENTES CRIADOS:';
  RAISE NOTICE '  ✓ Tabelas: clients, documents, user_profiles';
  RAISE NOTICE '  ✓ Funções auxiliares (is_admin, get_user_client_id, etc.)';
  RAISE NOTICE '  ✓ Triggers de sincronização';
  RAISE NOTICE '  ✓ Políticas RLS para todas as tabelas';
  RAISE NOTICE '  ✓ Bucket de Storage e políticas';
  RAISE NOTICE '  ✓ User_profiles sincronizados';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 PRÓXIMOS PASSOS:';
  RAISE NOTICE '  1. Verifique se tudo foi criado corretamente';
  RAISE NOTICE '  2. Teste o login na aplicação';
  RAISE NOTICE '  3. Teste upload/visualização de documentos';
  RAISE NOTICE '';
END $$;

-- Verificar tabelas criadas
SELECT 
  'TABELAS' as tipo,
  table_name as nome
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clients', 'documents', 'user_profiles')
ORDER BY table_name;

-- Verificar funções criadas
SELECT 
  'FUNÇÕES' as tipo,
  routine_name as nome
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_admin',
    'get_user_client_id',
    'has_client_access',
    'sync_user_profile',
    'handle_new_user',
    'handle_user_metadata_update',
    'sync_client_user_profile'
  )
ORDER BY routine_name;

-- Verificar políticas RLS
SELECT 
  'POLÍTICAS RLS' as tipo,
  tablename as tabela,
  COUNT(*) as quantidade
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'documents', 'user_profiles')
GROUP BY tablename
ORDER BY tablename;

-- Verificar bucket e políticas de storage
SELECT 
  'STORAGE' as tipo,
  id as bucket,
  public as publico
FROM storage.buckets
WHERE id = 'documents';

-- Verificar user_profiles
SELECT 
  'USER_PROFILES' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'client' THEN 1 END) as clients
FROM user_profiles;

-- ====================================================
-- FIM DA CONFIGURAÇÃO
-- ====================================================

