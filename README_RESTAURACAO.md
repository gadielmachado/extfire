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

Leia apenas estes 2 arquivos:

1. **`INICIO_RAPIDO.md`** - 5 minutos para configurar tudo
2. **`CHECKLIST_RESTAURACAO.md`** - Marque cada passo conforme conclui

### Para Usuários que Preferem Detalhes 📋

Leia nesta ordem:

1. **`RESUMO_ALTERACOES.md`** - Entenda o que foi alterado
2. **`INSTRUCOES_RESTAURACAO_BANCO.md`** - Guia passo a passo completo
3. **`CHECKLIST_RESTAURACAO.md`** - Verifique cada item
4. **`verificacao_instalacao.sql`** - Execute para confirmar

---

## 📁 Arquivos Criados

### 📄 Documentação (Arquivos .md)

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| **`README_RESTAURACAO.md`** | Este arquivo - índice geral | ⭐ Comece aqui |
| **`INICIO_RAPIDO.md`** | Guia rápido de 5 minutos | ⭐ Se tiver pressa |
| **`INSTRUCOES_RESTAURACAO_BANCO.md`** | Guia completo e detalhado | Se quiser entender tudo |
| **`RESUMO_ALTERACOES.md`** | Lista de mudanças feitas | Para revisar o que mudou |
| **`CHECKLIST_RESTAURACAO.md`** | Checklist interativo | ⭐ Durante a instalação |

### 💾 Scripts SQL

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| **`database_setup_rapido.sql`** | Script SQL compacto | ⭐ Para instalação rápida |
| **`database_setup_complete.sql`** | Script SQL comentado | Se quiser entender cada linha |
| **`verificacao_instalacao.sql`** | Verifica a instalação | ⭐ Após executar SQL |
| **`criar_tabela_clients.sql`** | Verificação básica | Apenas para consulta |

### ⚙️ Arquivos de Configuração (Já Atualizados)

| Arquivo | Status | O que foi alterado |
|---------|--------|-------------------|
| `src/integrations/supabase/client.ts` | ✅ Atualizado | URL e API Key |
| `src/lib/supabaseAdmin.ts` | ⚠️ Requer ação | URL atualizada, SERVICE_ROLE_KEY precisa ser adicionada |
| `supabase/config.toml` | ✅ Atualizado | Project ID |

---

## 🚀 Início Rápido (3 Passos)

### 1️⃣ Adicionar Service Role Key

Edite `src/lib/supabaseAdmin.ts` linha 12:
```typescript
const SERVICE_ROLE_KEY = "sua-chave-aqui"; // Obter no Dashboard > Settings > API
```

### 2️⃣ Executar SQL

1. Acesse: https://dwhbznsijdsiwccamfvd.supabase.co
2. SQL Editor > New Query
3. Copie e cole: `database_setup_rapido.sql`
4. Execute (Run)

### 3️⃣ Criar Bucket

1. Storage > New bucket
2. Nome: `documents`
3. Tipo: Privado

✅ **Pronto!** Agora crie seu usuário admin e teste a aplicação.

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
1. Execute `database_setup_rapido.sql` completamente
2. Verifique se houve erros durante a execução
3. Execute `verificacao_instalacao.sql` para diagnóstico

### Problema: Erro ao fazer upload
**Solução:**
1. Verifique se o bucket 'documents' existe (Storage)
2. Confirme que o bucket é PRIVADO
3. Execute as políticas de storage (veja seção 8 do SQL)
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
Consulte: `INSTRUCOES_RESTAURACAO_BANCO.md` > Seção "Solução de Problemas"

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

- [ ] Li este README
- [ ] Adicionei SERVICE_ROLE_KEY
- [ ] Executei `database_setup_rapido.sql`
- [ ] Criei bucket `documents`
- [ ] Criei usuário admin
- [ ] Executei `verificacao_instalacao.sql`
- [ ] Testei a aplicação
- [ ] Configurei backup

---

## 🙏 Notas Finais

Esta documentação foi criada para facilitar ao máximo a restauração do seu banco de dados. Se tiver alguma dúvida:

1. Consulte o arquivo específico na seção "Arquivos Criados"
2. Execute `verificacao_instalacao.sql` para diagnóstico
3. Verifique os logs do Supabase Dashboard
4. Revise a seção "Solução de Problemas"

**Boa sorte com seu projeto ExtFire! 🚀**

---

**Criado em**: 10 de Outubro de 2025  
**Projeto**: ExtFire - Sistema de Gestão de Clientes  
**Versão da Documentação**: 1.0  
**Autor**: Assistente AI

---

## 📜 Histórico de Alterações

### Versão 1.0 - 10/10/2025
- ✅ Migração completa para novo projeto Supabase
- ✅ Atualização de todas as credenciais
- ✅ Criação de documentação completa
- ✅ Scripts SQL otimizados
- ✅ Guias passo a passo
- ✅ Sistema de verificação automática

---

**🌟 Obrigado por usar ExtFire! 🌟**

