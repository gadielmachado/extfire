# 🎯 GUIA RÁPIDO - 5 Minutos

## ⚡ O Que Você Precisa Fazer AGORA

### 1️⃣ SUPABASE - Criar Tabelas (2 min)
```
1. Abrir: https://supabase.com → Seu Projeto
2. Clicar: SQL Editor
3. Copiar: database_setup_complete.sql
4. Colar e Executar (Run)
✅ Success!
```

### 2️⃣ SUPABASE - Criar Bucket (30 seg)
```
1. Clicar: Storage
2. Create bucket
3. Nome: documents
4. Public: ✅ Sim
5. Create
✅ Bucket criado!
```

### 3️⃣ SUPABASE - Políticas (1 min)
```
1. Voltar: SQL Editor
2. Copiar: storage_policies_completo.sql
3. Colar e Executar
✅ Políticas criadas!
```

### 4️⃣ VERCEL - Variáveis (1 min)
```
1. Abrir: https://vercel.com → Seu Projeto
2. Settings → Environment Variables
3. Verificar se tem:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
4. Se não tiver, copiar do .env.local
5. Redeploy (Deployments → ... → Redeploy)
✅ Variáveis OK!
```

### 5️⃣ NAVEGADOR - Limpar Cache (30 seg)
```
1. Abrir DevTools: F12
2. Application → Local Storage
3. Clicar com direita → Clear
4. Recarregar página: F5
✅ Cache limpo!
```

## 🧪 Teste Rápido

```
1. Login no localhost
2. Upload de 1 documento
3. Abrir Vercel (extfire.vercel.app)
4. Login com mesma conta
5. Documento aparece? ✅ FUNCIONOU!
```

## 🔥 Se NÃO Funcionar

### Documento não aparece?
```
→ Limpou localStorage? (Passo 5)
→ Executou SQL? (Passo 1)
→ Criou bucket? (Passo 2)
→ Variáveis iguais? (Passo 4)
```

### Erro ao salvar?
```
→ Tabelas criadas? Execute:
  SELECT * FROM documents;
  
→ Se erro "not exist":
  Execute database_setup_complete.sql novamente
```

### Não sou admin?
```sql
-- Execute no Supabase SQL Editor:
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, '{role}', '"admin"'
)
WHERE email = 'seu-email@gmail.com';

-- Logout e login novamente
```

## 📊 Verificação Completa

```sql
-- Execute no Supabase SQL Editor:

-- 1. Tabelas criadas?
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'documents', 'user_profiles');
-- Resultado: 3 linhas

-- 2. Bucket criado?
SELECT * FROM storage.buckets WHERE id = 'documents';
-- Resultado: 1 linha

-- 3. Políticas criadas?
SELECT COUNT(*) FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
-- Resultado: 4 ou mais
```

## ✅ Tudo Funcionando?

Se os 5 passos + teste funcionaram:
```
🎉 PARABÉNS! Problema resolvido!

Agora:
✅ Dados persistem no banco
✅ Mesmos dados em todo lugar
✅ Documentos sincronizados
✅ Multi-dispositivo funciona
```

## 📚 Mais Informações

- **Detalhes técnicos:** `CORRECAO_STORAGE_COMPLETA.md`
- **Guia completo:** `LEIA_ME_URGENTE.md`
- **Políticas Storage:** `storage_policies_completo.sql`
- **Verificar config:** `verificar_configuracao_supabase.sql`

---

**Tempo total: ~5 minutos** ⏱️

