# 🔄 Guia de Restauração do Banco de Dados Supabase

## 📋 Informações do Novo Projeto

- **URL do Projeto**: `https://dwhbznsijdsiwccamfvd.supabase.co`
- **API Key (anon)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aGJ6bnNpamRzaXdjY2FtZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNzUyMTEsImV4cCI6MjA3NTY1MTIxMX0.WhU7sghKmYJTARkulQmDId8obT_iCcI5xMHKdDdItjg`
- **Project ID**: `dwhbznsijdsiwccamfvd`

## ✅ Status das Atualizações

Os seguintes arquivos já foram atualizados com as novas credenciais:

- ✅ `src/integrations/supabase/client.ts` - URL e API Key atualizadas
- ✅ `supabase/config.toml` - Project ID atualizado
- ⚠️ `src/lib/supabaseAdmin.ts` - URL atualizada, **SERVICE_ROLE_KEY precisa ser configurada**

## 🔐 IMPORTANTE: Service Role Key

⚠️ **ATENÇÃO**: Você precisa adicionar manualmente a `SERVICE_ROLE_KEY` no arquivo `src/lib/supabaseAdmin.ts`.

### Como obter a Service Role Key:

1. Acesse o dashboard do Supabase: https://dwhbznsijdsiwccamfvd.supabase.co
2. Clique em **Settings** (⚙️) no menu lateral
3. Vá para **API**
4. Procure por **service_role** na seção "Project API keys"
5. Copie a chave e substitua `SUA_SERVICE_ROLE_KEY_AQUI` no arquivo `src/lib/supabaseAdmin.ts`

**⚠️ NUNCA COMPARTILHE A SERVICE_ROLE_KEY PUBLICAMENTE!**

## 📝 Passo a Passo para Restaurar o Banco de Dados

### Passo 1: Acessar o SQL Editor

1. Acesse: https://dwhbznsijdsiwccamfvd.supabase.co
2. No menu lateral, clique em **SQL Editor** 
3. Clique em **New Query**

### Passo 2: Executar o Script Principal

1. Abra o arquivo `database_setup_complete.sql` (na raiz do projeto)
2. Copie **TODO** o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)

> ⏱️ O script pode levar alguns segundos para executar completamente.

### Passo 3: Configurar o Storage

1. No menu lateral do Supabase, clique em **Storage**
2. Clique em **Create a new bucket**
3. Configure o bucket:
   - **Name**: `documents`
   - **Public bucket**: ❌ Desmarque (deve ser privado)
   - Clique em **Create bucket**

### Passo 4: Configurar Políticas de Storage

1. Com o bucket `documents` criado, vá para **Policies** (na página do bucket)
2. No SQL Editor, execute as políticas de storage (estão comentadas no arquivo SQL na seção 8)

Ou use este script simplificado:

```sql
-- Políticas de Storage para o bucket 'documents'

-- 1. Admins podem fazer upload
CREATE POLICY "Admins podem fazer upload de documentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- 2. Admins podem visualizar todos os documentos
CREATE POLICY "Admins podem visualizar todos os documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- 3. Admins podem deletar documentos
CREATE POLICY "Admins podem deletar documentos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- 4. Permitir acesso público de leitura (se necessário)
-- Descomente se precisar que clientes acessem sem autenticação
-- CREATE POLICY "Acesso público de leitura"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'documents');
```

### Passo 5: Configurar Autenticação

1. No menu lateral, clique em **Authentication**
2. Vá para **Providers**
3. Habilite **Email** (se ainda não estiver habilitado)
4. Configure as URLs de redirecionamento se necessário

### Passo 6: Criar Primeiro Usuário Admin

Você tem duas opções:

#### Opção A: Registrar via aplicação e depois promover a admin

1. Inicie a aplicação e registre-se normalmente
2. No SQL Editor do Supabase, execute:

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'seu-email@exemplo.com';
```

#### Opção B: Criar diretamente no Supabase

1. Vá para **Authentication** > **Users**
2. Clique em **Add user**
3. Preencha email e senha
4. Após criar, execute no SQL Editor:

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'email-do-usuario@exemplo.com';
```

### Passo 7: Verificar a Instalação

Execute esta query no SQL Editor para verificar se tudo foi criado:

```sql
-- Verificar tabelas
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('clients', 'documents', 'user_profiles')
ORDER BY table_name;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar bucket de storage
SELECT * FROM storage.buckets WHERE name = 'documents';
```

## 🧪 Testando a Aplicação

1. **Instale as dependências** (se ainda não instalou):
   ```bash
   npm install
   ```

2. **Inicie a aplicação**:
   ```bash
   npm run dev
   ```

3. **Acesse** `http://localhost:5173` (ou a porta indicada)

4. **Registre-se** ou faça login com o usuário admin criado

5. **Teste as funcionalidades**:
   - ✅ Login/Logout
   - ✅ Adicionar cliente
   - ✅ Editar cliente
   - ✅ Upload de documentos
   - ✅ Visualizar documentos
   - ✅ Deletar documentos

## 🔍 Estrutura das Tabelas Criadas

### 📊 Tabela: `clients`
```
- id (UUID, Primary Key)
- cnpj (VARCHAR, Unique)
- name (VARCHAR)
- password (VARCHAR)
- email (VARCHAR)
- maintenance_date (TIMESTAMPTZ)
- is_blocked (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### 📄 Tabela: `documents`
```
- id (UUID, Primary Key)
- client_id (UUID, Foreign Key → clients.id)
- name (VARCHAR)
- type (VARCHAR)
- size (VARCHAR)
- file_url (TEXT)
- upload_date (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### 👤 Tabela: `user_profiles`
```
- id (UUID, Primary Key, Foreign Key → auth.users.id)
- cnpj (VARCHAR)
- name (VARCHAR)
- email (VARCHAR)
- role (VARCHAR: 'admin' ou 'client')
- client_id (UUID, Foreign Key → clients.id)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

## 🔒 Segurança (RLS - Row Level Security)

O banco está configurado com políticas de segurança que garantem:

- ✅ **Admins** podem ver, criar, editar e deletar todos os dados
- ✅ **Clientes** podem ver apenas seus próprios dados
- ✅ **Documentos** são restritos por cliente
- ✅ **Storage** protegido com políticas de acesso

## 🐛 Solução de Problemas

### Erro: "relation does not exist"
- Verifique se o script SQL foi executado completamente
- Execute a query de verificação para confirmar as tabelas

### Erro: "permission denied for table"
- Verifique se as políticas RLS foram criadas
- Confirme se o usuário tem role 'admin'

### Erro ao fazer upload de documentos
- Verifique se o bucket 'documents' foi criado
- Confirme se as políticas de storage foram aplicadas

### Erro: "Invalid API key"
- Confirme se as credenciais foram atualizadas corretamente
- Limpe o cache do navegador
- Faça logout e login novamente

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do console do navegador (F12)
2. Verifique os logs do Supabase (Dashboard > Logs)
3. Revise as políticas RLS no SQL Editor
4. Confirme que todas as credenciais estão corretas

## ✨ Recursos do Sistema

- 🔐 Autenticação segura com Supabase Auth
- 👥 Gestão de clientes com CNPJ
- 📄 Upload e gestão de documentos
- 🔒 Controle de acesso baseado em roles (Admin/Client)
- 📅 Controle de manutenção
- 🚫 Sistema de bloqueio de clientes
- 📊 Dashboard administrativo

---

**Última atualização**: 10 de Outubro de 2025
**Projeto**: ExtFire - Sistema de Gestão de Clientes

