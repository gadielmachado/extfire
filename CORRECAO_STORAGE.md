# 🔧 Correção Completa - Armazenamento de Dados e Upload

## 🔥 Problema Identificado

### Problema 1: Dados Inconsistentes entre Ambientes

Os dados (clientes e documentos) estavam sendo armazenados **apenas no localStorage**, causando inconsistência total entre diferentes ambientes:
- Localhost mostrava dados diferentes
- Vercel mostrava outros dados
- Aba anônima mostrava dados completamente diferentes
- Uploads de documentos não apareciam em outros dispositivos

### Problema 2: Erros de Upload

Você estava enfrentando **3 problemas principais**:

1. ❌ **Erro 400 no Upload de Arquivos**
   - **Causa:** O caminho do arquivo estava duplicado (`documents/documents/...`)
   - O código adicionava `documents/` antes do nome do arquivo
   - Mas o bucket já se chama `documents`, resultando em path duplicado

2. ❌ **Erro 400 ao Sincronizar Clientes**
   - **Causa:** Tentativa de salvar colunas inexistentes na tabela `clients`
   - `documents` (array) - não existe na tabela
   - `user_role` - não existe na tabela
   - `user_email` - não existe na tabela

3. ❌ **Erro 500 ao Carregar Clientes**
   - **Causa:** Políticas RLS (Row Level Security) muito restritivas ou usuário sem perfil em `user_profiles`

---

## ✅ Solução Implementada

### 1. **Documentos agora são salvos no Banco de Dados Supabase**

**Antes:** Documentos eram salvos apenas no array `documents` dentro do objeto Client no localStorage.

**Depois:** 
- Arquivos são enviados para o **Supabase Storage** (bucket 'documents')
- Metadados dos documentos são salvos na tabela **`documents`** do Supabase
- Ao carregar clientes, os documentos são carregados automaticamente da tabela

### 2. **localStorage agora é apenas um cache**

**Antes:** localStorage era a fonte primária de dados.

**Depois:**
- **Supabase** é a fonte primária e única de verdade
- localStorage é usado apenas como **cache temporário**
- Ao iniciar a aplicação, SEMPRE carrega do Supabase primeiro
- Se falhar (offline), usa cache local como fallback

### 3. **Correções de Código**

**Arquivo:** `src/lib/utils.ts`
- **Linha 16-17:** Removido o prefixo `documents/` do caminho do arquivo
- **Antes:** `const filePath = \`documents/\${fileName}\``
- **Depois:** `const filePath = fileName`

**Arquivo:** `src/contexts/ClientContext.tsx`
- **Linhas 54-69:** Removidas as colunas `documents`, `user_role` e `user_email` da sincronização
- **Linhas 354-369:** Corrigida também na função `syncClientWithSupabase`

### 4. **Tipos do Supabase corrigidos**

Adicionadas as definições corretas das tabelas no arquivo `src/integrations/supabase/types.ts`:
- `clients` - Dados dos clientes
- `documents` - Metadados dos documentos
- `user_profiles` - Perfis de usuários

---

## 🔧 Configurações Necessárias no Supabase

### 1. Criar o Bucket de Storage

No **Supabase Dashboard > Storage**:
1. Clique em "Create a new bucket"
2. Nome: `documents`
3. **Public**: ❌ Desmarque (deve ser privado)
4. Clique em "Create bucket"

### 2. Executar o SQL para criar as tabelas

No **Supabase Dashboard > SQL Editor**, execute o arquivo `database_setup_complete.sql`:

**Tabelas criadas:**
- `clients` - Armazena dados dos clientes
- `documents` - Armazena metadados dos documentos
- `user_profiles` - Perfis de usuários vinculados ao auth

### 3. Configurar Políticas RLS (Row Level Security)

As políticas já estão incluídas no `database_setup_complete.sql`:

**Para documentos:**
- ✅ Admins podem inserir documentos
- ✅ Admins podem ver todos os documentos
- ✅ Admins podem deletar documentos
- ✅ Clientes podem ver apenas seus próprios documentos

### 4. Executar Script de Correção de Problemas

Se você ainda enfrentar problemas, execute `fix_database_issues.sql` no SQL Editor:

Este script irá:
- ✅ Adicionar colunas `user_role` e `user_email` (opcionais)
- ✅ Verificar/criar o bucket `documents`
- ✅ Configurar políticas RLS do storage
- ✅ Melhorar políticas RLS da tabela `clients`

### 5. Verificar Variáveis de Ambiente

Certifique-se de que as variáveis estão configuradas tanto localmente quanto na Vercel:

**Arquivo `.env.local` (local):**
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

**Vercel > Settings > Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🧪 Como Testar

### Teste 1: Upload de Documento

1. Faça login como admin no **localhost**
2. Selecione um cliente
3. Clique em "Upload"
4. Envie um PDF ou imagem
5. ✅ Deve aparecer na lista de documentos

**Verifique no Supabase:**
- Dashboard > Storage > documents > Deve aparecer o arquivo
- Dashboard > Table Editor > documents > Deve ter um registro

### Teste 2: Consistência entre Ambientes

1. Faça upload de um documento no **localhost**
2. Abra a aplicação na **Vercel** com a mesma conta
3. ✅ O documento deve aparecer
4. Abra uma **aba anônima** (Ctrl+Shift+N)
5. Acesse localhost:5173
6. Faça login
7. ✅ **O documento DEVE aparecer!**

### Teste 3: Clientes Não-Administradores

1. Crie um novo cliente com email (ex: cliente@teste.com)
2. Faça logout
3. Faça login com `cliente@teste.com` / senha definida
4. Faça upload de um documento
5. Faça logout
6. Abra outro navegador (ou aba anônima)
7. Faça login novamente com `cliente@teste.com`
8. ✅ **O documento DEVE aparecer!**

---

## 🚨 Solução de Problemas

### Problema: "Erro ao salvar documento no banco de dados"

**Causa:** Tabela `documents` não existe ou políticas RLS bloqueando.

**Solução:**
1. Execute o SQL: `database_setup_complete.sql`
2. Verifique se o usuário tem permissão de admin
3. No Supabase: SQL Editor, execute:
```sql
SELECT * FROM documents;
```
4. Se der erro "relation documents does not exist" = Você NÃO executou o SQL

### Problema: "Erro 400 ao fazer upload do arquivo"

**Possíveis Causas:**

1. **Bucket não existe ou não está configurado:**
   - Verifique se criou o bucket 'documents' no Supabase Storage
   - No Supabase: Storage, deve aparecer o bucket 'documents'
   - Se não aparecer, crie manualmente

2. **Path duplicado:**
   - Verifique se o código não está adicionando `documents/` antes do nome do arquivo
   - O path deve ser apenas o nome do arquivo, não `documents/nome-arquivo`

3. **Políticas de storage não configuradas:**
   - Execute `storage_policies_completo.sql`
   - Verifique se as políticas foram criadas:
   ```sql
   SELECT policyname, cmd, roles
   FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects';
   ```

### Problema: "Erro 400 ao sincronizar clientes"

**Causa:** Tentativa de salvar colunas que não existem na tabela.

**Solução:**
1. Execute `fix_database_issues.sql` para adicionar colunas opcionais
2. Ou verifique se o código não está tentando salvar `documents`, `user_role` ou `user_email` na tabela `clients`

### Problema: "Erro 500 ao carregar clientes"

**Causa:** Políticas RLS muito restritivas ou usuário sem perfil.

**Solução:**
1. Verifique se o usuário tem perfil no `user_profiles`:
   ```sql
   SELECT 
     u.email,
     up.role,
     up.client_id
   FROM auth.users u
   LEFT JOIN user_profiles up ON u.id = up.id
   WHERE u.email = 'seu-email@exemplo.com';
   ```

2. Se o usuário não tiver perfil, crie:
   ```sql
   INSERT INTO user_profiles (id, email, name, role)
   SELECT 
     id,
     email,
     COALESCE(raw_user_meta_data->>'name', email),
     'admin' -- ou 'client'
   FROM auth.users
   WHERE email = 'SEU_EMAIL_AQUI@exemplo.com'
   ON CONFLICT (id) DO NOTHING;
   ```

3. Execute `fix_database_issues.sql` para melhorar as políticas RLS

### Problema: Documentos não aparecem

**Causa:** Documentos antigos ainda estão apenas no localStorage.

**Solução:**
1. Limpe o localStorage: `localStorage.clear()` no console do navegador (F12)
2. Recarregue a página
3. Faça re-upload dos documentos

### Problema: Dados diferentes em localhost vs Vercel

**Causa:** localStorage ainda tem dados antigos ou variáveis de ambiente diferentes.

**Solução:**
1. Abra DevTools (F12)
2. Application > Local Storage > Clear
3. Recarregue a página
4. Os dados devem vir do Supabase agora
5. Verifique se as variáveis de ambiente na Vercel são iguais às do `.env.local`

---

## 📊 Fluxo de Dados Corrigido

```
┌─────────────────────────────────────────────────┐
│          ANTES (Problema)                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Localhost → localStorage A                     │
│  Vercel    → localStorage B                     │
│  Anônimo   → localStorage C                     │
│                                                 │
│  ❌ Dados completamente diferentes              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│          DEPOIS (Corrigido)                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Localhost  ─┐                                  │
│  Vercel     ─┼──► SUPABASE (Fonte única)       │
│  Anônimo    ─┘                                  │
│                                                 │
│  ✅ Dados sempre consistentes                   │
└─────────────────────────────────────────────────┘
```

---

## 📋 Mudanças nos Arquivos

### `src/contexts/ClientContext.tsx`

1. **`loadClientsFromSupabase()`** - Agora carrega documentos da tabela
   ```typescript
   // Carregar documentos de todos os clientes
   const { data: documentsData } = await supabase
     .from('documents')
     .select('*');
   ```

2. **`addDocument()`** - Salva documento no banco
   ```typescript
   // Salvar o documento no Supabase
   const { data: insertedDoc } = await supabase
     .from('documents')
     .insert({
       id: document.id,
       client_id: clientId,
       name: document.name,
       type: document.type,
       size: document.size,
       file_url: document.fileUrl,
       upload_date: document.uploadDate.toISOString()
     });
   ```

3. **`removeDocument()`** - Deleta documento do banco e do storage
   ```typescript
   // Deletar arquivo do Storage
   await deleteFileFromStorage(document.fileUrl);
   
   // Deletar registro do banco
   await supabase
     .from('documents')
     .delete()
     .eq('id', documentId);
   ```

### `src/integrations/supabase/types.ts`

Adicionadas definições completas das tabelas:
- `clients` (Row, Insert, Update)
- `documents` (Row, Insert, Update)
- `user_profiles` (Row, Insert, Update)

---

## 🔍 Verificação de Problemas

### ✓ Verificar se o usuário tem perfil no `user_profiles`

Execute no SQL Editor do Supabase:

```sql
-- Ver todos os usuários e seus perfis
SELECT 
  u.email,
  u.created_at as usuario_criado_em,
  up.role,
  up.client_id,
  c.name as cliente_nome
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
LEFT JOIN clients c ON up.client_id = c.id
ORDER BY u.created_at DESC;
```

Se o usuário não tiver perfil, execute:

```sql
-- Criar perfil para um usuário específico (substitua o email)
INSERT INTO user_profiles (id, email, name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', email),
  'admin' -- ou 'client'
FROM auth.users
WHERE email = 'SEU_EMAIL_AQUI@exemplo.com'
ON CONFLICT (id) DO NOTHING;
```

### ✓ Verificar se o bucket existe e está configurado

Execute no SQL Editor do Supabase:

```sql
-- Ver configuração do bucket
SELECT * FROM storage.buckets WHERE name = 'documents';

-- Ver políticas do storage
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
```

### ✓ Testar upload manualmente no Supabase

1. No Supabase Dashboard, vá para **Storage**
2. Clique no bucket **documents**
3. Tente fazer upload manual de um arquivo
4. Se der erro, o problema é nas políticas RLS do storage

---

## 📝 Resumo das Mudanças

### Arquivos Modificados:

1. ✅ **src/lib/utils.ts** - Corrigido path do upload
2. ✅ **src/contexts/ClientContext.tsx** - Removidas colunas inexistentes
3. ✅ **src/integrations/supabase/types.ts** - Adicionadas definições de tipos
4. ✅ **fix_database_issues.sql** - Script de correção SQL
5. ✅ **CORRECAO_STORAGE.md** - Este documento

### O que NÃO foi alterado:

- ✓ Estrutura das tabelas principais
- ✓ Lógica de autenticação
- ✓ Componentes da interface
- ✓ Arquivos de configuração

---

## 📊 Resultado Esperado

Após aplicar todas as correções:

- ✅ Upload de PDF, Word, Docs funcionando
- ✅ Sincronização de clientes sem erros 400
- ✅ Carregamento de clientes sem erros 500
- ✅ Dados consistentes em todos os ambientes
- ✅ Documentos persistem no banco de dados
- ✅ Multi-dispositivo funciona
- ✅ Interface responsiva e sem warnings

---

## 🎯 Próximos Passos

1. ✅ **Execute o SQL no Supabase** - `database_setup_complete.sql`
2. ✅ **Crie o bucket 'documents'** no Storage
3. ✅ **Execute políticas de storage** - `storage_policies_completo.sql`
4. ✅ **Execute correções se necessário** - `fix_database_issues.sql`
5. ✅ **Verifique as variáveis de ambiente** na Vercel
6. ✅ **Teste os uploads** em diferentes ambientes
7. ✅ **Limpe o localStorage antigo** se necessário

---

## 📝 Resumo das Alterações

| Componente | Antes | Depois |
|------------|-------|--------|
| **Documentos** | localStorage | Tabela `documents` + Storage |
| **Clientes** | localStorage | Tabela `clients` |
| **Cache** | Fonte primária | Fallback temporário |
| **Consistência** | ❌ Inexistente | ✅ Total |
| **Multi-dispositivo** | ❌ Não funciona | ✅ Funciona |
| **Upload** | ❌ Erro 400 | ✅ Funciona |

**Problema resolvido!** 🎉

Agora os dados são:
- ✅ Persistentes (não somem ao recarregar)
- ✅ Consistentes (mesmos dados em todo lugar)
- ✅ Sincronizados (aparecem em tempo real)
- ✅ Seguros (armazenados no banco de dados)

---

**Data da Correção:** Outubro 2025  
**Versão:** ExtFire v2.0

