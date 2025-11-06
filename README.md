# ExtFire - Sistema de Gestão de Clientes

Sistema completo de gerenciamento de clientes com autenticação, controle de documentos e dashboard administrativo.

## 🚀 Início Rápido

Para começar rapidamente, siga o guia completo:

👉 **[GUIA_COMPLETO.md](GUIA_COMPLETO.md)** ⭐ - Guia completo de configuração e uso

---

## 📚 Documentação

### Guia Principal

- **[GUIA_COMPLETO.md](GUIA_COMPLETO.md)** ⭐ - Guia completo com todas as instruções
- **[CONFIGURAR_VERCEL.md](CONFIGURAR_VERCEL.md)** - Detalhes específicos de deploy na Vercel

### Script SQL

- **[database_setup_final.sql](database_setup_final.sql)** ⭐ - Script ÚNICO e DEFINITIVO de configuração do banco

---

## 🛠️ Tecnologias

Este projeto é construído com:

- **Vite** - Build tool e dev server
- **TypeScript** - Tipagem estática
- **React** - Biblioteca UI
- **shadcn-ui** - Componentes UI
- **Tailwind CSS** - Estilização
- **Supabase** - Backend (PostgreSQL + Auth + Storage)

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

- Node.js 18+ e npm instalados
- Conta no Supabase
- Conta na Vercel (para deploy)

---

## ⚙️ Instalação

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
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 4. Configurar Service Role Key

Edite `src/lib/supabaseAdmin.ts` e adicione sua Service Role Key:

```typescript
const SERVICE_ROLE_KEY = "sua-service-role-key-aqui";
```

### 5. Executar Scripts SQL

No Supabase Dashboard:
1. Acesse SQL Editor
2. Execute `database_setup_final.sql` (script completo)

👉 **Veja [GUIA_COMPLETO.md](GUIA_COMPLETO.md) para instruções detalhadas**

### 6. Iniciar Aplicação

```bash
npm run dev
```

Acesse: http://localhost:5173

---

## 🎯 Funcionalidades

### Autenticação
- ✅ Login/Logout
- ✅ Registro de usuários
- ✅ Recuperação de senha
- ✅ Controle de sessão

### Gestão de Clientes
- ✅ Cadastro com CNPJ
- ✅ Edição de informações
- ✅ Sistema de bloqueio
- ✅ Controle de data de manutenção
- ✅ Pesquisa e filtros

### Gestão de Documentos
- ✅ Upload de arquivos (PDF, Word, imagens)
- ✅ Visualização segura
- ✅ Organização por cliente
- ✅ Deleção controlada

### Segurança
- ✅ Row Level Security (RLS)
- ✅ Controle de acesso por roles (Admin/Client)
- ✅ Storage privado
- ✅ Políticas granulares de acesso

### Interface
- ✅ Dashboard administrativo
- ✅ Visualização de detalhes
- ✅ Notificações em tempo real
- ✅ Design moderno e responsivo

---

## 📁 Estrutura do Projeto

```
extfire-master/
├── src/
│   ├── components/          # Componentes React
│   │   ├── ui/             # Componentes UI (shadcn)
│   │   └── ...             # Componentes específicos
│   ├── contexts/           # Context API
│   ├── hooks/              # Custom hooks
│   ├── integrations/       # Integrações (Supabase)
│   ├── lib/                # Utilitários e serviços
│   ├── pages/              # Páginas da aplicação
│   └── types/              # Definições TypeScript
├── public/                 # Arquivos estáticos
├── database_setup_final.sql    # ⭐ Script SQL ÚNICO e DEFINITIVO
├── GUIA_COMPLETO.md           # ⭐ Guia completo de configuração
└── ...                     # Outras configurações
```

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Linting
npm run lint
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

- **`clients`** - Dados dos clientes
- **`documents`** - Metadados dos documentos
- **`user_profiles`** - Perfis de usuários vinculados ao auth

### Recursos

- Row Level Security (RLS) habilitado
- 15+ políticas de segurança
- Triggers para timestamps automáticos
- Índices para performance
- Foreign keys para integridade

👉 **Veja [GUIA_COMPLETO.md](GUIA_COMPLETO.md) para detalhes completos**

---

## 🚀 Deploy

### Vercel

1. Conecte seu repositório à Vercel
2. Configure as variáveis de ambiente
3. Faça deploy

👉 **Veja [CONFIGURAR_VERCEL.md](CONFIGURAR_VERCEL.md) para instruções detalhadas**

---

## 🐛 Solução de Problemas

### Problemas Comuns

- **"Invalid API key"** → Verifique as variáveis de ambiente
- **"relation does not exist"** → Execute `database_setup_complete.sql`
- **Erro ao fazer upload** → Verifique bucket e políticas de storage
- **"permission denied"** → Verifique se o usuário é admin

👉 **Veja [GUIA_COMPLETO.md](GUIA_COMPLETO.md) seção Troubleshooting para mais soluções**

---

## 📞 Suporte

### Links Úteis

- **Supabase Dashboard**: https://dwhbznsijdsiwccamfvd.supabase.co
- **Documentação Supabase**: https://supabase.com/docs
- **Documentação React**: https://react.dev

### Documentação do Projeto

- [GUIA_COMPLETO.md](GUIA_COMPLETO.md) ⭐ - Guia completo e definitivo
- [CONFIGURAR_VERCEL.md](CONFIGURAR_VERCEL.md) - Deploy na Vercel

---

## 📝 Licença

Este projeto é propriedade privada.

---

## 🙏 Contribuições

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📊 Status do Projeto

- ✅ Autenticação funcionando
- ✅ Gestão de clientes funcionando
- ✅ Upload de documentos funcionando
- ✅ Sistema de permissões funcionando
- ✅ Deploy na Vercel configurado

---

**Última atualização**: Novembro 2024  
**Versão**: 2.1  
**Status**: ✅ Produção

---

**Desenvolvido com ❤️ para gerenciamento eficiente de clientes**
