# 📘 Guia Completo - ExtFire

Sistema de gestão de clientes com autenticação, upload de documentos e controle de acesso.

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração Inicial](#configuração-inicial)
3. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
4. [Executar Localmente](#executar-localmente)
5. [Deploy na Vercel](#deploy-na-vercel)
6. [Estrutura do Projeto](#estrutura-do-projeto)
7. [Políticas de Segurança](#políticas-de-segurança)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O **ExtFire** é um sistema completo de gestão de clientes que oferece:

### Funcionalidades Principais

- **Autenticação Segura**: Login/logout com Supabase Auth
- **Gestão de Clientes**: Cadastro, edição, bloqueio e exclusão
- **Upload de Documentos**: Armazenamento seguro no Supabase Storage
- **Controle de Acesso**: Sistema de permissões com roles (Admin/Client)
- **Interface Moderna**: Dashboard responsivo com React e Tailwind

### Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Vite
- **UI**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel

---

## ⚙️ Configuração Inicial

### Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Node.js 18+ instalado
- ✅ npm ou yarn instalado
- ✅ Conta no Supabase (gratuita)
- ✅ Conta na Vercel (gratuita, para deploy)

### 1. Clonar o Repositório

```bash
git clone <SEU_REPOSITORIO>
cd extfire-master
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

**Onde encontrar essas informações:**

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys** > **anon public** → `VITE_SUPABASE_ANON_KEY`

---

## 🗄️ Configuração do Banco de Dados

Esta é a etapa mais importante! Siga cuidadosamente.

### Passo 1: Acessar SQL Editor

1. No Supabase Dashboard, vá em **SQL Editor** (menu lateral)
2. Clique em **New Query**

### Passo 2: Limpar Políticas Antigas (IMPORTANTE!)

**Primeiro, limpe todas as políticas antigas para evitar conflitos:**

1. Abra o arquivo `limpar_politicas.sql` na raiz do projeto
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **RUN** (ou pressione Ctrl+Enter)
5. Aguarde a mensagem: `✅ Perfeito! Todas as políticas foram removidas.`

### Passo 3: Executar Script de Configuração

**Agora execute o script principal:**

1. Abra o arquivo `database_setup_final.sql` na raiz do projeto
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **RUN** (ou pressione Ctrl+Enter)

**O que este script faz:**

- ✅ Cria tabelas: `clients`, `documents`, `user_profiles`
- ✅ Cria funções auxiliares: `is_admin()`, `get_user_client_id()`
- ✅ Configura triggers de sincronização automática
- ✅ Configura políticas RLS (Row Level Security)
- ✅ Cria bucket de storage para documentos
- ✅ Configura políticas de storage

### Passo 4: Verificar Instalação

Após executar o script, você verá mensagens de confirmação no console do SQL Editor:

```
✅ CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS

📋 COMPONENTES CRIADOS/ATUALIZADOS:
  ✓ Tabelas: clients, documents, user_profiles
  ✓ Funções auxiliares (is_admin, get_user_client_id, sync_user_profile)
  ✓ Triggers de sincronização automática
  ✓ Políticas RLS para todas as tabelas
  ✓ Bucket de Storage e políticas
  ✓ User_profiles sincronizados

🔒 POLÍTICAS DE SEGURANÇA:
  ✓ Admins: Acesso completo a tudo
  ✓ Clientes: Acesso apenas aos seus próprios dados
  ✓ Clientes podem fazer upload de documentos
```

### Passo 5: Verificar Bucket de Storage

1. No Supabase Dashboard, vá em **Storage**
2. Verifique se o bucket `documents` foi criado
3. Se não foi criado automaticamente, crie manualmente:
   - Clique em **New bucket**
   - Nome: `documents`
   - **Public bucket**: ❌ Desmarcado (IMPORTANTE: deve ser privado)
   - Clique em **Create bucket**

---

## 🚀 Executar Localmente

Após configurar o banco de dados:

```bash
npm run dev
```

A aplicação estará disponível em: **http://localhost:5173**

### Primeiro Acesso

**Criar usuário administrador:**

1. Acesse http://localhost:5173
2. Clique em **Registrar**
3. Use um dos emails de administrador configurados:
   - `gadyel.bm@gmail.com`
   - `gadielmachado.bm@gmail.com`
   - `extfire.extfire@gmail.com`
   - `paoliellocristiano@gmail.com`
4. Crie uma senha
5. Após registrar, você terá acesso administrativo completo

**Ou fazer login se já tiver conta:**

1. Acesse http://localhost:5173
2. Faça login com suas credenciais

---

## 🌐 Deploy na Vercel

### Passo 1: Preparar Projeto

Certifique-se de que:

- ✅ Todas as mudanças estão commitadas no Git
- ✅ O projeto está em um repositório GitHub/GitLab/Bitbucket

### Passo 2: Conectar à Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **Add New...** > **Project**
3. Importe seu repositório
4. Configure o projeto:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Passo 3: Configurar Variáveis de Ambiente

Na página de configuração do projeto na Vercel, adicione:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### Passo 4: Deploy

1. Clique em **Deploy**
2. Aguarde o build completar
3. Acesse a URL gerada pela Vercel

### Passo 5: Configurar Domínio (Opcional)

1. Na Vercel, vá em **Settings** > **Domains**
2. Adicione seu domínio personalizado
3. Configure os DNS conforme instruções

---

## 📁 Estrutura do Projeto

```
extfire-master/
├── src/
│   ├── components/              # Componentes React
│   │   ├── ui/                 # Componentes UI base (shadcn)
│   │   ├── AddClientDialog.tsx # Diálogo adicionar cliente
│   │   ├── ClientDetails.tsx   # Detalhes do cliente
│   │   ├── ClientItem.tsx      # Item da lista de clientes
│   │   ├── EditClientDialog.tsx # Diálogo editar cliente
│   │   ├── Sidebar.tsx         # Menu lateral
│   │   └── UploadDocumentDialog.tsx # Upload de documentos
│   ├── contexts/               # Context API
│   │   ├── AuthContext.tsx     # Autenticação e usuário
│   │   ├── ClientContext.tsx   # Gestão de clientes
│   │   └── NotificationContext.tsx # Notificações
│   ├── hooks/                  # Custom hooks
│   ├── integrations/           # Integrações
│   │   └── supabase/          
│   │       ├── client.ts       # Cliente Supabase
│   │       └── types.ts        # Tipos TypeScript
│   ├── lib/                    # Utilitários
│   │   ├── utils.ts            # Funções auxiliares
│   │   └── clientService.ts    # Serviços de cliente
│   ├── pages/                  # Páginas da aplicação
│   │   ├── Dashboard.tsx       # Dashboard principal
│   │   ├── Login.tsx           # Página de login
│   │   ├── Register.tsx        # Página de registro
│   │   └── ...
│   └── types/                  # Definições TypeScript
│       ├── client.ts           # Tipo Client
│       ├── document.ts         # Tipo Document
│       └── user.ts             # Tipo User
├── public/                     # Arquivos estáticos
├── limpar_politicas.sql        # 🧹 Script para limpar políticas antigas (execute primeiro)
├── database_setup_final.sql    # ⭐ Script SQL ÚNICO e DEFINITIVO (execute depois)
├── GUIA_COMPLETO.md           # ⭐ Este guia
├── CONFIGURAR_VERCEL.md       # Guia de deploy Vercel
├── README.md                   # Documentação principal
├── package.json                # Dependências
├── vite.config.ts             # Configuração Vite
├── tailwind.config.ts         # Configuração Tailwind
└── tsconfig.json              # Configuração TypeScript
```

---

## 🔒 Políticas de Segurança

O sistema implementa Row Level Security (RLS) com políticas granulares.

### Tabela `clients`

| Operação | Admin | Cliente |
|----------|-------|---------|
| **SELECT** | Vê todos os clientes | Vê apenas seu próprio cliente |
| **INSERT** | ✅ Pode criar | ❌ Não pode |
| **UPDATE** | ✅ Pode atualizar qualquer | ❌ Não pode |
| **DELETE** | ✅ Pode excluir qualquer | ❌ Não pode |

### Tabela `documents`

| Operação | Admin | Cliente |
|----------|-------|---------|
| **SELECT** | Vê todos os documentos | Vê apenas seus documentos |
| **INSERT** | ✅ Pode inserir para qualquer cliente | ✅ Pode inserir para si mesmo |
| **UPDATE** | ✅ Pode atualizar qualquer | ❌ Não pode |
| **DELETE** | ✅ Pode excluir qualquer | ❌ Não pode |

### Storage `documents`

| Operação | Admin | Cliente |
|----------|-------|---------|
| **INSERT** (upload) | ✅ Pode fazer upload em qualquer pasta | ✅ Pode fazer upload na sua pasta |
| **SELECT** (visualizar) | Vê todos os arquivos | Vê apenas arquivos na sua pasta |
| **UPDATE** | ✅ Pode atualizar qualquer | ❌ Não pode |
| **DELETE** | ✅ Pode excluir qualquer | ❌ Não pode |

### Tabela `user_profiles`

| Operação | Admin | Cliente |
|----------|-------|---------|
| **SELECT** | Vê todos os perfis | Vê apenas seu perfil |
| **INSERT** | ✅ Pode criar qualquer | ✅ Pode criar seu próprio |
| **UPDATE** | ✅ Pode atualizar qualquer | ✅ Pode atualizar seu próprio |
| **DELETE** | ✅ Pode excluir qualquer | ❌ Não pode |

---

## 🐛 Troubleshooting

### Problemas com Autenticação

**Erro: "Invalid API key"**

- ✅ Verifique se as variáveis de ambiente estão corretas no `.env.local`
- ✅ Reinicie o servidor de desenvolvimento (`npm run dev`)
- ✅ Confirme que está usando a **anon key**, não a service role key

**Erro: "User not found"**

- ✅ Registre um novo usuário na aplicação
- ✅ Verifique se o email está correto
- ✅ Confirme que o usuário existe na tabela `auth.users` no Supabase

### Problemas com Banco de Dados

**Erro: "relation does not exist"**

- ✅ Execute o script `database_setup_final.sql` completo
- ✅ Verifique se todas as tabelas foram criadas em **Table Editor**

**Erro: "permission denied for table"**

- ✅ Execute primeiro o script `limpar_politicas.sql` para remover políticas antigas
- ✅ Depois execute o script `database_setup_final.sql`
- ✅ Verifique se as políticas RLS foram criadas em **Authentication** > **Policies**
- ✅ Confirme que seu usuário é admin (email na lista hardcoded)

### Problemas com Upload de Documentos

**Erro: "Error uploading file"**

- ✅ Verifique se o bucket `documents` existe em **Storage**
- ✅ Confirme que o bucket é **privado** (não público)
- ✅ Execute primeiro `limpar_politicas.sql`, depois `database_setup_final.sql`

**Documentos desaparecem após reload**

- ✅ Execute primeiro `limpar_politicas.sql`, depois `database_setup_final.sql`
- ✅ Verifique se você está logado como admin ou como o cliente correto
- ✅ Confirme que as políticas de SELECT em `documents` estão corretas
- ✅ Limpe o cache do navegador (Ctrl + Shift + R)

### Problemas com Exclusão de Cliente

**Erro: "invalid input syntax for type uuid"**

- ✅ Este erro foi corrigido! Certifique-se de estar usando a versão mais recente do código
- ✅ O arquivo `src/contexts/ClientContext.tsx` deve usar `.eq('id', clientId)` em vez de `.match()`

**Cliente não é excluído**

- ✅ Confirme que você está logado como administrador
- ✅ Verifique as políticas DELETE em `clients` no Supabase
- ✅ Consulte o console do navegador (F12) para erros específicos

### Problemas de Performance

**Aplicação lenta ao carregar clientes**

- ✅ Verifique se há muitos documentos sem índices
- ✅ Considere adicionar paginação se houver >100 clientes
- ✅ Verifique a conexão com o Supabase

**Upload lento de documentos**

- ✅ Reduza o tamanho dos arquivos antes de fazer upload
- ✅ Verifique sua conexão de internet
- ✅ O Supabase gratuito tem limites de largura de banda

### Problemas de Deploy na Vercel

**Build falha na Vercel**

- ✅ Verifique se todas as dependências estão no `package.json`
- ✅ Confirme que as variáveis de ambiente estão configuradas na Vercel
- ✅ Rode `npm run build` localmente para verificar erros

**Aplicação funciona localmente mas não na Vercel**

- ✅ Verifique se as variáveis de ambiente estão corretas na Vercel
- ✅ Confirme que a URL do Supabase é a de produção, não localhost
- ✅ Verifique os logs de deploy na Vercel para erros específicos

---

## 📊 Scripts Disponíveis

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run build

# Preview do build de produção
npm run preview

# Linting do código
npm run lint
```

---

## 🔑 Emails de Administrador

Os seguintes emails têm privilégios de administrador hardcoded:

- `gadyel.bm@gmail.com`
- `gadielmachado.bm@gmail.com`
- `extfire.extfire@gmail.com`
- `paoliellocristiano@gmail.com`

Para adicionar mais administradores, edite a função `is_admin()` em `database_setup_final.sql` e execute novamente.

---

## 📞 Suporte e Documentação

### Documentação do Projeto

- **GUIA_COMPLETO.md** (este arquivo) - Guia completo de configuração
- **README.md** - Visão geral do projeto
- **CONFIGURAR_VERCEL.md** - Instruções específicas de deploy

### Links Úteis

- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação do React](https://react.dev)
- [Documentação do Vite](https://vitejs.dev)
- [Documentação do shadcn/ui](https://ui.shadcn.com)

### Suporte Técnico

Para problemas técnicos:

1. Verifique a seção [Troubleshooting](#troubleshooting) deste guia
2. Consulte os logs no console do navegador (F12)
3. Verifique os logs do Supabase em **Logs** no Dashboard
4. Consulte a documentação oficial do Supabase

---

## 🎓 Fluxo de Trabalho Recomendado

### Para Desenvolvimento

1. Sempre trabalhe em uma branch separada
2. Teste localmente antes de fazer commit
3. Use commits descritivos
4. Faça push regularmente para backup

### Para Deploy

1. Teste o build localmente: `npm run build && npm run preview`
2. Certifique-se de que não há erros no console
3. Faça commit das mudanças
4. A Vercel fará deploy automaticamente

### Para Manutenção do Banco

1. Sempre faça backup antes de alterar políticas RLS
2. Teste alterações em um projeto de desenvolvimento primeiro
3. Use o SQL Editor do Supabase para alterações
4. Documente todas as mudanças importantes

---

## ✅ Checklist de Configuração

Use este checklist para garantir que tudo está configurado corretamente:

### Configuração Inicial
- [ ] Node.js 18+ instalado
- [ ] Repositório clonado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env.local` criado com variáveis corretas

### Configuração Supabase
- [ ] Projeto criado no Supabase
- [ ] Script `limpar_politicas.sql` executado (limpar políticas antigas)
- [ ] Script `database_setup_final.sql` executado (criar configuração nova)
- [ ] Tabelas criadas: `clients`, `documents`, `user_profiles`
- [ ] Bucket `documents` criado no Storage (privado)
- [ ] Políticas RLS configuradas

### Teste Local
- [ ] Aplicação roda localmente (`npm run dev`)
- [ ] Consegue fazer login/registro
- [ ] Consegue criar clientes (como admin)
- [ ] Consegue fazer upload de documentos
- [ ] Consegue excluir clientes (como admin)

### Deploy (Opcional)
- [ ] Projeto conectado à Vercel
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy realizado com sucesso
- [ ] Aplicação funciona em produção

---

## 🎯 Próximos Passos

Após configurar tudo:

1. **Explore a aplicação**: Crie clientes, faça upload de documentos
2. **Customize**: Ajuste cores, logos e textos conforme necessário
3. **Expanda**: Adicione novas funcionalidades conforme sua necessidade
4. **Monitore**: Acompanhe uso e performance no Supabase Dashboard

---

**Desenvolvido com ❤️ para gestão eficiente de clientes**

*Última atualização: Novembro 2024*

