# 🚀 Guia de Início Rápido - ExtFire

## ⚡ Configuração em 5 Minutos

Este guia irá te ajudar a configurar o ExtFire rapidamente. Siga os passos abaixo na ordem.

---

## 🔧 Pré-requisitos

Antes de começar, certifique-se de ter:
- ✅ Acesso ao dashboard do Supabase
- ✅ Acesso ao projeto Vercel (se for fazer deploy)
- ✅ Node.js e npm instalados localmente

---

## 1️⃣ Configurar Service Role Key (1 min)

📁 Abra: `src/lib/supabaseAdmin.ts`

```typescript
// Linha 12 - Substitua:
const SERVICE_ROLE_KEY = "SUA_SERVICE_ROLE_KEY_AQUI";

// Por (obtenha no Dashboard do Supabase > Settings > API):
const SERVICE_ROLE_KEY = "sua-chave-service-role-real-aqui";
```

**Como obter a Service Role Key:**
1. Acesse: https://supabase.com → Seu Projeto
2. Clique em **Settings** (⚙️) no menu lateral
3. Vá para **API**
4. Procure por **service_role** na seção "Project API keys"
5. Copie a chave e substitua no arquivo

⚠️ **IMPORTANTE:** NUNCA compartilhe a SERVICE_ROLE_KEY publicamente!

---

## 2️⃣ Criar Tabelas no Banco de Dados (2 min)

### Passo a Passo:

1. Acesse: https://supabase.com → Seu Projeto
2. Clique em **SQL Editor** (ícone de código)
3. Clique em **+ New query**
4. **Copie TODO** o conteúdo do arquivo `database_setup_complete.sql`
5. **Cole** no editor
6. Clique em **Run** (ou pressione F5)

✅ **Sucesso**: Deve mostrar "CREATE TABLE", "CREATE INDEX", etc.

### Verificação:

Execute no SQL Editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'documents', 'user_profiles');
```

**Resultado esperado:** 3 linhas

---

## 3️⃣ Criar Bucket de Storage (30 seg)

1. No Supabase, clique em **Storage** (ícone de pasta)
2. Clique em **Create a new bucket**
3. Configure:
   - **Name**: `documents`
   - **Public**: ❌ Desmarque (deve ser privado)
4. Clique em **Create bucket**

✅ Bucket criado!

### Verificação:

```sql
SELECT * FROM storage.buckets WHERE id = 'documents';
```

**Resultado esperado:** 1 linha

---

## 4️⃣ Configurar Políticas de Storage (1 min)

1. Volte para **SQL Editor**
2. Clique em **+ New query**
3. **Copie TODO** o conteúdo do arquivo `storage_policies_completo.sql`
4. **Cole** no editor
5. Clique em **Run**

✅ Políticas criadas!

### Verificação:

```sql
SELECT COUNT(*) FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

**Resultado esperado:** 4 ou mais políticas

---

## 5️⃣ Configurar Variáveis de Ambiente na Vercel (1 min)

**Se você for fazer deploy na Vercel:**

1. Acesse: https://vercel.com → Seu Projeto
2. Settings → **Environment Variables**
3. Verifique se existem:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Se não existirem, **adicione** com os mesmos valores do `.env.local`
5. **Importante:** Após adicionar, você precisa fazer **Redeploy** do projeto!

✅ Variáveis OK!

**Para obter as credenciais:**
- `VITE_SUPABASE_URL`: Dashboard Supabase > Settings > API > Project URL
- `VITE_SUPABASE_ANON_KEY`: Dashboard Supabase > Settings > API > Project API keys > anon key

---

## 6️⃣ Criar Usuário Admin (1 min)

Você tem duas opções:

### Opção A - Via Aplicação (Recomendado):

```bash
npm run dev
# Acesse http://localhost:5173
# Clique em "Registrar"
# Preencha seus dados
```

Depois, no SQL Editor:
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'seu-email@exemplo.com';
```

### Opção B - Direto no Supabase:

1. **Authentication** > **Users** > **Add user**
2. Preencha email e senha
3. Execute no SQL Editor:
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'email-do-usuario@exemplo.com';
```

### Verificação:

```sql
SELECT email, role FROM user_profiles WHERE role = 'admin';
```

**Resultado esperado:** Seu email com role = 'admin'

---

## 7️⃣ Limpar Cache do Navegador (30 seg)

**IMPORTANTE:** Os dados antigos ainda podem estar no `localStorage` do navegador!

**No localhost:**
1. Abra o navegador
2. Aperte **F12** (DevTools)
3. Aba **Application** (ou Aplicativo)
4. Menu lateral: **Local Storage** > `http://localhost:5173`
5. Clique com botão direito > **Clear**
6. Recarregue a página (F5)

**Na Vercel:**
1. Acesse a URL do seu projeto na Vercel
2. Aperte **F12**
3. Aba **Application**
4. Menu lateral: **Local Storage** > sua URL
5. Clique com botão direito > **Clear**
6. Recarregue a página

**Em todos os navegadores/abas:**
- Repita o processo acima em **TODOS** os navegadores onde você testou

✅ Cache limpo!

---

## 8️⃣ Verificar Instalação (30 seg)

No SQL Editor, copie e execute: `verificacao_instalacao.sql`

✅ Deve mostrar: "🎉 INSTALAÇÃO COMPLETA E FUNCIONAL!"

---

## 🧪 Testar a Aplicação

### Iniciar Localmente:

```bash
# Instalar dependências (se ainda não instalou)
npm install

# Iniciar aplicação
npm run dev
```

Acesse: http://localhost:5173

### Teste Completo:

1. ✅ Login com usuário admin
2. ✅ Adicionar novo cliente (botão +)
3. ✅ Clicar no cliente
4. ✅ Upload de documento
5. ✅ Visualizar documento
6. ✅ Editar cliente
7. ✅ Deletar documento
8. ✅ Logout funciona

### Teste de Consistência:

1. Faça upload de um documento no **localhost**
2. Abra a aplicação na **Vercel** (se configurado)
3. Faça login com a **mesma conta**
4. ✅ **O documento DEVE aparecer!**

---

## 🚨 Solução de Problemas

### ❌ Erro: "Invalid API key"

**Solução:**
1. Verifique `src/integrations/supabase/client.ts`
2. Limpe cache: Ctrl+Shift+Delete
3. Faça logout e login novamente

### ❌ Erro: "relation does not exist"

**Solução:**
1. Execute `database_setup_complete.sql` novamente
2. Verifique no SQL Editor: `SELECT * FROM clients;`

### ❌ Erro ao fazer upload

**Solução:**
1. Verifique se bucket 'documents' existe (Storage > Buckets)
2. Verifique se o bucket é PRIVADO (não público)
3. Execute as políticas de storage (`storage_policies_completo.sql`)

### ❌ Não consigo criar cliente

**Solução:**
1. Verifique se seu usuário é admin:
   ```sql
   SELECT role FROM user_profiles WHERE email = 'seu-email';
   ```
2. Se não for admin, execute:
   ```sql
   UPDATE user_profiles SET role = 'admin' WHERE email = 'seu-email';
   ```

### ❌ Service Role Key não funciona

**Solução:**
1. Dashboard > Settings > API
2. Copie a chave "service_role" (não "anon")
3. Cole em `src/lib/supabaseAdmin.ts`
4. Reinicie a aplicação (Ctrl+C e npm run dev)

### ❌ Documentos não aparecem em outro ambiente

**Possíveis causas:**

1. **localStorage ainda está sendo usado:**
   - Limpe o localStorage em **todos** os navegadores (Passo 7)
   - Recarregue as páginas

2. **Tabelas não foram criadas:**
   - Execute o Passo 2 novamente
   - Execute `verificacao_instalacao.sql`

3. **Variáveis de ambiente diferentes:**
   - localhost usa `.env.local`
   - Vercel usa Environment Variables
   - **DEVEM SER IGUAIS!**
   - Copie exatamente os mesmos valores
   - Após alterar na Vercel, faça **Redeploy**

4. **Documentos foram salvos antes da correção:**
   - Documentos antigos ainda estão no localStorage
   - Você precisa fazer **re-upload** deles

---

## 📊 Verificação Completa

Execute no Supabase SQL Editor:

```sql
-- 1. Tabelas criadas?
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'documents', 'user_profiles');
-- Resultado esperado: 3 linhas

-- 2. Bucket criado?
SELECT * FROM storage.buckets WHERE id = 'documents';
-- Resultado esperado: 1 linha

-- 3. Políticas criadas?
SELECT COUNT(*) FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
-- Resultado esperado: 4 ou mais
```

---

## ✅ Tudo Funcionando?

Se os 8 passos + testes funcionaram:

```
🎉 PARABÉNS! Configuração completa!

Agora:
✅ Dados persistem no banco
✅ Mesmos dados em todo lugar
✅ Documentos sincronizados
✅ Multi-dispositivo funciona
✅ Sistema de autenticação funcionando
✅ Controle de acesso por roles
```

---

## 📚 Arquivos de Referência

| Arquivo | Para que serve | Quando usar |
|---------|---------------|-------------|
| `GUIA_INICIO.md` | Este arquivo - guia rápido | ⭐ Comece aqui |
| `README_RESTAURACAO.md` | Guia completo de restauração | Se tiver dúvidas detalhadas |
| `database_setup_complete.sql` | Script SQL completo | ⭐ Execute este |
| `storage_policies_completo.sql` | Políticas de storage | Após criar bucket |
| `verificacao_instalacao.sql` | Verificar instalação | Após executar SQL |
| `CONFIGURAR_VERCEL.md` | Guia de configuração Vercel | Para deploy |
| `CORRECAO_STORAGE.md` | Detalhes técnicos de storage | Para entender problemas |

---

## 🎯 Próximos Passos

Após completar a configuração:

1. ✅ Fazer backup inicial do banco de dados
2. ✅ Configurar backups regulares no Supabase
3. ✅ Adicionar mais usuários admin se necessário
4. ✅ Cadastrar seus clientes
5. ✅ Configurar domínio customizado (opcional)
6. ✅ Configurar SMTP profissional para emails (opcional)

---

## 📞 Informações do Projeto

- **URL Supabase**: https://dwhbznsijdsiwccamfvd.supabase.co
- **Project ID**: dwhbznsijdsiwccamfvd
- **Local**: http://localhost:5173
- **Vercel**: https://extfire.vercel.app (se configurado)

---

**Tempo total: ~5 minutos** ⏱️

**Última atualização**: Outubro 2025  
**Versão**: 2.0

---

**Dica**: Salve este arquivo como referência rápida! 🌟

