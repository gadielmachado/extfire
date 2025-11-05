# ✅ Checklist de Restauração do Banco de Dados

Use este checklist para garantir que todos os passos foram concluídos corretamente.

---

## 📋 Preparação

- [ ] Tenho acesso ao dashboard do Supabase
- [ ] Estou no projeto correto (dwhbznsijdsiwccamfvd)
- [ ] Possuo a service_role key do novo projeto
- [ ] Li o arquivo `INICIO_RAPIDO.md` ou `INSTRUCOES_RESTAURACAO_BANCO.md`

---

## 🔧 Configuração Local

### Arquivos de Configuração

- [ ] Arquivo `src/integrations/supabase/client.ts` atualizado
  - [ ] URL: `https://dwhbznsijdsiwccamfvd.supabase.co`
  - [ ] API Key (anon) atualizada

- [ ] Arquivo `src/lib/supabaseAdmin.ts` atualizado
  - [ ] URL: `https://dwhbznsijdsiwccamfvd.supabase.co`
  - [ ] SERVICE_ROLE_KEY substituída (não deixar "SUA_SERVICE_ROLE_KEY_AQUI")

- [ ] Arquivo `supabase/config.toml` atualizado
  - [ ] project_id: `dwhbznsijdsiwccamfvd`

---

## 🗄️ Banco de Dados

### Execução do Script SQL

- [ ] Acessei o SQL Editor no Supabase Dashboard
- [ ] Abri o arquivo `database_setup_rapido.sql` (ou `database_setup_complete.sql`)
- [ ] Copiei TODO o conteúdo do arquivo
- [ ] Colei no SQL Editor
- [ ] Executei o script (botão Run ou Ctrl+Enter)
- [ ] Recebi mensagens de sucesso (CREATE TABLE, CREATE INDEX, etc.)
- [ ] Nenhum erro foi exibido

### Verificação das Tabelas

Execute no SQL Editor e marque se tudo estiver correto:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'documents', 'user_profiles');
```

- [ ] Tabela `clients` existe
- [ ] Tabela `documents` existe
- [ ] Tabela `user_profiles` existe

### Verificação do RLS

```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clients', 'documents', 'user_profiles');
```

- [ ] RLS habilitado em `clients`
- [ ] RLS habilitado em `documents`
- [ ] RLS habilitado em `user_profiles`

### Verificação de Políticas

```sql
SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';
```

- [ ] Existem pelo menos 15 políticas RLS

---

## 💾 Storage

### Criação do Bucket

- [ ] Acessei Storage no menu lateral
- [ ] Cliquei em "New bucket" ou "Create a new bucket"
- [ ] Nome do bucket: `documents`
- [ ] Tipo: **Privado** (Public: desmarcado)
- [ ] Bucket criado com sucesso

### Políticas de Storage

Execute no SQL Editor:

```sql
-- 1. Upload para admins
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

-- 2. Visualização para admins
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

-- 3. Deleção para admins
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
```

- [ ] Política de INSERT criada
- [ ] Política de SELECT criada
- [ ] Política de DELETE criada
- [ ] Nenhum erro ao criar políticas

### Verificação do Bucket

```sql
SELECT * FROM storage.buckets WHERE name = 'documents';
```

- [ ] Bucket `documents` aparece na lista
- [ ] Campo `public` = `false`

---

## 👤 Usuários

### Criação do Primeiro Admin

**Escolha UMA das opções abaixo:**

#### Opção A: Via Aplicação
- [ ] Executei `npm install` (se necessário)
- [ ] Executei `npm run dev`
- [ ] Acessei http://localhost:5173
- [ ] Cliquei em "Registrar" ou "Register"
- [ ] Preenchi: nome, email, senha
- [ ] Registro concluído com sucesso
- [ ] Executei no SQL Editor:
  ```sql
  UPDATE user_profiles SET role = 'admin' WHERE email = 'MEU-EMAIL@exemplo.com';
  ```
- [ ] Query retornou "UPDATE 1"

#### Opção B: Direto no Supabase
- [ ] Acessei Authentication > Users
- [ ] Cliquei em "Add user" ou "Invite"
- [ ] Preenchi email e senha
- [ ] Usuário criado com sucesso
- [ ] Executei no SQL Editor:
  ```sql
  UPDATE user_profiles SET role = 'admin' WHERE email = 'MEU-EMAIL@exemplo.com';
  ```
- [ ] Query retornou "UPDATE 1"

### Verificação do Admin

```sql
SELECT email, role FROM user_profiles WHERE role = 'admin';
```

- [ ] Meu usuário admin aparece na lista
- [ ] Role = 'admin'

---

## 🧪 Testes

### Aplicação Local

- [ ] Aplicação rodando (`npm run dev`)
- [ ] Página carrega sem erros no console
- [ ] Posso acessar a página de login

### Login

- [ ] Consigo fazer login com usuário admin
- [ ] Sou redirecionado para o dashboard
- [ ] Vejo a interface administrativa

### Funcionalidades

- [ ] **Adicionar Cliente**
  - [ ] Botão "+" ou "Adicionar Cliente" visível
  - [ ] Modal/dialog abre corretamente
  - [ ] Consigo preencher CNPJ, nome, senha, email
  - [ ] Cliente é criado com sucesso
  - [ ] Cliente aparece na lista

- [ ] **Visualizar Cliente**
  - [ ] Consigo clicar em um cliente
  - [ ] Detalhes do cliente são exibidos
  - [ ] Informações corretas

- [ ] **Editar Cliente**
  - [ ] Botão de editar funciona
  - [ ] Consigo alterar informações
  - [ ] Alterações são salvas

- [ ] **Upload de Documento**
  - [ ] Botão de upload visível
  - [ ] Consigo selecionar arquivo
  - [ ] Upload é realizado com sucesso
  - [ ] Documento aparece na lista

- [ ] **Visualizar Documento**
  - [ ] Consigo clicar no documento
  - [ ] Documento abre/faz download

- [ ] **Deletar Documento**
  - [ ] Botão de deletar funciona
  - [ ] Confirmação é solicitada
  - [ ] Documento é removido

- [ ] **Logout**
  - [ ] Consigo fazer logout
  - [ ] Sou redirecionado para login

---

## 🔍 Verificação Final

### Script de Verificação

- [ ] Executei o arquivo `verificacao_instalacao.sql` no SQL Editor
- [ ] Recebi a mensagem: "🎉 INSTALAÇÃO COMPLETA E FUNCIONAL!"
- [ ] Todos os itens da verificação estão com ✅

### Resumo de Contagens

Execute e verifique:

```sql
-- Tabelas
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'documents', 'user_profiles');
-- Deve retornar: 3

-- Políticas RLS
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Deve retornar: >= 15

-- Triggers
SELECT COUNT(*) FROM information_schema.triggers 
WHERE trigger_schema = 'public';
-- Deve retornar: >= 3

-- Bucket
SELECT COUNT(*) FROM storage.buckets WHERE name = 'documents';
-- Deve retornar: 1
```

- [ ] 3 tabelas criadas
- [ ] Pelo menos 15 políticas RLS
- [ ] Pelo menos 3 triggers
- [ ] 1 bucket de storage

---

## 🎉 Conclusão

### Status Final

- [ ] ✅ Todas as configurações locais atualizadas
- [ ] ✅ Script SQL executado com sucesso
- [ ] ✅ Tabelas e políticas criadas
- [ ] ✅ Storage configurado
- [ ] ✅ Usuário admin criado
- [ ] ✅ Aplicação funcionando localmente
- [ ] ✅ Todas as funcionalidades testadas
- [ ] ✅ Verificação final passou

---

## 📝 Anotações Pessoais

Use este espaço para anotar informações importantes:

**Email do Admin:**
```
_______________________________________
```

**Data da Instalação:**
```
_______________________________________
```

**Versão do Projeto:**
```
_______________________________________
```

**Observações:**
```
_______________________________________
_______________________________________
_______________________________________
```

---

## 🔄 Próximos Passos

Após completar este checklist:

1. [ ] Fazer backup do banco de dados (Supabase Dashboard > Database > Backups)
2. [ ] Configurar variáveis de ambiente de produção (se for fazer deploy)
3. [ ] Documentar credenciais em local seguro
4. [ ] Adicionar mais usuários, se necessário
5. [ ] Começar a usar a aplicação! 🚀

---

## 📞 Arquivos de Referência

Se tiver dúvidas em algum passo:

- 🚀 **Início Rápido**: `INICIO_RAPIDO.md`
- 📖 **Guia Completo**: `INSTRUCOES_RESTAURACAO_BANCO.md`
- 📋 **Resumo**: `RESUMO_ALTERACOES.md`
- 💾 **SQL Rápido**: `database_setup_rapido.sql`
- 💾 **SQL Completo**: `database_setup_complete.sql`
- 🔍 **Verificação**: `verificacao_instalacao.sql`

---

**Data**: 10 de Outubro de 2025  
**Versão do Checklist**: 1.0  
**Projeto**: ExtFire - Sistema de Gestão de Clientes

---

### ⭐ Parabéns por completar a restauração! ⭐

