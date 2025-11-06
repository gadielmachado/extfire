# 🚨 Instruções Urgentes - Corrigir Políticas Duplicadas

Se você está tendo problemas com exclusão de clientes ou upload de documentos, é provável que existam **políticas duplicadas ou conflitantes** no Supabase.

---

## 🎯 Solução Rápida em 3 Passos

### Passo 1: Limpar Políticas Antigas

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Abra o arquivo `limpar_politicas.sql` no seu editor de código
6. Copie **TODO** o conteúdo do arquivo
7. Cole no SQL Editor do Supabase
8. Clique em **RUN** (ou pressione `Ctrl + Enter`)

**Aguarde a mensagem:**
```
✅ Perfeito! Todas as políticas foram removidas.

🎯 PRÓXIMO PASSO:
   Execute agora o script database_setup_final.sql
```

### Passo 2: Criar Políticas Corretas

1. No mesmo SQL Editor do Supabase (pode usar uma nova query ou limpar a anterior)
2. Abra o arquivo `database_setup_final.sql` no seu editor de código
3. Copie **TODO** o conteúdo do arquivo
4. Cole no SQL Editor do Supabase
5. Clique em **RUN** (ou pressione `Ctrl + Enter`)

**Aguarde a mensagem:**
```
╔════════════════════════════════════════════════════════╗
║  ✅ CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS           ║
╚════════════════════════════════════════════════════════╝
```

### Passo 3: Testar a Aplicação

1. Recarregue a aplicação no navegador (`Ctrl + Shift + R` para hard reload)
2. Faça login como administrador
3. Teste excluir um cliente → **Deve funcionar agora! ✅**
4. Teste fazer upload de documento → **Deve funcionar agora! ✅**
5. Recarregue a página → **Documentos devem permanecer visíveis! ✅**

---

## 🔍 Verificar se as Políticas Estão Corretas

Para ter certeza de que está tudo certo:

1. No Supabase Dashboard, vá em **Authentication** > **Policies**
2. Você deve ver as seguintes políticas:

### Tabela `clients` (4 políticas)
- ✅ `clients_select_policy` (SELECT)
- ✅ `clients_insert_policy` (INSERT)
- ✅ `clients_update_policy` (UPDATE)
- ✅ `clients_delete_policy` (DELETE)

### Tabela `documents` (4 políticas)
- ✅ `documents_select_policy` (SELECT)
- ✅ `documents_insert_policy` (INSERT)
- ✅ `documents_update_policy` (UPDATE)
- ✅ `documents_delete_policy` (DELETE)

### Tabela `user_profiles` (4 políticas)
- ✅ `user_profiles_select_policy` (SELECT)
- ✅ `user_profiles_insert_policy` (INSERT)
- ✅ `user_profiles_update_policy` (UPDATE)
- ✅ `user_profiles_delete_policy` (DELETE)

### Storage `objects` (4 políticas)
Para ver as políticas de storage:
1. Vá em **Storage** > Bucket `documents` > **Policies**
2. Você deve ver:
   - ✅ `storage_select_policy` (SELECT)
   - ✅ `storage_insert_policy` (INSERT)
   - ✅ `storage_update_policy` (UPDATE)
   - ✅ `storage_delete_policy` (DELETE)

---

## ⚠️ Se Ainda Não Funcionar

### Verificar Console do Navegador

1. Abra o console do navegador (pressione `F12`)
2. Vá na aba **Console**
3. Tente excluir um cliente ou fazer upload
4. Anote **EXATAMENTE** qual erro aparece

### Erros Comuns e Soluções

**Erro: "new row violates row-level security policy"**
- ✅ Execute novamente o `limpar_politicas.sql`
- ✅ Execute novamente o `database_setup_final.sql`
- ✅ Faça logout e login novamente

**Erro: "permission denied for table"**
- ✅ Confirme que você está logado com um email de administrador:
  - `gadyel.bm@gmail.com`
  - `gadielmachado.bm@gmail.com`
  - `extfire.extfire@gmail.com`
  - `paoliellocristiano@gmail.com`

**Erro: "invalid input syntax for type uuid"**
- ✅ Isso foi corrigido no código! Certifique-se de que aceitou as mudanças no arquivo `ClientContext.tsx`

**Erro: "Error uploading file"**
- ✅ Verifique se o bucket `documents` existe em **Storage**
- ✅ Confirme que o bucket é **privado** (não público)
- ✅ Execute novamente os scripts SQL

---

## 📝 Checklist de Verificação

Use este checklist para garantir que tudo está correto:

- [ ] Executei o script `limpar_politicas.sql`
- [ ] Vi a mensagem "✅ Perfeito! Todas as políticas foram removidas"
- [ ] Executei o script `database_setup_final.sql`
- [ ] Vi a mensagem "✅ CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS"
- [ ] Verifiquei que existem 4 políticas em cada tabela
- [ ] O bucket `documents` existe e é privado
- [ ] Fiz logout e login novamente
- [ ] Limpei o cache do navegador (Ctrl + Shift + R)
- [ ] Testei excluir um cliente → funciona ✅
- [ ] Testei fazer upload → funciona ✅
- [ ] Recarreguei a página → documentos permanecem ✅

---

## 🆘 Suporte Adicional

Se após seguir todos os passos ainda houver problemas:

1. Consulte o arquivo **[GUIA_COMPLETO.md](GUIA_COMPLETO.md)** para documentação completa
2. Verifique a seção **Troubleshooting** do guia
3. Anote o erro exato que aparece no console
4. Verifique os logs do Supabase:
   - Dashboard > **Logs** > **Postgres Logs**

---

## 🎓 O Que Mudou?

Para sua informação, aqui está o que foi corrigido:

### 1. Código TypeScript
- **Arquivo**: `src/contexts/ClientContext.tsx`
- **Mudança**: Trocado `.match({ id: clientId })` por `.eq('id', clientId)`
- **Por quê**: O método `.match()` estava gerando UUID inválido

### 2. Políticas RLS
- **Mudança**: Políticas reorganizadas e simplificadas
- **Agora**: 
  - Admins têm acesso completo a tudo
  - Clientes podem ver e inserir seus próprios dados
  - Clientes podem fazer upload de documentos na sua pasta

### 3. Script de Limpeza
- **Novo arquivo**: `limpar_politicas.sql`
- **Função**: Remove TODAS as políticas antigas antes de criar novas
- **Por quê**: Evita conflitos e políticas duplicadas

---

**Boa sorte! Se seguir estes passos, tudo deve funcionar perfeitamente. 🎉**

*Última atualização: Novembro 2024*

