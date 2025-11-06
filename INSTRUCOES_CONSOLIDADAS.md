# 📚 DOCUMENTAÇÃO CONSOLIDADA - SISTEMA DE DOCUMENTOS

Este arquivo consolida todas as instruções e documentações relacionadas ao sistema de gerenciamento de documentos.

---

## 📋 ÍNDICE

1. [Instruções para Correção de Visualização](#instrucoes-correcao-visualizacao)
2. [Resolver Problema do Diamond](#resolver-diamond-agora)

---

<a name="instrucoes-correcao-visualizacao"></a>
# 🔧 Instruções para Correção de Visualização de Documentos

## 📋 Problema

Clientes não conseguem visualizar documentos que foram enviados pelo admin através do sistema.

## ✅ Solução Implementada

Foram criados **scripts SQL** para diagnosticar e corrigir o problema:

### 1️⃣ Diagnóstico
Verifica o estado atual das associações entre usuários e clientes.

### 2️⃣ Correção
Corrige as políticas RLS e sincroniza os metadados dos usuários.

### 3️⃣ Verificação
Testa se a correção funcionou e mostra quais clientes têm acesso.

---

## 🚀 Como Executar

### Passo 1: Diagnóstico (Opcional mas Recomendado)

Execute no **SQL Editor** do Supabase o script de diagnóstico.

**O que ele faz:**
- ✓ Lista todos os clientes cadastrados
- ✓ Mostra usuários de autenticação
- ✓ Verifica associações usuário ↔ cliente
- ✓ Testa a função `get_user_client_id()`
- ✓ Mostra documentos por cliente

**Resultado esperado:**
```
📊 ESTATÍSTICAS:
  • Total de clientes: X
  • Clientes com email: Y
  • Clientes sem usuário de autenticação: Z
  • Clientes sem client_id associado: W
```

---

### Passo 2: Aplicar Correção ⚠️ **IMPORTANTE**

**⚠️ ATENÇÃO:** Se você já executou o script anterior e teve erros, use a **VERSÃO 2**.

#### Opção A: Primeira vez executando
Execute o script de correção padrão.

#### Opção B: Se teve erro "policy already exists" ou "permission denied"
Execute o script de correção V2.

**A V2 remove TODAS as políticas antigas automaticamente e corrige o erro de permissão!**

**O que ele faz:**
- ✅ Melhora a função `get_user_client_id()` com 3 métodos de busca
- ✅ Atualiza políticas RLS da tabela `documents`
- ✅ Atualiza políticas RLS do `storage.objects`
- ✅ Sincroniza metadados de usuários existentes
- ✅ Garante que cada cliente veja apenas seus documentos

**Resultado esperado:**
```
✅ POLÍTICAS CORRIGIDAS COM SUCESSO

📋 MUDANÇAS APLICADAS:
  ✓ Função get_user_client_id() melhorada com 3 métodos
  ✓ Políticas de DOCUMENTS atualizadas
  ✓ Políticas de STORAGE atualizadas
  ✓ Metadados de usuários sincronizados

🔒 SEGURANÇA:
  ✓ Cada cliente vê APENAS seus próprios documentos
  ✓ Admin vê TODOS os documentos
  ✓ Apenas admin pode deletar
```

---

### Passo 3: Verificar Correção

Execute o script de verificação.

**O que ele faz:**
- ✓ Lista clientes disponíveis para teste
- ✓ Testa a função `get_user_client_id()` para cada usuário
- ✓ Simula acesso de cada cliente aos documentos
- ✓ Mostra políticas RLS ativas
- ✓ Testa o primeiro cliente detalhadamente

**Resultado esperado (SUCESSO):**
```
✅ PERFEITO! Todos os clientes têm acesso aos seus documentos!

🎉 O sistema está funcionando corretamente!
   Clientes podem visualizar seus documentos.
```

**Resultado se ainda houver problema:**
```
⚠️  ATENÇÃO: X cliente(s) ainda sem acesso!

📋 AÇÕES RECOMENDADAS:
  1. Execute diagnóstico para detalhes
  2. Verifique se os usuários foram criados
  3. Execute correção novamente
```

---

## 🧪 Teste Manual no Sistema

Após executar os scripts:

1. **Logout do sistema** (se estiver logado)

2. **Fazer upload de um documento como Admin:**
   - Login como admin
   - Selecione um cliente
   - Clique em "Upload"
   - Faça upload de um arquivo teste

3. **Testar visualização como Cliente:**
   - Logout
   - Login com as credenciais do cliente
   - Verificar se o documento aparece na lista
   - Tentar fazer download do documento

---

## 🔍 Como Funciona a Correção

### Método 1: Via `user_profiles.client_id`
O cliente tem um registro na tabela `user_profiles` com `client_id` preenchido.

### Método 2: Via `auth.users.raw_user_meta_data`
O usuário tem `clientId` nos metadados de autenticação.

### Método 3: Via Email (Fallback)
Se os métodos acima falharem, busca um cliente com o mesmo email do usuário.

### Políticas RLS Aplicadas

**DOCUMENTS (tabela):**
- ✅ SELECT: Admin vê tudo, cliente vê apenas seus documentos
- ✅ INSERT: Admin pode inserir para qualquer cliente
- ⚠️ UPDATE: Apenas admin
- ⚠️ DELETE: Apenas admin

**STORAGE.OBJECTS:**
- ✅ SELECT: Admin vê tudo, cliente vê apenas arquivos da sua pasta
- ✅ INSERT: Admin pode fazer upload, cliente pode fazer upload na sua pasta
- ⚠️ UPDATE: Apenas admin
- ⚠️ DELETE: Apenas admin

---

## ❓ Troubleshooting

### ❌ Erro: "policy 'Visualizar documentos com permissão' already exists"

**Solução:** Use o script de correção V2 que remove TODAS as políticas antigas automaticamente antes de criar novas.

### ❌ Erro: "permission denied for table users" ao fazer upload

**Causa:** A política RLS estava tentando acessar `auth.users` diretamente, o que não é permitido.

**Solução:** 
1. Execute o script de correção V2
2. Este script remove o acesso direto a `auth.users` nas políticas
3. Usa apenas a função `get_user_client_id()` que tem `SECURITY DEFINER`

### Problema: Cliente ainda não vê documentos

1. Execute o diagnóstico e verifique:
   - ✓ O cliente tem email cadastrado?
   - ✓ Existe um usuário de autenticação com esse email?
   - ✓ O `get_user_client_id()` retorna o ID correto?

2. Se o usuário não existir:
   - O sistema deveria criar automaticamente ao cadastrar o cliente
   - Verifique se o email está correto
   - Tente editar o cliente e salvar novamente

3. Se `get_user_client_id()` retornar NULL:
   - Execute o script de correção novamente
   - Isso sincronizará os metadados

### Problema: Cliente vê documentos de outros clientes

**Isso NÃO deve acontecer!** Se acontecer:

1. Execute o script de verificação
2. Verifique quais políticas estão ativas
3. Execute o script de correção novamente

### Problema: Download não funciona

1. Verifique se as políticas de Storage estão corretas
2. Certifique-se de que o bucket `documents` existe e é privado
3. Verifique se o arquivo está na pasta correta: `{client-id}/arquivo.pdf`

---

## 🎯 Resultado Final

Após aplicar todos os scripts:

✅ Clientes conseguem visualizar documentos enviados pelo admin  
✅ Cada cliente vê **APENAS** seus próprios documentos  
✅ Admin continua vendo **TODOS** os documentos  
✅ Download funciona para clientes  
✅ Segurança mantida (RLS protegendo os dados)  

---

## 💡 Dicas

- Execute o diagnóstico sempre que adicionar novos clientes
- Execute a verificação após fazer mudanças importantes
- Mantenha backups antes de executar scripts SQL
- Teste com um cliente de exemplo primeiro

---

<a name="resolver-diamond-agora"></a>
# 🚨 RESOLVER PROBLEMA DO DIAMOND - AGORA

## ❌ Problema
Cliente DIAMOND não consegue ver documentos após atualizar a página.

---

## 🔍 PASSO 1: Diagnóstico (OBRIGATÓRIO)

Execute o script de diagnóstico simples do Diamond no **SQL Editor** do Supabase.

### O que vai aparecer:

Você verá **6 tabelas de resultados**. Tire um print de TODAS elas e veja:

#### 1️⃣ CLIENTE DIAMOND
- ✅ Deve mostrar: id, name, email
- ❌ Se vazio: Cliente não existe

#### 2️⃣ USUÁRIO AUTH
- ✅ Deve mostrar: id, email
- ❌ Se vazio: Usuário não foi criado

#### 3️⃣ USER_PROFILE
- ✅ Deve mostrar: id, email, **client_id** (preenchido)
- ❌ Se **client_id** for NULL: **ESTE É O PROBLEMA!**
- ❌ Se a linha estiver vazia: user_profile não existe

#### 4️⃣ TESTE DA FUNÇÃO
- ✅ Deve mostrar: "✅ OK"
- ❌ Se mostrar: "❌ RETORNA NULL - PROBLEMA AQUI!" → **PROBLEMA ENCONTRADO!**
- ❌ Se mostrar: "❌ RETORNA ERRADO" → client_id está incorreto

#### 5️⃣ DOCUMENTOS NO BANCO
- ✅ Deve mostrar documentos com "✅ Client ID correto"
- ❌ Se vazio: Não há documentos para este cliente
- ❌ Se mostrar "❌ Client ID ERRADO!": Documento existe mas está com client_id errado

#### 6️⃣ SIMULAÇÃO DO APP
- ✅ Deve mostrar os mesmos documentos da tabela 5
- ❌ Se vazio MAS tabela 5 tinha documentos: **RLS está bloqueando!**

---

## 🔧 PASSO 2: Correção (Depende do diagnóstico)

### Se o problema foi na tabela 3 ou 4 (client_id NULL):

Execute o script de correção urgente do acesso Diamond.

### Se o problema foi na tabela 5 (client_id errado nos documentos):

Os documentos estão com `client_id` errado. Precisamos corrigir manualmente.

---

## 🧪 PASSO 3: Testar no App

1. **Faça LOGOUT** do app
2. **Limpe o cache do navegador** (Ctrl + Shift + Del)
3. **Faça LOGIN** novamente como `gadielmachado01@gmail.com`
4. **Atualize a página** (F5)
5. Os documentos devem aparecer!

---

## 📸 O que preciso ver

Me envie print da **tabela 3** e **tabela 4** do diagnóstico.

Essas duas tabelas vão me dizer exatamente onde está o problema:
- **Tabela 3**: Mostra se `client_id` está no `user_profile`
- **Tabela 4**: Mostra se a função `get_user_client_id()` funciona

---

## 🎯 Resumo

1. Execute o diagnóstico simples do Diamond
2. Veja as tabelas 3 e 4
3. Execute o script de correção apropriado
4. Teste no app

Se ainda não funcionar após isso, o problema está no frontend (código React), não no banco de dados.

---

**Criado em:** 06/11/2025  
**Versão Consolidada:** 1.0  
**Status:** ✅ Pronto para uso

