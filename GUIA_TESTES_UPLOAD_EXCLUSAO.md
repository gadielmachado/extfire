# Guia de Testes: Upload e Exclusão de Documentos

## 📋 Pré-requisitos

Antes de iniciar os testes, execute os seguintes scripts SQL no Supabase (nesta ordem):

1. **`fix_user_profiles_sync.sql`** - Sincronização automática de user_profiles
2. **`fix_rls_policies_v2.sql`** - Políticas RLS unificadas  
3. **`fix_storage_policies_v2.sql`** - Políticas de Storage atualizadas

### Como executar os scripts SQL:

1. Acesse o Supabase Dashboard
2. Vá para **SQL Editor**
3. Cole o conteúdo de cada arquivo
4. Execute em ordem (botão "Run" ou Ctrl+Enter)
5. Verifique se não há erros na execução

---

## 🧪 Cenários de Teste

### **TESTE 1: Upload e Visualização (Admin → Cliente)**

**Objetivo**: Verificar se documentos enviados pelo admin aparecem para o cliente

#### Passos:

1. **Login como Admin**
   - Email: `gadyel.bm@gmail.com` (ou outro email admin)
   - Senha: `200105@Ga`

2. **Selecionar Cliente**
   - Na barra lateral, clique em "Empresa #001" (ou outro cliente de teste)
   - Verifique se os dados do cliente são exibidos

3. **Fazer Upload**
   - Clique no botão "Upload" (azul)
   - Selecione um arquivo PDF de teste
   - Clique em "Upload"
   - ✅ Aguarde mensagem: "Documento enviado com sucesso!"

4. **Verificar no Admin**
   - O documento deve aparecer imediatamente na lista
   - Anote o **nome do arquivo** para verificar depois

5. **Logout do Admin**
   - Clique no ícone de seta (logout) no canto inferior esquerdo

6. **Login como Cliente**
   - Email: `gadielbizerramachado@gmail.com` (email do cliente)
   - Senha: senha do cliente

7. **Verificar Documento Aparece**
   - ✅ O documento enviado pelo admin DEVE aparecer na lista
   - Verifique se o nome, tipo e tamanho estão corretos

8. **Atualizar a Página (F5)**
   - Pressione F5 para recarregar a página
   - ✅ **CRÍTICO**: O documento DEVE CONTINUAR VISÍVEL após refresh
   - Se desaparecer, há problema de RLS ou sincronização

9. **Verificar Múltiplas Atualizações**
   - Atualize a página mais 2-3 vezes
   - ✅ O documento deve persistir visível

---

### **TESTE 2: Exclusão de Documentos (Admin)**

**Objetivo**: Verificar se documentos excluídos não reaparecem

#### Passos:

1. **Login como Admin**
   - Email: `gadyel.bm@gmail.com`
   - Senha: `200105@Ga`

2. **Selecionar Cliente com Documentos**
   - Escolha um cliente que tenha pelo menos 1 documento

3. **Excluir Documento**
   - Clique no ícone de **lixeira** (🗑️) ao lado do documento
   - Confirme a exclusão no modal
   - ✅ Aguarde mensagem: "Documento excluído com sucesso!"

4. **Verificar Exclusão Imediata**
   - ✅ O documento deve desaparecer imediatamente da lista

5. **Atualizar a Página (F5)**
   - Pressione F5 para recarregar
   - ✅ **CRÍTICO**: O documento NÃO DEVE REAPARECER
   - Se reaparecer, há problema na exclusão do banco

6. **Verificar no Console do Navegador**
   - Abra DevTools (F12)
   - Console deve mostrar: "Documento deletado do Supabase: [id]"
   - Deve mostrar: "✅ X documento(s) recarregado(s)"

7. **Logout e Login como Cliente**
   - Faça logout do admin
   - Login com o email do cliente
   - ✅ O documento excluído NÃO deve aparecer para o cliente

---

### **TESTE 3: Isolamento de Clientes**

**Objetivo**: Verificar que clientes só veem seus próprios documentos

#### Passos:

1. **Login como Admin**
   - Faça upload de 1 documento para "Empresa #001"
   - Faça upload de 1 documento para outro cliente (se existir)

2. **Login como Cliente 1**
   - Email do Cliente 1
   - ✅ Deve ver APENAS o documento do Cliente 1
   - ✅ NÃO deve ver documentos de outros clientes

3. **Login como Cliente 2**  
   - Email do Cliente 2
   - ✅ Deve ver APENAS o documento do Cliente 2
   - ✅ NÃO deve ver documentos do Cliente 1

---

### **TESTE 4: Sincronização de user_profiles**

**Objetivo**: Verificar se user_profiles está sincronizado corretamente

#### Passos:

1. **Abrir SQL Editor no Supabase**

2. **Executar Query de Verificação**:
   ```sql
   SELECT 
     up.id,
     up.email,
     up.role,
     up.client_id,
     c.name as client_name,
     au.email as auth_email,
     au.raw_user_meta_data->>'clientId' as metadata_client_id
   FROM user_profiles up
   LEFT JOIN clients c ON c.id = up.client_id
   LEFT JOIN auth.users au ON au.id = up.id
   ORDER BY up.created_at DESC;
   ```

3. **Verificar Resultados**:
   - ✅ Todo usuário deve ter registro em `user_profiles`
   - ✅ Clientes devem ter `client_id` preenchido
   - ✅ `client_id` em `user_profiles` deve corresponder a um cliente válido
   - ✅ Admins devem ter `role = 'admin'`

---

### **TESTE 5: Políticas RLS de Storage**

**Objetivo**: Verificar se as políticas de Storage estão funcionando

#### Passos:

1. **Abrir SQL Editor no Supabase**

2. **Executar Query de Verificação**:
   ```sql
   -- Verificar políticas de Storage
   SELECT 
     schemaname,
     tablename,
     policyname,
     cmd as operacao
   FROM pg_policies
   WHERE tablename = 'objects'
     AND schemaname = 'storage'
   ORDER BY policyname;
   ```

3. **Verificar se existem as políticas**:
   - ✅ "Admins podem fazer upload de documentos"
   - ✅ "Admins podem visualizar todos os documentos"
   - ✅ "Admins podem deletar documentos"
   - ✅ "Clientes podem visualizar seus documentos"

4. **Testar upload como Cliente**:
   - Login como cliente (não-admin)
   - Tente fazer upload (deve falhar - apenas admins podem fazer upload)
   - ✅ Deve mostrar erro de permissão

---

## 🐛 Troubleshooting

### Problema: "Documentos desaparecem ao atualizar (Cliente)"

**Causas possíveis**:
1. `user_profiles.client_id` não está preenchido
2. Políticas RLS não permitem acesso

**Solução**:
```sql
-- Verificar client_id do usuário
SELECT 
  id,
  email,
  client_id,
  role
FROM user_profiles
WHERE email = 'EMAIL_DO_CLIENTE';

-- Se client_id estiver NULL, sincronizar manualmente:
SELECT * FROM public.sync_all_user_profiles();
```

---

### Problema: "Documentos excluídos reaparecem"

**Causas possíveis**:
1. Exclusão não está removendo do banco `documents`
2. Cache não está sendo invalidado

**Solução**:
1. Verificar no console do navegador se há erro na exclusão
2. Verificar se a função `removeDocument()` está sendo chamada (não `updateClient()`)
3. Executar no SQL:
   ```sql
   -- Verificar se documento ainda existe no banco
   SELECT * FROM documents WHERE name = 'NOME_DO_ARQUIVO';
   ```

---

### Problema: "Erro de permissão ao fazer upload/exclusão"

**Causas possíveis**:
1. Usuário não é reconhecido como admin
2. Políticas RLS não estão aplicadas

**Solução**:
```sql
-- Verificar se usuário é reconhecido como admin
SELECT 
  auth.uid() as user_id,
  public.is_admin(auth.uid()) as is_admin,
  public.get_user_client_id(auth.uid()) as client_id;

-- Executar quando logado como o usuário com problema
```

---

## ✅ Checklist Final

Após executar todos os testes, verifique:

- [ ] Scripts SQL executados sem erros
- [ ] Admin consegue fazer upload
- [ ] Cliente vê documentos após upload do admin
- [ ] Documentos persistem após atualizar página (cliente)
- [ ] Admin consegue excluir documentos
- [ ] Documentos excluídos não reaparecem após atualizar
- [ ] Clientes só veem seus próprios documentos
- [ ] `user_profiles` está sincronizado com `auth.users`
- [ ] Políticas RLS de Storage estão ativas
- [ ] Console do navegador não mostra erros críticos

---

## 📞 Suporte

Se algum teste falhar:

1. Verifique o console do navegador (F12 → Console)
2. Verifique logs no Supabase Dashboard → Logs
3. Execute as queries de troubleshooting acima
4. Revise se todos os scripts SQL foram executados corretamente

---

**Data de criação**: Novembro 2025  
**Versão**: 2.0 - Correção de Upload e Exclusão

