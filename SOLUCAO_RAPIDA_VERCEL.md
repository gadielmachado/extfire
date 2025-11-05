# 🚨 Solução Rápida - Login Não Funciona na Vercel

## ❌ Problema
- ✅ Funciona no localhost
- ❌ Na Vercel: "Email ou senha inválidos"

## 🎯 Solução em 3 Minutos

### 1️⃣ Adicionar Variáveis na Vercel

**👉 Acesse:** https://vercel.com/gadielmachado/extfire/settings/environment-variables

Ou manualmente:
1. https://vercel.com/ → Login
2. Projeto **extfire** → **Settings** → **Environment Variables**

### 2️⃣ Adicionar Estas 2 Variáveis

#### **Variável 1:**
```
Nome: VITE_SUPABASE_URL
Valor: https://dwhbznsijdsiwccamfvd.supabase.co
Environments: ✅ Production ✅ Preview ✅ Development
```

#### **Variável 2:**
```
Nome: VITE_SUPABASE_ANON_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aGJ6bnNpamRzaXdjY2FtZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNzUyMTEsImV4cCI6MjA3NTY1MTIxMX0.WhU7sghKmYJTARkulQmDId8obT_iCcI5xMHKdDdItjg
Environments: ✅ Production ✅ Preview ✅ Development
```

**👉 Clique "Save" em cada uma**

### 3️⃣ Fazer Redeploy

**Opção A - Via Vercel Dashboard:**
1. Aba **Deployments**
2. Último deployment → **••• (três pontos)**
3. **Redeploy**

**Opção B - Via Git:**
```bash
git commit --allow-empty -m "trigger redeploy"
git push origin master
```

### 4️⃣ Configurar URLs no Supabase

**👉 Acesse:** https://dwhbznsijdsiwccamfvd.supabase.co/project/dwhbznsijdsiwccamfvd/auth/url-configuration

Ou manualmente:
1. Dashboard Supabase
2. **Authentication** → **URL Configuration**

**Site URL:**
```
https://extfire.vercel.app
```

**Redirect URLs:**
```
http://localhost:5173/**
https://extfire.vercel.app/**
https://*.vercel.app/**
```

**👉 Clique "Save"**

---

## ✅ Testar

1. Aguarde o deploy terminar (1-2 minutos)
2. Acesse: https://extfire.vercel.app
3. Faça login
4. **Deve funcionar! 🎉**

---

## 🐛 Ainda Não Funciona?

### Problema: "Email ou senha inválidos"

**Causa:** Usuário não existe no novo banco de dados

**Solução:**
1. Confirme que executou `database_setup_rapido.sql`
2. Crie o usuário novamente:
   - Localhost: registre-se
   - SQL Editor:
     ```sql
     UPDATE user_profiles SET role = 'admin' WHERE email = 'seu-email';
     ```

### Problema: Erro ao recuperar senha

**Causa:** SMTP ou URLs não configuradas

**Solução Rápida:**
1. Use o SMTP padrão do Supabase (já funciona)
2. Configure as URLs (passo 4 acima)
3. Verifique se o email existe:
   ```sql
   SELECT email FROM auth.users;
   ```

---

## 📞 Links Diretos

- **Vercel Env Vars**: https://vercel.com/gadielmachado/extfire/settings/environment-variables
- **Vercel Deployments**: https://vercel.com/gadielmachado/extfire/deployments
- **Supabase Auth**: https://dwhbznsijdsiwccamfvd.supabase.co/project/dwhbznsijdsiwccamfvd/auth/url-configuration
- **Site**: https://extfire.vercel.app

---

**⏱️ Tempo total: ~3 minutos**

Para guia detalhado, veja: `CONFIGURAR_VERCEL.md`

