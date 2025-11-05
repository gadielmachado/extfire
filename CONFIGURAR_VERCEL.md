# 🚀 Configurar Variáveis de Ambiente na Vercel

## ⚠️ Problema Identificado

Você está conseguindo fazer login no **localhost** mas na **Vercel** aparece:
- ❌ "Email ou senha inválidos"
- ❌ "Não foi possível enviar email de recuperação"

### 🔍 Causa do Problema

A Vercel está usando as **credenciais antigas** do Supabase! As novas credenciais só estão no código local.

---

## ✅ Solução: Configurar Variáveis de Ambiente

### 📋 Credenciais Necessárias

```
VITE_SUPABASE_URL=https://dwhbznsijdsiwccamfvd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aGJ6bnNpamRzaXdjY2FtZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNzUyMTEsImV4cCI6MjA3NTY1MTIxMX0.WhU7sghKmYJTARkulQmDId8obT_iCcI5xMHKdDdItjg
```

---

## 🔧 Passo a Passo na Vercel

### **Método 1: Via Dashboard Vercel (Recomendado)** 👍

#### **Passo 1: Acessar o Projeto**
1. Acesse: https://vercel.com/
2. Faça login
3. Clique no projeto **extfire**

#### **Passo 2: Ir para Settings**
1. Clique na aba **Settings** (⚙️)
2. No menu lateral, clique em **Environment Variables**

#### **Passo 3: Adicionar Variáveis**

**Variável 1:**
- **Key (Nome)**: `VITE_SUPABASE_URL`
- **Value (Valor)**: `https://dwhbznsijdsiwccamfvd.supabase.co`
- **Environments**: ✅ Marque **Production**, **Preview** e **Development**
- Clique **Save**

**Variável 2:**
- **Key (Nome)**: `VITE_SUPABASE_ANON_KEY`
- **Value (Valor)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aGJ6bnNpamRzaXdjY2FtZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNzUyMTEsImV4cCI6MjA3NTY1MTIxMX0.WhU7sghKmYJTARkulQmDId8obT_iCcI5xMHKdDdItjg`
- **Environments**: ✅ Marque **Production**, **Preview** e **Development**
- Clique **Save**

#### **Passo 4: Fazer Redeploy**

Após adicionar as variáveis:

**Opção A - Via Dashboard:**
1. Vá para a aba **Deployments**
2. Clique nos **três pontos** (•••) no último deployment
3. Clique em **Redeploy**
4. Confirme

**Opção B - Fazer novo Push:**
```bash
git commit --allow-empty -m "trigger vercel redeploy"
git push origin master
```

---

### **Método 2: Via CLI Vercel** 💻

Se preferir usar a linha de comando:

#### **Passo 1: Instalar Vercel CLI**
```bash
npm install -g vercel
```

#### **Passo 2: Login**
```bash
vercel login
```

#### **Passo 3: Adicionar Variáveis**
```bash
vercel env add VITE_SUPABASE_URL production
# Cole o valor: https://dwhbznsijdsiwccamfvd.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Cole o valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Passo 4: Fazer Deploy**
```bash
vercel --prod
```

---

## 🔐 Configuração de Email no Supabase

Para o email de recuperação funcionar, você precisa configurar o SMTP no Supabase:

### **Passo 1: Acessar Settings**
1. Dashboard Supabase: https://dwhbznsijdsiwccamfvd.supabase.co
2. Settings > **Authentication**

### **Passo 2: Configurar Email Templates**
1. Clique em **Email Templates**
2. Verifique se os templates estão habilitados:
   - ✅ **Confirm signup**
   - ✅ **Magic Link**
   - ✅ **Reset Password**

### **Passo 3: Configurar SMTP (Opcional mas Recomendado)**

Por padrão, o Supabase usa o próprio SMTP (limitado). Para produção, configure um provedor:

#### **Opção A: Gmail/Google Workspace**
1. Settings > Authentication > **SMTP Settings**
2. Configure:
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587`
   - **SMTP User**: seu-email@gmail.com
   - **SMTP Password**: senha de app (não sua senha normal)
   - **Sender Email**: seu-email@gmail.com
   - **Sender Name**: ExtFire

#### **Opção B: SendGrid (Gratuito até 100 emails/dia)**
1. Crie conta: https://sendgrid.com/
2. Obtenha API Key
3. Configure no Supabase:
   - **SMTP Host**: `smtp.sendgrid.net`
   - **SMTP Port**: `587`
   - **SMTP User**: `apikey`
   - **SMTP Password**: sua-api-key-do-sendgrid

#### **Opção C: Usar SMTP Padrão do Supabase**
- Limite: 3-4 emails por hora
- Suficiente para desenvolvimento e testes
- **Nenhuma configuração necessária**

### **Passo 4: Configurar URLs de Redirecionamento**

1. Settings > Authentication > **URL Configuration**
2. Adicione suas URLs:

**Site URL:**
```
https://extfire.vercel.app
```

**Redirect URLs (uma por linha):**
```
http://localhost:5173/**
https://extfire.vercel.app/**
https://*.vercel.app/**
```

3. Clique **Save**

---

## ✅ Verificar se Funcionou

### **Teste 1: Verificar Build**
1. Vá para Deployments na Vercel
2. Clique no último deployment
3. Vá para **Build Logs**
4. Procure por: "Environment Variables" ou "VITE_SUPABASE_URL"
5. Deve mostrar as variáveis configuradas

### **Teste 2: Testar Login**
1. Acesse: https://extfire.vercel.app
2. Tente fazer login com um usuário existente
3. ✅ Deve funcionar agora!

### **Teste 3: Testar Recuperação de Senha**
1. Clique em "Esqueci minha senha"
2. Digite um email cadastrado
3. ✅ Deve receber email (pode demorar alguns minutos)

---

## 🐛 Solução de Problemas

### ❌ Ainda aparece "Email ou senha inválidos"

**Verifique:**
1. As variáveis foram salvas corretamente?
   - Vercel > Settings > Environment Variables
2. Foi feito redeploy após adicionar as variáveis?
   - Deployments > Redeploy
3. O usuário existe no novo banco de dados?
   - Execute no SQL Editor:
     ```sql
     SELECT email FROM user_profiles;
     ```

**Solução:**
- Se o usuário não existe, crie-o novamente
- Verifique se executou o `database_setup_rapido.sql`

### ❌ Erro ao enviar email de recuperação

**Possíveis Causas:**

**1. Email não cadastrado**
```sql
-- Verifique se o email existe
SELECT email FROM auth.users WHERE email = 'seu-email@exemplo.com';
```

**2. SMTP não configurado corretamente**
- Supabase > Authentication > SMTP Settings
- Teste com o SMTP padrão primeiro

**3. URLs de redirecionamento não configuradas**
- Supabase > Authentication > URL Configuration
- Adicione: `https://extfire.vercel.app/**`

**4. Email na caixa de spam**
- Verifique a pasta de spam/lixo eletrônico

**5. Limite de emails atingido (SMTP gratuito)**
- Aguarde 1 hora
- Ou configure SMTP próprio (Gmail/SendGrid)

### ❌ Build falha na Vercel

**Verifique:**
```bash
# Localmente, teste o build
npm run build
```

Se funcionar localmente mas falhar na Vercel:
1. Vercel > Settings > General
2. Verifique **Framework Preset**: deve ser "Vite"
3. Verifique **Build Command**: `npm run build`
4. Verifique **Output Directory**: `dist`

---

## 📝 Checklist Final

- [ ] Variáveis de ambiente adicionadas na Vercel
- [ ] Redeploy feito após adicionar variáveis
- [ ] URLs de redirecionamento configuradas no Supabase
- [ ] Banco de dados restaurado com `database_setup_rapido.sql`
- [ ] Usuário admin criado no novo banco
- [ ] Testado login na Vercel
- [ ] Testado recuperação de senha (opcional)

---

## 🎯 Resumo Rápido

**Para funcionar na Vercel, você precisa:**

1. ✅ Adicionar 2 variáveis de ambiente na Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. ✅ Fazer redeploy do projeto

3. ✅ Configurar URLs de redirecionamento no Supabase

4. ✅ Ter o banco de dados restaurado e usuários criados

---

## 📞 Links Úteis

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Seu Projeto**: https://vercel.com/gadielmachado/extfire
- **Supabase Dashboard**: https://dwhbznsijdsiwccamfvd.supabase.co
- **Site em Produção**: https://extfire.vercel.app

---

## 🚀 Depois que Funcionar

Considere também:

1. **Configurar domínio customizado** (opcional)
   - Vercel > Settings > Domains
   
2. **Configurar SMTP profissional** (recomendado)
   - Para emails mais confiáveis
   
3. **Habilitar Analytics** (opcional)
   - Vercel > Analytics

---

**Última Atualização**: 10 de Outubro de 2025  
**Projeto**: ExtFire

---

**💡 Dica**: Salve este arquivo para referência futura quando precisar fazer deploy de projetos com Supabase!

