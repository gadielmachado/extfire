# 🔐 Guia Rápido: Variáveis de Ambiente na Vercel

## 🎯 Resumo Ultra Rápido (2 minutos)

### 1️⃣ Acesse a Vercel
```
https://vercel.com → Login → Seu Projeto → Settings → Environment Variables
```

### 2️⃣ Adicione APENAS Estas 2 Variáveis

#### ✅ Variável 1: URL do Supabase
```
Nome:  VITE_SUPABASE_URL
Valor: https://dwhbznsijdsiwccamfvd.supabase.co

Ambientes: ✅ Production  ✅ Preview  ✅ Development
```

#### ✅ Variável 2: Chave Pública (Anon Key)
```
Nome:  VITE_SUPABASE_ANON_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aGJ6bnNpamRzaXdjY2FtZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNzUyMTEsImV4cCI6MjA3NTY1MTIxMX0.WhU7sghKmYJTARkulQmDId8obT_iCcI5xMHKdDdItjg

Ambientes: ✅ Production  ✅ Preview  ✅ Development
```

### 3️⃣ Fazer Redeploy
```
Vercel → Deployments → Último Deploy → ••• → Redeploy
```

---

## 📸 Passo a Passo Visual

### Passo 1: Acesse Environment Variables

```
vercel.com
  ↓
Dashboard
  ↓
Seu Projeto (extfire)
  ↓
Settings (⚙️)
  ↓
Environment Variables (menu lateral)
```

### Passo 2: Clique "Add New"

Você verá um formulário com:
- **Name** (nome da variável)
- **Value** (valor da variável)
- **Environments** (onde usar: Production, Preview, Development)

### Passo 3: Preencha a Primeira Variável

```
┌─────────────────────────────────────────┐
│ Add New Environment Variable            │
├─────────────────────────────────────────┤
│                                         │
│ Name:  VITE_SUPABASE_URL               │
│        ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔          │
│                                         │
│ Value: https://dwhbznsijdsiwccamfvd... │
│        ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔   │
│                                         │
│ Select Environments:                    │
│ ☑ Production                           │
│ ☑ Preview                              │
│ ☑ Development                          │
│                                         │
│         [Save]  [Cancel]                │
└─────────────────────────────────────────┘
```

### Passo 4: Repita para a Segunda Variável

```
┌─────────────────────────────────────────┐
│ Add New Environment Variable            │
├─────────────────────────────────────────┤
│                                         │
│ Name:  VITE_SUPABASE_ANON_KEY          │
│        ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔        │
│                                         │
│ Value: eyJhbGciOiJIUzI1NiIsInR5cCI... │
│        ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔   │
│                                         │
│ Select Environments:                    │
│ ☑ Production                           │
│ ☑ Preview                              │
│ ☑ Development                          │
│                                         │
│         [Save]  [Cancel]                │
└─────────────────────────────────────────┘
```

### Passo 5: Verificar Variáveis Criadas

Após salvar, você verá:

```
Environment Variables
─────────────────────────────────────────
✓ VITE_SUPABASE_URL
  Production, Preview, Development
  [Edit] [Delete]

✓ VITE_SUPABASE_ANON_KEY  
  Production, Preview, Development
  [Edit] [Delete]
─────────────────────────────────────────
```

### Passo 6: Fazer Redeploy

```
Deployments (aba superior)
  ↓
Último deployment (clique nos três pontos •••)
  ↓
Redeploy
  ↓
Confirmar
  ↓
Aguardar build (1-2 minutos)
  ↓
✅ Done!
```

---

## ⚠️ IMPORTANTE: O Que NÃO Fazer

### ❌ NUNCA adicione na Vercel:

```
❌ VITE_SERVICE_ROLE_KEY
❌ SERVICE_ROLE_KEY
❌ SUPABASE_SERVICE_KEY
❌ Qualquer chave com "service_role"
```

**Por quê?**
- Service Role Key tem **acesso total** ao banco
- Pode **deletar tudo**
- Pode **ignorar segurança**
- É **extremamente perigosa** se exposta

### ✅ Service Role Key é APENAS para:
- Backend/API Routes
- Edge Functions do Supabase
- Scripts administrativos locais
- **NUNCA no frontend**

---

## 🔒 Segurança: Onde Cada Chave Deve Estar

### Chaves Públicas (Seguras para Frontend)

| Chave | Local | Vercel | Git |
|-------|-------|--------|-----|
| `VITE_SUPABASE_URL` | ✅ Sim | ✅ Sim | ✅ Sim* |
| `VITE_SUPABASE_ANON_KEY` | ✅ Sim | ✅ Sim | ✅ Sim* |

*Pode commitar porque são públicas e têm proteção RLS

### Chaves Secretas (APENAS Backend)

| Chave | Local | Vercel | Git |
|-------|-------|--------|-----|
| `SERVICE_ROLE_KEY` | 🏠 Local apenas | ❌ NÃO | ❌ NUNCA |
| Senhas SMTP | 🏠 Local apenas | 🔒 Backend apenas | ❌ NUNCA |
| API Keys externas | 🏠 Local apenas | 🔒 Backend apenas | ❌ NUNCA |

---

## 📋 Checklist de Configuração

### ✅ Local (Desenvolvimento)

- [ ] Arquivo `.env.local` criado
- [ ] Contém `VITE_SUPABASE_URL`
- [ ] Contém `VITE_SUPABASE_ANON_KEY`
- [ ] `.env.local` está no `.gitignore`
- [ ] Aplicação funciona localmente

### ✅ Vercel (Produção)

- [ ] Variável `VITE_SUPABASE_URL` adicionada
- [ ] Variável `VITE_SUPABASE_ANON_KEY` adicionada
- [ ] Ambas marcadas para Production, Preview e Development
- [ ] Redeploy feito após adicionar variáveis
- [ ] Build completou com sucesso
- [ ] Aplicação funciona na Vercel

### ✅ Supabase

- [ ] Site URL configurado: `https://extfire.vercel.app`
- [ ] Redirect URLs configuradas:
  - [ ] `http://localhost:5173/**`
  - [ ] `https://extfire.vercel.app/**`
  - [ ] `https://*.vercel.app/**`
- [ ] Scripts SQL executados (`limpar_politicas.sql` + `database_setup_final.sql`)

---

## 🚀 Comandos Úteis (Alternativa CLI)

Se preferir usar terminal:

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Adicionar variáveis
vercel env add VITE_SUPABASE_URL production
# Cole: https://dwhbznsijdsiwccamfvd.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Cole: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 4. Deploy
vercel --prod
```

---

## 🆘 Troubleshooting

### Problema: "Build Failed"

**Causa comum:** Variáveis não foram detectadas

**Solução:**
1. Verifique se os nomes estão EXATAMENTE corretos:
   - `VITE_SUPABASE_URL` (não `SUPABASE_URL`)
   - `VITE_SUPABASE_ANON_KEY` (não `SUPABASE_KEY`)
2. Verifique se estão marcadas para "Production"
3. Faça redeploy

### Problema: "Aplicação não conecta ao Supabase"

**Causa comum:** Variáveis não aplicadas ao build

**Solução:**
1. Adicione as variáveis
2. Faça **redeploy** (IMPORTANTE!)
3. Aguarde o build completar
4. Limpe cache do navegador (Ctrl + Shift + R)

### Problema: "Invalid API Key"

**Causa comum:** Copiou a chave errada

**Solução:**
1. Vá ao Supabase Dashboard > Settings > API
2. Copie a **anon public** key (não a service_role)
3. Atualize na Vercel
4. Faça redeploy

---

## 📚 Links de Referência

- [Documentação Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Documentação Supabase - API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Vite - Env Variables](https://vitejs.dev/guide/env-and-mode.html)

---

## 🎓 Como Funciona?

### Durante o Build:

1. Vercel lê as variáveis de ambiente
2. Vite substitui `import.meta.env.VITE_SUPABASE_URL` pelo valor real
3. Código final **não tem** referências a variáveis de ambiente
4. Valores ficam "baked in" no build

### Por Isso:

- ✅ É seguro usar variáveis públicas (Anon Key)
- ❌ Nunca use variáveis secretas (Service Role)
- 🔄 Precisa redeploy se mudar as variáveis

---

**Última Atualização:** Novembro 2024  
**Versão:** 2.1

---

**🎯 Resumo Final:**

```bash
1. Vercel → Settings → Environment Variables
2. Add: VITE_SUPABASE_URL
3. Add: VITE_SUPABASE_ANON_KEY
4. Redeploy
5. ✅ Pronto!
```

**Tempo estimado:** 2 minutos  
**Dificuldade:** ⭐ Fácil

