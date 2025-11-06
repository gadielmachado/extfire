# 🧪 Guia de Teste - Correção de Visualização de Documentos

## 📋 Resumo da Correção Implementada

O problema foi corrigido através de 3 mudanças principais:

1. **Script SQL (`fix_user_metadata.sql`)** - Sincroniza metadados do auth.users com user_profiles
2. **Função sync_user_profile melhorada** - Mantém metadados sempre atualizados
3. **AuthContext.tsx atualizado** - Busca client_id do user_profiles após login

---

## 🔧 Passo 1: Executar Script SQL no Supabase

### 1.1 Acessar SQL Editor
1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor** (ícone de código na barra lateral)
3. Clique em **New query**

### 1.2 Executar o Script
1. Abra o arquivo **`fix_user_metadata.sql`** no seu editor
2. Copie **todo o conteúdo** do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)

### 1.3 Verificar Resultados

Você verá várias mensagens no console. Procure por:

✅ **Mensagens Esperadas:**
```
✅ Metadados atualizados para 1 usuário(s)
✅ Metadados sincronizados para gadielmachado01@gmail.com
   User ID: b731a5fd-9477-4764-902c-43616...
   Client ID: d05a7985-2374-41f1-9373-5147c9c9f4e1
```

E três tabelas de verificação:

**Tabela 1: Verificação de Sincronização**
| email | nome | role | status |
|-------|------|------|--------|
| gadielmachado01@gmail.com | Nova Política | client | ✅ SINCRONIZADO |

**Tabela 2: Detalhes do Usuário**
Verifique que o `metadata_client_id` está igual ao `profile_client_id`

---

## 🧪 Passo 2: Testar na Aplicação

### 2.1 Preparação
1. Se estiver logado, faça **logout**
2. Feche **todas as abas** do navegador
3. Abra o **Console do Navegador** (F12)
4. Vá na aba **Console**

### 2.2 Teste de Login

1. Abra a aplicação em `localhost:3000`
2. Faça login com:
   - Email: **gadielmachado01@gmail.com**
   - Senha: **200105** (ou a senha que você definiu)

3. **Verifique os logs no console:**

```
Sincronizando user_profile para gadielmachado01@gmail.com...
✅ Cliente encontrado no banco: d05a7985-2374-41f1-9373-5147c9c9f4e1
✅ User_profile sincronizado com sucesso para gadielmachado01@gmail.com
✅ Dados do user_profile carregados: { clientId: "d05a7985-2374-...", role: "client", name: "Nova Política" }
✅ ClientId atualizado do user_profile: d05a7985-2374-41f1-9373-5147c9c9f4e1
👤 Usuário autenticado: { email: "gadielmachado01@gmail.com", role: "client", clientId: "d05a7985-2374-...", source: "user_profile" }
```

4. **O que você deve ver na tela:**
   - ✅ Nome do cliente "Nova Política" deve aparecer
   - ✅ Lista de documentos deve aparecer (se houver documentos)

❌ **Se aparecer "Nenhum cliente selecionado":**
- Veja os logs no console
- Verifique se `clientId` está presente no log `👤 Usuário autenticado`
- Se não estiver, volte ao Passo 1 e execute o script SQL novamente

### 2.3 Teste de Visualização de Documentos

1. Com o cliente logado, vá para o dashboard
2. **Verifique no console:**

```
Carregando clientes do Supabase (fonte primária de dados)...
✅ 1 cliente(s) carregado(s) do Supabase
✅ X documento(s) carregado(s)
  📄 Cliente "Nova Política" (d05a7985-...): X documento(s)
```

3. **O que você deve ver:**
   - ✅ Documentos existentes aparecem na lista
   - ✅ Nome do arquivo, tipo, tamanho e data

❌ **Se não aparecer nenhum documento:**
- Verifique se há documentos na tabela `documents` do Supabase
- Filtre por `client_id = d05a7985-2374-41f1-9373-5147c9c9f4e1`
- Se houver documentos mas não aparecem, volte ao Passo 1

### 2.4 Teste de Upload

1. Clique no botão **"Upload"**
2. Selecione um arquivo de teste (ex: PDF pequeno)
3. Clique em **"Upload"**

4. **Verifique os logs:**

```
📤 Tentando adicionar documento para o cliente d05a7985-...
👤 Usuário atual: { isAdmin: false, clientId: "d05a7985-...", email: "gadielmachado01@gmail.com" }
✅ Documento salvo no Supabase: { id: "...", name: "..." }
🔄 Forçando recarregamento completo dos dados do Supabase...
📄 Recarregando documentos do cliente d05a7985-...
✅ 1 documento(s) recarregado(s)
```

5. **O que você deve ver:**
   - ✅ Arquivo aparece imediatamente na lista após upload
   - ✅ Toast de sucesso: "Documento 'nome.pdf' adicionado com sucesso!"

### 2.5 Teste de Persistência (Refresh)

1. Com o documento recém-adicionado visível na tela
2. Pressione **F5** para recarregar a página
3. Aguarde o carregamento

4. **Verifique os logs:**

```
👤 Sessão existente carregada: { email: "gadielmachado01@gmail.com", role: "client", clientId: "d05a7985-...", source: "user_profile" }
Carregando clientes do Supabase (fonte primária de dados)...
✅ 1 cliente(s) carregado(s) do Supabase
✅ X documento(s) carregado(s)
```

5. **O que você deve ver:**
   - ✅ Documentos **continuam aparecendo** após o refresh
   - ✅ Nenhum documento desapareceu

---

## 👨‍💼 Passo 3: Testar Visualização do Admin

### 3.1 Login como Admin
1. Faça logout do cliente
2. Faça login como admin:
   - Email: **gadyel.bm@gmail.com** (ou outro admin)
   - Senha: **200105@Ga**

### 3.2 Selecionar Cliente
1. Na sidebar, procure por "Nova Política"
2. Clique no cliente

### 3.3 Verificar Documentos
- ✅ Admin deve ver **os mesmos documentos** que o cliente vê
- ✅ Admin deve conseguir fazer download dos documentos
- ✅ Admin deve conseguir fazer upload de novos documentos

---

## ✅ Checklist Final

Marque cada item após testar:

### Configuração
- [ ] Script SQL executado com sucesso no Supabase
- [ ] Tabelas de verificação mostram status "✅ SINCRONIZADO"
- [ ] Nenhum erro no SQL Editor

### Cliente - Login
- [ ] Login bem-sucedido
- [ ] Logs mostram `clientId` correto
- [ ] Logs mostram `source: "user_profile"`
- [ ] Nome do cliente aparece corretamente

### Cliente - Visualização
- [ ] Documentos existentes aparecem na lista
- [ ] Informações dos documentos estão corretas (nome, tipo, tamanho)
- [ ] Nenhum erro no console

### Cliente - Upload
- [ ] Upload de arquivo funciona
- [ ] Arquivo aparece imediatamente após upload
- [ ] Toast de sucesso aparece
- [ ] Logs mostram documento salvo no Supabase

### Cliente - Persistência
- [ ] Após F5, documentos continuam aparecendo
- [ ] Nenhum documento desaparece
- [ ] Cliente continua logado (sessão mantida)

### Admin - Visualização
- [ ] Admin consegue selecionar o cliente
- [ ] Admin vê os mesmos documentos que o cliente
- [ ] Admin consegue fazer download
- [ ] Admin consegue fazer upload

---

## 🐛 Troubleshooting

### Problema: "Nenhum cliente selecionado" após login

**Causa:** `clientId` não está sendo carregado

**Solução:**
1. Verifique o console: procure por `👤 Usuário autenticado`
2. Se `clientId` for `null`, execute o script SQL novamente
3. Verifique a tabela `user_profiles` no Supabase:
   - Email: gadielmachado01@gmail.com
   - client_id deve ser: d05a7985-2374-41f1-9373-5147c9c9f4e1

### Problema: Documentos não aparecem

**Causa:** Políticas RLS ou client_id incorreto

**Solução:**
1. Abra a tabela `documents` no Supabase
2. Filtre por `client_id = d05a7985-2374-41f1-9373-5147c9c9f4e1`
3. Se houver documentos, execute o script `fix_user_metadata.sql` novamente
4. Se não houver documentos, faça upload de um arquivo de teste como admin

### Problema: Upload falha com erro de permissão

**Causa:** Políticas RLS não permitem cliente fazer upload

**Solução:**
1. Execute o script `fix_client_upload.sql` (do diretório raiz)
2. Verifique as políticas da tabela `documents` no Supabase
3. Deve existir: "Admins e clientes podem inserir documentos"

### Problema: Documento desaparece após F5

**Causa:** Metadados não estão sincronizados

**Solução:**
1. Execute o script `fix_user_metadata.sql` novamente
2. Faça logout e login novamente
3. Verifique os logs: deve mostrar `source: "user_profile"`

---

## 📊 Queries SQL Úteis para Debugging

### Verificar user_profiles
```sql
SELECT 
  id,
  email,
  name,
  role,
  client_id
FROM user_profiles
WHERE email = 'gadielmachado01@gmail.com';
```

### Verificar metadados do auth.users
```sql
SELECT 
  id,
  email,
  raw_user_meta_data->>'clientId' as metadata_client_id,
  raw_user_meta_data->>'role' as metadata_role,
  raw_user_meta_data
FROM auth.users
WHERE email = 'gadielmachado01@gmail.com';
```

### Verificar documentos do cliente
```sql
SELECT 
  id,
  name,
  type,
  size,
  client_id,
  upload_date
FROM documents
WHERE client_id = 'd05a7985-2374-41f1-9373-5147c9c9f4e1'
ORDER BY upload_date DESC;
```

### Verificar sincronização completa
```sql
SELECT 
  up.email,
  up.client_id as profile_client_id,
  (u.raw_user_meta_data->>'clientId')::uuid as metadata_client_id,
  CASE 
    WHEN up.client_id = (u.raw_user_meta_data->>'clientId')::uuid THEN '✅ OK'
    ELSE '❌ ERRO'
  END as status
FROM user_profiles up
JOIN auth.users u ON u.id = up.id
WHERE up.email = 'gadielmachado01@gmail.com';
```

---

## 📝 Notas Importantes

1. **Sempre execute o script SQL primeiro** antes de testar na aplicação
2. **Faça logout/login** após executar o script para recarregar os dados
3. **Verifique os logs do console** em cada etapa
4. **Use o SQL Editor** do Supabase para verificar os dados diretamente
5. **Não pule etapas** - cada teste depende do anterior

---

## 🎯 Resultado Esperado Final

Após completar todos os testes:

✅ Cliente faz login → Dashboard aparece com seu nome  
✅ Cliente vê documentos → Lista completa de arquivos  
✅ Cliente faz upload → Arquivo aparece imediatamente  
✅ Cliente atualiza página (F5) → Arquivos continuam visíveis  
✅ Admin seleciona cliente → Vê os mesmos documentos  
✅ Sistema totalmente funcional e sincronizado  

---

**Data de Criação:** 06/11/2025  
**Arquivos Modificados:**  
- `fix_user_metadata.sql` (NOVO)
- `src/contexts/AuthContext.tsx`
- Função `sync_user_profile` no banco de dados

**Problema Resolvido:** Cliente não conseguia ver documentos após upload devido à dessincronização entre `user_profiles.client_id` e `auth.users.raw_user_meta_data.clientId`

