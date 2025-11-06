# 🔧 Instruções para Correção dos Problemas

## 📋 Problemas Identificados

1. ❌ **Erro de Foreign Key Constraint**: User_profiles tentando salvar com `client_id` inexistente
2. ❌ **Documentos não visíveis**: Documentos salvos com `client_id` incorreto
3. ⚠️ **Timeout ao buscar user_profile**: Consultas lentas causando timeouts

## ✅ Correções Implementadas

### 1. Função SQL `sync_user_profile` Corrigida
**Arquivo**: `database_setup_final.sql`

A função foi atualizada para:
- ✅ Validar se o `client_id` existe antes de salvar
- ✅ Usar NULL se o `client_id` for inválido
- ✅ Registrar avisos quando encontrar inconsistências

### 2. Otimização da Consulta user_profile
**Arquivo**: `src/contexts/AuthContext.tsx`

Melhorias:
- ✅ Timeout aumentado de 3s para 5s
- ✅ Uso de `.maybeSingle()` ao invés de `.single()`
- ✅ Melhor tratamento de erros e logs

### 3. Script de Diagnóstico e Correção
**Arquivo**: `corrigir_dados_inconsistentes.sql`

Este script:
- 🔍 Identifica user_profiles com `client_id` inválido
- 🔍 Identifica clientes sem user_profile correspondente
- 🔍 Identifica user_profiles sem `client_id` que deveriam ter
- 🔍 Identifica documentos órfãos
- 🔧 Corrige automaticamente as inconsistências encontradas

## 📝 Passo a Passo para Aplicar as Correções

### Passo 1: Atualizar a Função sync_user_profile

1. Acesse o **Supabase Dashboard** do seu projeto
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **New Query**
4. Copie **APENAS** a função `sync_user_profile` atualizada do arquivo `database_setup_final.sql`
   - Procure por "-- Função para sincronizar user_profile (com validação de client_id)"
   - Copie desde `CREATE OR REPLACE FUNCTION` até o final da função (incluindo `$$ LANGUAGE plpgsql SECURITY DEFINER;`)
5. Cole no editor SQL do Supabase
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Verifique se apareceu a mensagem de sucesso

### Passo 2: Executar Script de Diagnóstico e Correção

1. No **SQL Editor** do Supabase
2. Abra uma **Nova Query**
3. Copie **TODO** o conteúdo do arquivo `corrigir_dados_inconsistentes.sql`
4. Cole no editor
5. Clique em **Run**
6. Aguarde a execução (pode levar alguns segundos)
7. **Leia os resultados**:
   - Verifique quantos registros foram corrigidos
   - Anote os IDs que foram atualizados
   - Verifique a seção "VERIFICAÇÃO PÓS-CORREÇÃO"

### Passo 3: Recarregar a Aplicação

1. Se a aplicação estiver rodando, **pare o servidor** (Ctrl+C no terminal)
2. Limpe o cache do navegador:
   - Pressione **F12** para abrir DevTools
   - Clique com botão direito no ícone de **Reload**
   - Selecione "**Empty Cache and Hard Reload**"
3. Inicie o servidor novamente:
   ```bash
   npm run dev
   ```
4. Faça **logout** se estiver logado
5. Faça **login** novamente

### Passo 4: Testar as Correções

#### Teste 1: Login sem Erros
1. Faça login como cliente (email: gadielbizerramachado@gmail.com)
2. Verifique no console do navegador (F12):
   - ✅ NÃO deve aparecer erro de foreign key constraint
   - ✅ NÃO deve aparecer timeout ao buscar user_profile
   - ✅ Deve mostrar "✅ Dados do user_profile carregados"

#### Teste 2: Visualização de Documentos
1. Faça logout
2. Faça login como **admin**
3. Selecione um cliente
4. Faça upload de um documento
5. Faça logout
6. Faça login como o **cliente** correspondente
7. Verifique se o documento aparece na lista
8. ✅ O documento deve estar visível

#### Teste 3: Verificar Associação Correta
1. No console do navegador (F12), verifique os logs:
   ```
   📄 [CLIENTE] Documentos retornados: X (onde X > 0)
   ```
2. NÃO deve aparecer:
   ```
   📄 [CLIENTE] Documentos retornados: 0
   🔬 [DEBUG] Total de documentos no banco: 1
   ```

## 🔍 Verificações Adicionais no Supabase

### Verificar User_Profiles
Execute no SQL Editor:
```sql
SELECT 
  id,
  email,
  name,
  role,
  client_id,
  cnpj
FROM public.user_profiles
WHERE role = 'client'
ORDER BY created_at DESC;
```

**O que verificar**:
- Clientes devem ter `client_id` preenchido
- O `client_id` deve corresponder a um cliente real na tabela `clients`

### Verificar Clientes
Execute no SQL Editor:
```sql
SELECT 
  id,
  email,
  name,
  cnpj
FROM public.clients
ORDER BY created_at DESC;
```

### Verificar Documentos
Execute no SQL Editor:
```sql
SELECT 
  d.id,
  d.name,
  d.client_id,
  c.name as client_name,
  c.email as client_email
FROM public.documents d
LEFT JOIN public.clients c ON d.client_id = c.id
ORDER BY d.upload_date DESC;
```

**O que verificar**:
- Cada documento deve ter um `client_name` e `client_email` (não deve ser NULL)
- Se houver documentos com `client_name` NULL, significa que são órfãos

## ❗ Resolução de Problemas

### Problema: Ainda aparece erro de foreign key constraint
**Solução**:
1. Execute novamente o script `corrigir_dados_inconsistentes.sql`
2. Verifique se existem clientes com IDs inconsistentes
3. Entre em contato se o problema persistir

### Problema: Documentos ainda não aparecem para o cliente
**Solução**:
1. Verifique no Supabase qual é o `client_id` do documento
2. Verifique qual é o `client_id` do user_profile do cliente
3. Se forem diferentes, execute:
   ```sql
   -- Substituir os IDs corretos
   UPDATE public.documents
   SET client_id = 'ID_CORRETO_DO_CLIENTE'
   WHERE client_id = 'ID_INCORRETO';
   ```

### Problema: Timeout ao buscar user_profile
**Solução**:
1. Verifique a conexão com o Supabase
2. Verifique se as políticas RLS estão corretas
3. Tente fazer logout e login novamente

## 📊 Logs de Sucesso Esperados

Após as correções, você deve ver no console:

```
🔍 Buscando user_profile para: gadielbizerramachado@gmail.com
✅ Dados do user_profile carregados: {clientId: 'xxx-xxx', role: 'client', name: 'Nome Cliente'}
👤 Usuário autenticado: {email: 'gadielbizerramachado@gmail.com', role: 'client', clientId: 'xxx-xxx', source: 'user_profile'}
✅ User_profile sincronizado com sucesso para gadielbizerramachado@gmail.com
🔍 [CLIENTE] Buscando documentos do cliente: {clientId: 'xxx-xxx', email: '...', isAdmin: false}
📄 [CLIENTE] Documentos retornados: 1 (ou mais)
✅ 1 cliente(s) carregado(s) do Supabase
✅ 1 documento(s) carregado(s)
```

## 📞 Suporte

Se após seguir todos os passos o problema persistir:
1. Capture um print da tela dos logs do console (F12)
2. Execute as queries de verificação no Supabase e capture os resultados
3. Anote os passos exatos que causam o problema
4. Entre em contato com os detalhes acima

## ℹ️ Avisos que Podem Ser Ignorados

### React DevTools
```
Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
```
**O que é**: Recomendação para instalar a extensão React DevTools no navegador.  
**Ação**: Opcional. Isso não afeta o funcionamento da aplicação. Você pode instalar a extensão para facilitar o desenvolvimento, mas não é necessário.

---

**Data**: 06/11/2025
**Versão**: 1.0

