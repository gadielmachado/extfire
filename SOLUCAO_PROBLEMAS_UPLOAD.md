# 🔧 Solução para Problemas de Upload e Sincronização

## 📋 Problemas Identificados

Você está enfrentando **3 problemas principais**:

### 1. ❌ Erro 400 no Upload de Arquivos
**Causa:** O caminho do arquivo estava duplicado (`documents/documents/...`)
- O código adicionava `documents/` antes do nome do arquivo
- Mas o bucket já se chama `documents`, resultando em path duplicado

### 2. ❌ Erro 400 ao Sincronizar Clientes
**Causa:** Tentativa de salvar colunas inexistentes na tabela `clients`
- `documents` (array) - não existe na tabela
- `user_role` - não existe na tabela
- `user_email` - não existe na tabela

### 3. ❌ Erro 500 ao Carregar Clientes
**Causa:** Políticas RLS (Row Level Security) muito restritivas ou usuário sem perfil em `user_profiles`

---

## ✅ Correções Aplicadas

### 🔹 Correção 1: Path do Upload (APLICADA AUTOMATICAMENTE)
**Arquivo:** `src/lib/utils.ts`
- **Linha 16-17:** Removido o prefixo `documents/` do caminho do arquivo
- **Antes:** `const filePath = \`documents/\${fileName}\``
- **Depois:** `const filePath = fileName`

### 🔹 Correção 2: Sincronização de Clientes (APLICADA AUTOMATICAMENTE)
**Arquivo:** `src/contexts/ClientContext.tsx`
- **Linhas 54-69:** Removidas as colunas `documents`, `user_role` e `user_email` da sincronização
- **Linhas 354-369:** Corrigida também na função `syncClientWithSupabase`

---

## 🚀 Próximos Passos - IMPORTANTE!

### **Passo 1: Executar o Script SQL no Supabase** ⚠️

1. **Acesse o Supabase Dashboard:**
   - Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecione seu projeto

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **"SQL Editor"**
   - Clique em **"New query"**

3. **Execute o Script de Correção:**
   - Abra o arquivo `fix_database_issues.sql` (na raiz do projeto)
   - Copie TODO o conteúdo do arquivo
   - Cole no SQL Editor do Supabase
   - Clique em **"Run"** (ou pressione Ctrl+Enter)

4. **Verifique o Resultado:**
   - Você deve ver mensagens de sucesso em verde
   - O script irá:
     - ✅ Adicionar colunas `user_role` e `user_email` (opcionais)
     - ✅ Verificar/criar o bucket `documents`
     - ✅ Configurar políticas RLS do storage
     - ✅ Melhorar políticas RLS da tabela `clients`

### **Passo 2: Recarregar a Aplicação**

1. **Parar o servidor de desenvolvimento** (se estiver rodando):
   ```bash
   Ctrl + C
   ```

2. **Iniciar novamente:**
   ```bash
   npm run dev
   ```
   ou
   ```bash
   bun run dev
   ```

### **Passo 3: Fazer Login Novamente**

1. Faça logout da aplicação
2. Faça login novamente para renovar o token de autenticação
3. Isso garante que as novas permissões sejam aplicadas

### **Passo 4: Testar o Upload**

1. Acesse a área de documentos de um cliente
2. Tente fazer upload de um arquivo PDF, Word ou Doc
3. O upload agora deve funcionar corretamente! ✅

---

## 🔍 Verificação de Problemas

Se ainda houver problemas após executar os passos acima, verifique:

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
3. ✅ **fix_database_issues.sql** - Novo script de correção SQL
4. ✅ **SOLUCAO_PROBLEMAS_UPLOAD.md** - Este documento

### O que NÃO foi alterado:

- ✓ Estrutura das tabelas principais
- ✓ Lógica de autenticação
- ✓ Componentes da interface
- ✓ Arquivos de configuração

---

## 🆘 Suporte

Se após seguir todos os passos o problema persistir:

1. **Verifique o console do navegador** (F12) para ver os erros exatos
2. **Verifique os logs do Supabase** em "Logs > Postgres Logs"
3. **Compartilhe os erros** para análise mais detalhada

### Erros Comuns:

- **"new row violates row-level security policy"** → Execute o script SQL novamente
- **"permission denied for table clients"** → Usuário sem perfil em `user_profiles`
- **"duplicate key value violates unique constraint"** → Tente usar outro CNPJ ou email
- **"bucket not found"** → Execute a parte do script que cria o bucket

---

## ✨ Resultado Esperado

Após aplicar todas as correções:

- ✅ Upload de PDF, Word, Docs funcionando
- ✅ Sincronização de clientes sem erros 400
- ✅ Carregamento de clientes sem erros 500
- ✅ Interface responsiva e sem warnings

---

**Data da Correção:** 05/11/2025
**Versão:** ExtFire v1.0

