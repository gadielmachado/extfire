# ⚡ EXECUTAR ISTO - URGENTE

## PASSO 1: Execute Este SQL

Abra **Supabase → SQL Editor** e cole:

```sql
-- 1. CLIENTES
SELECT 
  'CLIENTES' as tipo,
  id,
  name,
  email
FROM public.clients
ORDER BY created_at DESC;

-- 2. DOCUMENTOS
SELECT 
  'DOCUMENTOS' as tipo,
  d.name as arquivo,
  d.client_id,
  c.name as cliente,
  c.email as email_cliente
FROM public.documents d
LEFT JOIN public.clients c ON c.id = d.client_id
ORDER BY d.upload_date DESC
LIMIT 10;

-- 3. USER_PROFILES
SELECT 
  'USER_PROFILES' as tipo,
  up.email,
  up.client_id as profile_client_id,
  c.id as correto_client_id
FROM public.user_profiles up
LEFT JOIN public.clients c ON c.email = up.email
WHERE up.role = 'client';
```

Clique em **RUN** e **TIRE PRINT** ou **COPIE** os resultados das 3 tabelas.

---

## PASSO 2: Me Envie

1. Os resultados do SQL acima
2. Nome do cliente que você criou
3. Nome do arquivo que você fez upload
4. Email do cliente

---

## PASSO 3: Enquanto Isso...

Execute esta correção preventiva:

```sql
-- Corrigir user_profiles
UPDATE public.user_profiles up
SET client_id = c.id, updated_at = NOW()
FROM public.clients c
WHERE up.email = c.email AND up.role = 'client';

-- Sincronizar metadata  
UPDATE auth.users au
SET raw_user_meta_data = 
  CASE 
    WHEN c.id IS NOT NULL THEN
      jsonb_set(
        jsonb_set(
          COALESCE(au.raw_user_meta_data, '{}'::jsonb),
          '{clientId}', to_jsonb(c.id::text)
        ),
        '{name}', to_jsonb(c.name)
      )
    ELSE au.raw_user_meta_data
  END,
  updated_at = NOW()
FROM public.clients c
WHERE au.email = c.email;
```

---

## PASSO 4: Teste

1. Ctrl+Shift+R (limpar cache)
2. Logout
3. Login como cliente
4. Ver se documento aparece

---

**ME ENVIE OS RESULTADOS DO PASSO 1!**

