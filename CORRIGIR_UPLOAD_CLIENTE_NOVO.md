# 🔧 CORREÇÃO: Upload para Cliente Novo com ID Errado

## 🔍 Problema Identificado

Cliente novo `elisiaautomacao@gmail.com` criado com ID `67538794-9d53-4144-a25c-6431bbe35cd5`, mas documentos foram salvos com **outro client_id**.

---

## ✅ PASSO 1: Diagnóstico (Descobrir o problema)

Execute no **Supabase SQL Editor**:

```sql
-- Ver o cliente novo e seu ID correto
SELECT 
  'CLIENTE NOVO' as tipo,
  id as client_id_correto,
  name,
  email
FROM public.clients
WHERE email = 'elisiaautomacao@gmail.com';

-- Ver TODOS os documentos e para qual cliente estão apontando
SELECT 
  'DOCUMENTOS' as tipo,
  d.id as doc_id,
  d.name as documento,
  d.client_id as client_id_atual,
  c.name as cliente_nome,
  c.email as cliente_email,
  CASE 
    WHEN c.email = 'elisiaautomacao@gmail.com' THEN 'OK ✅'
    WHEN c.email IS NULL THEN 'ÓRFÃO ❌'
    ELSE 'CLIENTE ERRADO ❌'
  END as status
FROM public.documents d
LEFT JOIN public.clients c ON c.id = d.client_id
ORDER BY d.upload_date DESC;
```

**Anote**:
- O `client_id_correto` do cliente novo
- Quais documentos têm `status = CLIENTE ERRADO ❌` ou `ÓRFÃO ❌`

---

## ✅ PASSO 2: Correção dos Documentos Existentes

### Opção A: Corrigir documento específico

```sql
-- Substitua os IDs corretos
UPDATE public.documents
SET client_id = '67538794-9d53-4144-a25c-6431bbe35cd5'  -- ID do cliente novo
WHERE id = 'ID_DO_DOCUMENTO_QUE_PRECISA_CORRIGIR';
```

### Opção B: Corrigir TODOS os documentos órfãos mais recentes

Se você sabe que os últimos documentos uploadados pertencem ao cliente novo:

```sql
-- Corrigir os 2 documentos mais recentes para elisiaautomacao
UPDATE public.documents
SET client_id = (
  SELECT id FROM public.clients WHERE email = 'elisiaautomacao@gmail.com'
)
WHERE id IN (
  SELECT id FROM public.documents
  ORDER BY upload_date DESC
  LIMIT 2  -- Ajuste conforme necessário
);
```

### Opção C: Corrigir por nome de arquivo

Se você souber o nome do arquivo:

```sql
UPDATE public.documents
SET client_id = (
  SELECT id FROM public.clients WHERE email = 'elisiaautomacao@gmail.com'
)
WHERE name LIKE '%nome_do_arquivo%';
```

---

## ✅ PASSO 3: Verificar Correção

```sql
SELECT 
  c.name as cliente,
  c.email,
  c.id as client_id,
  COUNT(d.id) as total_docs,
  array_agg(d.name) as documentos
FROM public.clients c
LEFT JOIN public.documents d ON d.client_id = c.id
WHERE c.email = 'elisiaautomacao@gmail.com'
GROUP BY c.id, c.name, c.email;
```

**Resultado esperado**: `total_docs` deve ser > 0 e `documentos` deve listar os arquivos

---

## ✅ PASSO 4: Testar Novos Uploads

1. **Recarregue a aplicação** (Ctrl+Shift+R)
2. **Faça login como admin**
3. **Selecione** o cliente `elisiaautomacao@gmail.com`
4. **Faça upload** de um arquivo de teste
5. **Verifique os logs** no console (F12):

```
📤 Iniciando upload de documento: {
  arquivo: "teste.txt",
  clienteNome: "Nome do Cliente",
  clienteId: "67538794-9d53-4144-a25c-6431bbe35cd5",  ← Deve ser este!
  clienteEmail: "elisiaautomacao@gmail.com"
}
💾 Salvando documento no banco: {
  documentoId: "...",
  clienteId: "67538794-9d53-4144-a25c-6431bbe35cd5",  ← Deve ser o mesmo!
  nome: "teste.txt"
}
```

6. **Faça login como cliente** (`elisiaautomacao@gmail.com`)
7. **Verifique** se o documento aparece ✅

---

## 🐛 Se o Problema Persistir

### Causa Possível: Cliente selecionado está desatualizado

Execute este SQL para verificar sincronização:

```sql
-- Verificar se user_profile, clients e auth.users estão sincronizados
SELECT 
  c.email,
  c.name as cliente_name,
  c.id as client_id_tabela,
  up.client_id as client_id_user_profile,
  au.raw_user_meta_data->>'clientId' as client_id_metadata,
  CASE 
    WHEN c.id::text = up.client_id::text 
      AND c.id::text = au.raw_user_meta_data->>'clientId'
    THEN 'SINCRONIZADO ✅'
    ELSE 'DESCASADO ❌'
  END as status
FROM public.clients c
LEFT JOIN public.user_profiles up ON up.email = c.email
LEFT JOIN auth.users au ON au.email = c.email
WHERE c.email = 'elisiaautomacao@gmail.com';
```

Se mostrar `DESCASADO ❌`, execute:

```sql
-- Sincronizar tudo
UPDATE public.user_profiles up
SET client_id = c.id, name = c.name, cnpj = c.cnpj, updated_at = NOW()
FROM public.clients c
WHERE up.email = c.email AND c.email = 'elisiaautomacao@gmail.com';

UPDATE auth.users au
SET raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{clientId}', to_jsonb(c.id::text)
      ),
      '{name}', to_jsonb(c.name)
    ),
    '{cnpj}', to_jsonb(c.cnpj)
  ),
  updated_at = NOW()
FROM public.clients c
WHERE au.email = c.email AND c.email = 'elisiaautomacao@gmail.com';
```

---

## 📊 Resumo da Solução

1. ✅ **Logs adicionados** no upload para debug
2. ✅ **Script SQL** para corrigir documentos existentes
3. ✅ **Script SQL** para sincronizar user_profile
4. ✅ **Testes** para validar correção

---

## 🎯 Resultado Esperado

Após executar as correções:

- ✅ Documentos antigos associados ao cliente correto
- ✅ Novos uploads vão para o cliente correto
- ✅ Cliente vê todos os seus documentos
- ✅ Logs mostram client_id correto no upload

---

**Execute os scripts SQL e teste novamente!** 🚀

