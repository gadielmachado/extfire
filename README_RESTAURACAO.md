# 📚 Documentação Completa - Restauração do Banco de Dados ExtFire

## 🎯 Visão Geral

Esta documentação foi criada para ajudá-lo a restaurar completamente o banco de dados do sistema ExtFire no novo projeto Supabase.

### 🆕 Novas Credenciais do Projeto

| Item | Valor |
|------|-------|
| **URL** | `https://dwhbznsijdsiwccamfvd.supabase.co` |
| **Project ID** | `dwhbznsijdsiwccamfvd` |
| **API Key (anon)** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

✅ **Já atualizadas** nos arquivos de configuração do projeto!

---

## 📖 Guia de Leitura

### Para Usuários Apressados ⚡

Leia apenas este arquivo:
1. **`GUIA_INICIO.md`** - 5 minutos para configurar tudo

### Para Usuários que Preferem Detalhes 📋

Leia nesta ordem:
1. **`GUIA_INICIO.md`** - Guia rápido de início
2. **`README_RESTAURACAO.md`** - Este arquivo (guia completo)
3. **`RESUMO_ALTERACOES.md`** - Entenda o que foi alterado
4. **`verificacao_instalacao.sql`** - Execute para confirmar

---

## 📁 Arquivos Disponíveis

### 📄 Documentação (Arquivos .md)

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| **`GUIA_INICIO.md`** | Guia rápido de 5 minutos | ⭐ Comece aqui |
| **`README_RESTAURACAO.md`** | Este arquivo - guia completo | ⭐ Referência detalhada |
| **`CONFIGURAR_VERCEL.md`** | Guia de configuração Vercel | Para deploy |
| **`CORRECAO_STORAGE.md`** | Correções de storage e upload | Para problemas técnicos |
| **`RESUMO_ALTERACOES.md`** | Lista de mudanças feitas | Para revisar o que mudou |

### 💾 Scripts SQL

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| **`database_setup_complete.sql`** | Script SQL completo e comentado | ⭐ Execute este |
| **`storage_policies_completo.sql`** | Políticas de storage | Após criar bucket |
| **`fix_database_issues.sql`** | Correções de problemas | Se houver erros |
| **`fix_rls_recursion.sql`** | Correção de recursão RLS | Se houver problemas RLS |
| **`verificacao_instalacao.sql`** | Verifica a instalação | ⭐ Após executar SQL |

### ⚙️ Arquivos de Configuração (Já Atualizados)

| Arquivo | Status | O que foi alterado |
|---------|--------|-------------------|
| `src/integrations/supabase/client.ts` | ✅ Atualizado | URL e API Key |
| `src/lib/supabaseAdmin.ts` | ⚠️ Requer ação | URL atualizada, SERVICE_ROLE_KEY precisa ser adicionada |
| `supabase/config.toml` | ✅ Atualizado | Project ID |

---

## 🚀 Passo a Passo Completo para Restauração

### 📋 Checklist de Preparação

Use este checklist para garantir que todos os passos foram concluídos corretamente:

#### Preparação

- [ ] Tenho acesso ao dashboard do Supabase
- [ ] Estou no projeto correto (dwhbznsijdsiwccamfvd)
- [ ] Possuo a service_role key do novo projeto
- [ ] Li o arquivo `GUIA_INICIO.md`

---

### 🔧 Configuração Local

#### Arquivos de Configuração

- [ ] Arquivo `src/integrations/supabase/client.ts` atualizado
  - [ ] URL: `https://dwhbznsijdsiwccamfvd.supabase.co`
  - [ ] API Key (anon) atualizada

- [ ] Arquivo `src/lib/supabaseAdmin.ts` atualizado
  - [ ] URL: `https://dwhbznsijdsiwccamfvd.supabase.co`
  - [ ] SERVICE_ROLE_KEY substituída (não deixar "SUA_SERVICE_ROLE_KEY_AQUI")

- [ ] Arquivo `supabase/config.toml` atualizado
  - [ ] project_id: `dwhbznsijdsiwccamfvd`

**Como obter a Service Role Key:**
1. Acesse o dashboard do Supabase: https://dwhbznsijdsiwccamfvd.supabase.co
2. Clique em **Settings** (⚙️) no menu lateral
3. Vá para **API**
4. Procure por **service_role** na seção "Project API keys"
5. Copie a chave e substitua `SUA_SERVICE_ROLE_KEY_AQUI` no arquivo `src/lib/supabaseAdmin.ts`

⚠️ **IMPORTANTE:** NUNCA compartilhe a SERVICE_ROLE_KEY publicamente!

---

### 🗄️ Banco de Dados

#### Execução do Script SQL

- [ ] Acessei o SQL Editor no Supabase Dashboard
- [ ] Abri o arquivo `database_setup_complete.sql`
- [ ] Copiei TODO o conteúdo do arquivo
- [ ] Colei no SQL Editor
- [ ] Executei o script (botão Run ou Ctrl+Enter)
- [ ] Recebi mensagens de sucesso (CREATE TABLE, CREATE INDEX, etc.)
- [ ] Nenhum erro foi exibido

#### Verificação das Tabelas

Execute no SQL Editor e marque se tudo estiver correto:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'documents', 'user_profiles');
```

- [ ] Tabela `clients` existe
- [ ] Tabela `documents` existe
- [ ] Tabela `user_profiles` existe

#### Verificação do RLS

```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clients', 'documents', 'user_profiles');
```

- [ ] RLS habilitado em `clients`
- [ ] RLS habilitado em `documents`
- [ ] RLS habilitado em `user_profiles`

#### Verificação de Políticas

```sql
SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';
```

- [ ] Existem pelo menos 15 políticas RLS

---

### 💾 Storage

#### Criação do Bucket

- [ ] Acessei Storage no menu lateral
- [ ] Cliquei em "New bucket" ou "Create a new bucket"
- [ ] Nome do bucket: `documents`
- [ ] Tipo: **Privado** (Public: desmarcado)
- [ ] Bucket criado com sucesso

#### Políticas de Storage

Execute no SQL Editor:

```sql
-- Execute o arquivo storage_policies_completo.sql
```

- [ ] Políticas de storage criadas
- [ ] Nenhum erro ao criar políticas

#### Verificação do Bucket

```sql
SELECT * FROM storage.buckets WHERE name = 'documents';
```

- [ ] Bucket `documents` aparece na lista
- [ ] Campo `public` = `false`

---

### 👤 Usuários

#### Criação do Primeiro Admin

**Escolha UMA das opções abaixo:**

**Opção A: Via Aplicação**
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

**Opção B: Direto no Supabase**
- [ ] Acessei Authentication > Users
- [ ] Cliquei em "Add user" ou "Invite"
- [ ] Preenchi email e senha
- [ ] Usuário criado com sucesso
- [ ] Executei no SQL Editor:
  ```sql
  UPDATE user_profiles SET role = 'admin' WHERE email = 'MEU-EMAIL@exemplo.com';
  ```
- [ ] Query retornou "UPDATE 1"

#### Verificação do Admin

```sql
SELECT email, role FROM user_profiles WHERE role = 'admin';
```

- [ ] Meu usuário admin aparece na lista
- [ ] Role = 'admin'

---

### 🧪 Testes

#### Aplicação Local

- [ ] Aplicação rodando (`npm run dev`)
- [ ] Página carrega sem erros no console
- [ ] Posso acessar a página de login

#### Login

- [ ] Consigo fazer login com usuário admin
- [ ] Sou redirecionado para o dashboard
- [ ] Vejo a interface administrativa

#### Funcionalidades

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

### 🔍 Verificação Final

#### Script de Verificação

- [ ] Executei o arquivo `verificacao_instalacao.sql` no SQL Editor
- [ ] Recebi a mensagem: "🎉 INSTALAÇÃO COMPLETA E FUNCIONAL!"
- [ ] Todos os itens da verificação estão com ✅

#### Resumo de Contagens

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

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

#### 1. `clients` - Clientes do Sistema
```
Campos principais:
- id (UUID)
- cnpj (único)
- name
- email
- password (hash)
- maintenance_date
- is_blocked
```

#### 2. `documents` - Documentos dos Clientes
```
Campos principais:
- id (UUID)
- client_id (referência a clients)
- name
- type
- size
- file_url
- upload_date
```

#### 3. `user_profiles` - Perfis de Usuários
```
Campos principais:
- id (UUID, referência a auth.users)
- name
- email
- role (admin ou client)
- client_id (referência a clients, opcional)
```

### Recursos Implementados

- ✅ **RLS (Row Level Security)** habilitado em todas as tabelas
- ✅ **15+ Políticas de Segurança** para controle de acesso
- ✅ **Triggers** para atualização automática de timestamps
- ✅ **Índices** para performance otimizada
- ✅ **Foreign Keys** para integridade referencial
- ✅ **Storage** privado com políticas de acesso
- ✅ **Função automática** para criação de perfil de usuário

---

## 🔒 Segurança

### Níveis de Acesso

#### Admin (role = 'admin')
- ✅ Ver todos os clientes
- ✅ Criar, editar e deletar clientes
- ✅ Ver todos os documentos
- ✅ Upload, visualizar e deletar documentos
- ✅ Gerenciar usuários

#### Client (role = 'client')
- ✅ Ver apenas seus próprios dados
- ✅ Ver apenas seus documentos
- ❌ Não pode modificar dados
- ❌ Não pode fazer upload

### Service Role Key ⚠️

A `SERVICE_ROLE_KEY` tem privilégios administrativos completos. **NUNCA:**
- ❌ Compartilhe publicamente
- ❌ Commite no Git (se o repositório for público)
- ❌ Exponha no frontend

Em produção, use:
- ✅ Variáveis de ambiente
- ✅ Backend seguro (Edge Functions, API)
- ✅ Autenticação adequada

---

## 🧪 Testando a Instalação

### Verificação Automática

Execute no SQL Editor:
```sql
-- Copiar todo o conteúdo de verificacao_instalacao.sql
```

Resultado esperado: **"🎉 INSTALAÇÃO COMPLETA E FUNCIONAL!"**

### Verificação Manual

```sql
-- 1. Verificar tabelas (deve retornar 3)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'documents', 'user_profiles');

-- 2. Verificar RLS (deve retornar 3, todos com true)
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clients', 'documents', 'user_profiles');

-- 3. Verificar políticas (deve retornar >= 15)
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';

-- 4. Verificar bucket (deve retornar 1)
SELECT COUNT(*) FROM storage.buckets WHERE name = 'documents';
```

### Teste na Aplicação

```bash
npm install
npm run dev
```

Checklist de testes:
- [ ] Login funciona
- [ ] Adicionar cliente funciona
- [ ] Visualizar cliente funciona
- [ ] Editar cliente funciona
- [ ] Upload de documento funciona
- [ ] Visualizar documento funciona
- [ ] Deletar documento funciona
- [ ] Logout funciona

---

## 🐛 Solução de Problemas

### Problema: "Invalid API key"
**Solução:**
1. Verifique `src/integrations/supabase/client.ts`
2. Confirme que a API key está correta
3. Limpe o cache do navegador
4. Faça logout e login novamente

### Problema: "relation does not exist"
**Solução:**
1. Execute `database_setup_complete.sql` completamente
2. Verifique se houve erros durante a execução
3. Execute `verificacao_instalacao.sql` para diagnóstico

### Problema: Erro ao fazer upload
**Solução:**
1. Verifique se o bucket 'documents' existe (Storage)
2. Confirme que o bucket é PRIVADO
3. Execute as políticas de storage (`storage_policies_completo.sql`)
4. Verifique se o usuário é admin

### Problema: "permission denied"
**Solução:**
1. Verifique o role do usuário:
   ```sql
   SELECT email, role FROM user_profiles WHERE email = 'seu-email';
   ```
2. Se não for admin, atualize:
   ```sql
   UPDATE user_profiles SET role = 'admin' WHERE email = 'seu-email';
   ```

### Problema: SERVICE_ROLE_KEY não funciona
**Solução:**
1. Dashboard > Settings > API
2. Copie a chave "service_role" (não "anon")
3. Substitua em `src/lib/supabaseAdmin.ts`
4. Reinicie a aplicação

### Mais problemas?
Consulte: `CORRECAO_STORAGE.md` para problemas técnicos detalhados

---

## 📞 Informações de Suporte

### Links Úteis

- **Dashboard**: https://dwhbznsijdsiwccamfvd.supabase.co
- **SQL Editor**: https://dwhbznsijdsiwccamfvd.supabase.co/project/dwhbznsijdsiwccamfvd/sql
- **Storage**: https://dwhbznsijdsiwccamfvd.supabase.co/project/dwhbznsijdsiwccamfvd/storage
- **Authentication**: https://dwhbznsijdsiwccamfvd.supabase.co/project/dwhbznsijdsiwccamfvd/auth

### Documentação Oficial

- Supabase: https://supabase.com/docs
- PostgreSQL: https://www.postgresql.org/docs/
- RLS: https://supabase.com/docs/guides/auth/row-level-security

---

## 🎓 Entendendo a Arquitetura

### Fluxo de Autenticação

```
1. Usuário se registra → auth.users (Supabase Auth)
2. Trigger automático → cria user_profiles
3. Admin atualiza → role = 'admin' (se necessário)
4. Login → token JWT gerado
5. Requisições → RLS verifica permissões
```

### Fluxo de Upload

```
1. Admin seleciona arquivo
2. Frontend → upload para storage.objects
3. Storage policy → verifica se é admin
4. Arquivo salvo → URL gerada
5. Metadados → salvos em documents
6. RLS → permite acesso baseado em role
```

### Fluxo de Dados

```
Frontend (React) 
    ↓
Supabase Client (client.ts)
    ↓
Supabase API (RLS aplicado)
    ↓
PostgreSQL Database
```

---

## 🔄 Backup e Manutenção

### Backup Regular

1. Dashboard > Database > Backups
2. Configure backup automático diário
3. Exporte manualmente antes de mudanças grandes

### Monitoramento

1. Dashboard > Database > Logs
2. Monitore queries lentas
3. Verifique uso de storage

### Atualizações

Quando atualizar o schema:
1. Teste em ambiente de desenvolvimento
2. Execute scripts SQL incrementais
3. Verifique RLS após mudanças
4. Atualize os types TypeScript se necessário

---

## ✨ Recursos da Aplicação

Após a restauração, sua aplicação terá:

- 🔐 **Autenticação Segura**
  - Login/Logout
  - Registro de usuários
  - Reset de senha
  - Controle de sessão

- 👥 **Gestão de Clientes**
  - Cadastro com CNPJ
  - Edição de informações
  - Sistema de bloqueio
  - Controle de manutenção

- 📄 **Gestão de Documentos**
  - Upload de arquivos
  - Visualização segura
  - Organização por cliente
  - Deleção controlada

- 🔒 **Segurança**
  - Row Level Security
  - Controle de acesso por role
  - Storage privado
  - Políticas granulares

- 📊 **Interface**
  - Dashboard administrativo
  - Visualização de detalhes
  - Notificações
  - Design moderno e responsivo

---

## 🎯 Próximos Passos

Após completar a restauração:

1. ✅ Fazer backup inicial
2. ✅ Configurar Email Auth (se necessário)
3. ✅ Adicionar mais usuários admin
4. ✅ Cadastrar clientes
5. ✅ Testar todas as funcionalidades
6. ✅ Configurar domínio customizado (produção)
7. ✅ Configurar variáveis de ambiente (produção)
8. ✅ Deploy da aplicação

---

## 📋 Checklist Rápido

- [ ] Li o GUIA_INICIO.md
- [ ] Adicionei SERVICE_ROLE_KEY
- [ ] Executei `database_setup_complete.sql`
- [ ] Criei bucket `documents`
- [ ] Executei `storage_policies_completo.sql`
- [ ] Criei usuário admin
- [ ] Executei `verificacao_instalacao.sql`
- [ ] Testei a aplicação
- [ ] Configurei backup

---

## 🙏 Notas Finais

Esta documentação foi criada para facilitar ao máximo a restauração do seu banco de dados. Se tiver alguma dúvida:

1. Consulte o arquivo específico na seção "Arquivos Disponíveis"
2. Execute `verificacao_instalacao.sql` para diagnóstico
3. Verifique os logs do Supabase Dashboard
4. Revise a seção "Solução de Problemas"

**Boa sorte com seu projeto ExtFire! 🚀**

---

**Criado em**: Outubro de 2025  
**Projeto**: ExtFire - Sistema de Gestão de Clientes  
**Versão da Documentação**: 2.0

---

## 📜 Histórico de Alterações

### Versão 2.0 - Outubro 2025
- ✅ Consolidação de documentação
- ✅ Checklist integrado
- ✅ Instruções detalhadas passo a passo
- ✅ Guias de solução de problemas

---

**🌟 Obrigado por usar ExtFire! 🌟**
