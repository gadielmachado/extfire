# 🔧 Correção Implementada: Upload e Exclusão de Documentos

## 📌 Problemas Resolvidos

### ✅ Problema 1: Documentos desaparecem ao atualizar a página (Cliente)
**Sintoma**: Cliente vê arquivos na primeira visualização, mas ao pressionar F5 (atualizar), os documentos desaparecem.

**Causa Raiz**:
- Políticas RLS inconsistentes entre Storage (`raw_user_meta_data`) e tabelas (`user_profiles`)
- Tabela `user_profiles` não sincronizada com `auth.users`
- Campo `client_id` em `user_profiles` estava NULL para clientes

**Solução**:
- ✅ Criada função `sync_user_profile()` que sincroniza automaticamente
- ✅ Trigger para atualizar `user_profiles` quando metadados mudam
- ✅ Políticas RLS unificadas usando funções `is_admin()` e `get_user_client_id()`
- ✅ Sincronização automática no login via `AuthContext`

---

### ✅ Problema 2: Arquivos excluídos reaparecem ao atualizar
**Sintoma**: Admin exclui arquivo, mas ao atualizar a página (F5), o arquivo volta a aparecer.

**Causa Raiz**:
- `ClientDetails.tsx` usava `updateClient()` ao invés de `removeDocument()`
- Isso atualizava apenas o estado local, não deletava do banco `documents`
- Ao recarregar, buscava do Supabase e o registro ainda existia

**Solução**:
- ✅ Corrigido `handleDeleteConfirm()` para usar `removeDocument()` do contexto
- ✅ `removeDocument()` agora deleta tanto do Storage quanto da tabela `documents`
- ✅ Forçado reload do Supabase após exclusão para garantir consistência

---

## 📁 Arquivos Criados

### 1. `fix_user_profiles_sync.sql`
**Funções criadas**:
- `sync_user_profile()` - Sincroniza ou cria user_profile
- `handle_new_user()` - Trigger para novos usuários
- `handle_user_metadata_update()` - Trigger para mudanças em metadados
- `sync_client_user_profile()` - Trigger quando cliente é criado/atualizado
- `sync_all_user_profiles()` - Sincroniza todos os usuários existentes

**O que faz**:
- Garante que todo usuário tenha registro em `user_profiles`
- Sincroniza automaticamente `client_id` para clientes
- Mantém `user_profiles` sempre atualizado com `auth.users`

---

### 2. `fix_rls_policies_v2.sql`
**Funções criadas**:
- `get_user_client_id()` - Busca client_id de forma unificada
- `is_admin()` - Verifica se usuário é admin (múltiplas fontes)
- `has_client_access()` - Verifica se usuário tem acesso a um cliente

**Políticas RLS atualizadas**:
- `clients` - 4 políticas (SELECT, INSERT, UPDATE, DELETE)
- `documents` - 4 políticas (SELECT, INSERT, UPDATE, DELETE)
- `user_profiles` - 4 políticas (SELECT, INSERT, UPDATE, DELETE)

**O que faz**:
- Unifica verificação de permissões
- Evita inconsistências entre `user_profiles` e `raw_user_meta_data`
- Garante que clientes só vejam seus dados e admins vejam tudo

---

### 3. `fix_storage_policies_v2.sql`
**Políticas de Storage criadas**:
- Upload: Apenas admins
- Visualização: Admins veem tudo, clientes veem só seus arquivos
- Atualização: Apenas admins
- Exclusão: Apenas admins

**O que faz**:
- Usa as mesmas funções (`is_admin`, `get_user_client_id`) das políticas de tabelas
- Garante consistência entre Storage e banco de dados
- Valida que caminho do arquivo corresponde ao `client_id` do usuário

---

### 4. `GUIA_TESTES_UPLOAD_EXCLUSAO.md`
Guia completo para validação com:
- 5 cenários de teste detalhados
- Queries SQL para troubleshooting
- Checklist de validação final

---

## 🔄 Arquivos Modificados

### 1. `src/components/ClientDetails.tsx`
**Alterações**:
```typescript
// ANTES (INCORRETO)
const updatedDocuments = client.documents.filter(doc => doc.id !== id);
updateClient({
  ...client,
  documents: updatedDocuments
});

// DEPOIS (CORRETO)
await removeDocument(client.id, id);
```

**Resultado**: Exclusão agora remove do banco, não apenas do estado local.

---

### 2. `src/contexts/AuthContext.tsx`
**Alterações**:
- Adicionado bloco de sincronização após login bem-sucedido
- Chama `supabase.rpc('sync_user_profile', {...})` via RPC
- Tenta encontrar `client_id` se não estiver nos metadados

**Resultado**: `user_profiles` sempre sincronizado após cada login.

---

### 3. `src/contexts/ClientContext.tsx`
**Alterações**:
- Criada função `reloadClientDocuments(clientId)`
- `addDocument()` agora força reload após inserir
- `removeDocument()` agora força reload após deletar

**Resultado**: Estado local sempre reflete o banco de dados real.

---

## 🎯 Como Aplicar as Correções

### Passo 1: Executar Scripts SQL (em ordem)
```bash
# No Supabase Dashboard → SQL Editor

1. fix_user_profiles_sync.sql
2. fix_rls_policies_v2.sql
3. fix_storage_policies_v2.sql
```

### Passo 2: Código Frontend (já aplicado)
Os arquivos TypeScript já foram modificados:
- ✅ `ClientDetails.tsx`
- ✅ `AuthContext.tsx`
- ✅ `ClientContext.tsx`

### Passo 3: Testar
Siga o guia: `GUIA_TESTES_UPLOAD_EXCLUSAO.md`

---

## 🧪 Validação Rápida

Execute no SQL Editor do Supabase:

```sql
-- Verificar se funções foram criadas
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'sync_user_profile',
    'is_admin', 
    'get_user_client_id'
  );
-- Deve retornar 3 linhas

-- Verificar se user_profiles está sincronizado
SELECT 
  up.email,
  up.role,
  up.client_id IS NOT NULL as has_client_id,
  c.name as client_name
FROM user_profiles up
LEFT JOIN clients c ON c.id = up.client_id
ORDER BY up.created_at DESC;
-- Clientes devem ter client_id preenchido

-- Verificar políticas de Storage
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
-- Deve retornar pelo menos 4 políticas
```

---

## 📊 Antes vs Depois

| Aspecto | ❌ Antes | ✅ Depois |
|---------|---------|-----------|
| **Upload por Admin** | Aparece para admin, mas cliente não vê após F5 | Cliente vê e persiste após F5 |
| **Exclusão** | Arquivo reaparece ao atualizar | Arquivo permanece excluído |
| **Políticas RLS** | Inconsistentes (2 fontes) | Unificadas (1 fonte) |
| **user_profiles** | Não sincronizado | Auto-sincronizado |
| **Reload após operações** | Não havia | Forçado após add/remove |

---

## 🔐 Segurança

As correções mantêm e melhoram a segurança:

- ✅ Clientes só veem seus próprios documentos
- ✅ Apenas admins podem fazer upload
- ✅ Apenas admins podem excluir
- ✅ RLS aplicado em todas as tabelas e Storage
- ✅ Verificação dupla (email + role + client_id)

---

## 🚀 Próximos Passos

1. **Executar os 3 scripts SQL** no Supabase (já estão criados)
2. **Testar no ambiente de desenvolvimento** usando o guia de testes
3. **Fazer deploy para produção** se testes passarem
4. **Monitorar logs** nas primeiras 24h após deploy

---

## 📝 Notas Técnicas

### Por que reload forçado?
O problema era que o estado local (React) ficava desincronizado com o banco. Forçar reload garante que sempre mostre a verdade do banco de dados.

### Por que user_profiles?
As políticas RLS das tabelas usam `user_profiles`, mas o Storage usava `raw_user_meta_data`. Isso criava inconsistência. Agora ambos checam as duas fontes via funções unificadas.

### Por que removeDocument() e não updateClient()?
`updateClient()` atualiza a tabela `clients`, mas documentos ficam na tabela `documents`. Apenas remover do array local não deleta do banco. `removeDocument()` faz a exclusão real.

---

**Data**: Novembro 2025  
**Versão**: 2.0  
**Status**: ✅ Implementado e pronto para testes

