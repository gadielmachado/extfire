-- ====================================================
-- SCRIPT COMPLETO DE CONFIGURAÇÃO DO BANCO DE DADOS
-- Sistema de Gerenciamento de Clientes ExtFire
-- ====================================================

-- ====================================================
-- 1. LIMPEZA (OPCIONAL - CUIDADO EM PRODUÇÃO)
-- ====================================================
-- Descomente as linhas abaixo apenas se precisar recriar tudo do zero
-- DROP TABLE IF EXISTS documents CASCADE;
-- DROP TABLE IF EXISTS clients CASCADE;
-- DROP TABLE IF EXISTS user_profiles CASCADE;

-- ====================================================
-- 2. EXTENSÕES
-- ====================================================
-- Habilita a extensão UUID para gerar IDs únicos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================
-- 3. TABELA DE CLIENTES (clients)
-- ====================================================
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

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_is_blocked ON clients(is_blocked);

-- ====================================================
-- 4. TABELA DE DOCUMENTOS (documents)
-- ====================================================
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

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date);

-- ====================================================
-- 5. TABELA DE PERFIS DE USUÁRIOS (user_profiles)
-- ====================================================
-- Esta tabela estende a tabela auth.users do Supabase
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cnpj VARCHAR(18),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'client')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_client_id ON user_profiles(client_id);

-- ====================================================
-- 6. TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- ====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger em cada tabela
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
-- 7. POLÍTICAS DE SEGURANÇA RLS (Row Level Security)
-- ====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela clients
DROP POLICY IF EXISTS "Admins podem ver todos os clientes" ON clients;
CREATE POLICY "Admins podem ver todos os clientes"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clientes podem ver seus próprios dados" ON clients;
CREATE POLICY "Clientes podem ver seus próprios dados"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.client_id = clients.id
    )
  );

DROP POLICY IF EXISTS "Admins podem inserir clientes" ON clients;
CREATE POLICY "Admins podem inserir clientes"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem atualizar clientes" ON clients;
CREATE POLICY "Admins podem atualizar clientes"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem deletar clientes" ON clients;
CREATE POLICY "Admins podem deletar clientes"
  ON clients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Políticas para a tabela documents
DROP POLICY IF EXISTS "Admins podem ver todos os documentos" ON documents;
CREATE POLICY "Admins podem ver todos os documentos"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clientes podem ver seus documentos" ON documents;
CREATE POLICY "Clientes podem ver seus documentos"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.client_id = documents.client_id
    )
  );

DROP POLICY IF EXISTS "Admins podem inserir documentos" ON documents;
CREATE POLICY "Admins podem inserir documentos"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem atualizar documentos" ON documents;
CREATE POLICY "Admins podem atualizar documentos"
  ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem deletar documentos" ON documents;
CREATE POLICY "Admins podem deletar documentos"
  ON documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Políticas para a tabela user_profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON user_profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON user_profiles;
CREATE POLICY "Admins podem ver todos os perfis"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON user_profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins podem inserir perfis" ON user_profiles;
CREATE POLICY "Admins podem inserir perfis"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- ====================================================
-- 8. CONFIGURAÇÃO DE STORAGE
-- ====================================================
-- Criar bucket para documentos (execute no dashboard do Supabase)
-- Navegue até Storage > Create a new bucket
-- Nome: documents
-- Public: false (privado)

-- Políticas de Storage para o bucket 'documents'
-- Execute estas políticas no SQL Editor do Supabase após criar o bucket:

-- Permitir admins fazer upload
-- CREATE POLICY "Admins podem fazer upload de documentos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'documents' AND
--   EXISTS (
--     SELECT 1 FROM user_profiles
--     WHERE user_profiles.id = auth.uid()
--     AND user_profiles.role = 'admin'
--   )
-- );

-- Permitir admins visualizar documentos
-- CREATE POLICY "Admins podem visualizar todos os documentos"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'documents' AND
--   EXISTS (
--     SELECT 1 FROM user_profiles
--     WHERE user_profiles.id = auth.uid()
--     AND user_profiles.role = 'admin'
--   )
-- );

-- Permitir clientes visualizar apenas seus documentos
-- CREATE POLICY "Clientes podem visualizar seus documentos"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'documents' AND
--   EXISTS (
--     SELECT 1 FROM user_profiles up
--     JOIN documents d ON d.client_id = up.client_id
--     WHERE up.id = auth.uid()
--     AND (storage.foldername(name))[1] = d.client_id::text
--   )
-- );

-- Permitir admins deletar documentos
-- CREATE POLICY "Admins podem deletar documentos"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'documents' AND
--   EXISTS (
--     SELECT 1 FROM user_profiles
--     WHERE user_profiles.id = auth.uid()
--     AND user_profiles.role = 'admin'
--   )
-- );

-- ====================================================
-- 9. FUNÇÃO PARA CRIAR USER_PROFILE AUTOMATICAMENTE
-- ====================================================
-- Esta função cria automaticamente um perfil quando um novo usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para chamar a função quando um novo usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ====================================================
-- 10. DADOS DE EXEMPLO (OPCIONAL)
-- ====================================================
-- Descomente para inserir dados de exemplo

-- Cliente de exemplo
-- INSERT INTO clients (cnpj, name, password, email, maintenance_date, is_blocked)
-- VALUES 
--   ('12.345.678/0001-90', 'Empresa Exemplo Ltda', '$2a$10$exemplo_hash', 'contato@exemplo.com', NOW() + INTERVAL '30 days', false);

-- ====================================================
-- 11. VERIFICAÇÃO FINAL
-- ====================================================
-- Execute esta query para verificar se tudo foi criado corretamente
SELECT 
  table_name,
  table_type
FROM 
  information_schema.tables
WHERE 
  table_schema = 'public'
  AND table_name IN ('clients', 'documents', 'user_profiles')
ORDER BY 
  table_name;

-- ====================================================
-- INSTRUÇÕES PARA USO
-- ====================================================
-- 1. Copie todo este script
-- 2. No Supabase Dashboard, vá para SQL Editor
-- 3. Cole e execute este script
-- 4. Crie o bucket 'documents' em Storage
-- 5. Execute as políticas de storage comentadas na seção 8
-- 6. Crie seu primeiro usuário admin através do código ou manualmente

-- Para criar um admin manualmente após o primeiro usuário se registrar:
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'seu-email-admin@exemplo.com';

-- ====================================================
-- FIM DO SCRIPT
-- ====================================================

