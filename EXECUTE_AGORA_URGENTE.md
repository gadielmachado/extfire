# ⚡ EXECUTE AGORA - CORREÇÃO URGENTE

## 🚨 O PROBLEMA:

Documentos aparecem por alguns segundos e **SOMEM** porque:

1. ✅ `user_profile` tem clientId correto
2. ❌ **METADADOS do auth.users** tem clientId ERRADO (antigo)
3. Auth recarrega com metadata errado → Documentos SOMEM!

---

## ✅ SOLUÇÃO IMEDIATA (1 minuto):

### Execute Este SQL NO SUPABASE:

Abra **Supabase → SQL Editor** e cole:

```sql
-- Corrigir user_profiles
UPDATE public.user_profiles up
SET 
  client_id = c.id,
  name = c.name,
  cnpj = c.cnpj,
  updated_at = NOW()
FROM public.clients c
WHERE up.email = c.email
  AND up.role = 'client';

-- Atualizar metadados do auth.users
UPDATE auth.users au
SET 
  raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{clientId}',
        to_jsonb(c.id::text)
      ),
      '{name}',
      to_jsonb(c.name)
    ),
    '{cnpj}',
    to_jsonb(c.cnpj)
  ),
  updated_at = NOW()
FROM public.clients c
WHERE au.email = c.email
  AND c.email IS NOT NULL;
```

Clique em **RUN** ▶️

---

## 🧪 TESTE AGORA:

1. **Limpe o cache**: F12 → Empty Cache and Hard Reload
2. **Faça logout**
3. **Faça login** como `gadielmachado01@gmail.com`
4. **Documentos aparecem e NÃO SOMEM MAIS!** ✅

---

## 📊 Resultado Esperado:

**ANTES** do SQL:
```
✅ Documentos retornados: 1 (aparecem)
⏱️ Alguns segundos depois...
❌ clientId: 'd05a7985-...' (metadata errado)
❌ Documentos retornados: 0 (SOMEM!)
```

**DEPOIS** do SQL:
```
✅ Documentos retornados: 1 (aparecem)
✅ clientId: 'a5be71f5-...' (metadata CORRETO)
✅ Documentos retornados: 1 (CONTINUAM!)
```

---

## ✅ Verificação:

Execute este SQL para confirmar:

```sql
SELECT 
  c.email,
  c.name,
  c.id as cliente_id,
  up.client_id as user_profile_client_id,
  au.raw_user_meta_data->>'clientId' as metadata_client_id,
  CASE 
    WHEN c.id::text = up.client_id::text 
      AND c.id::text = au.raw_user_meta_data->>'clientId' 
    THEN 'OK ✅'
    ELSE 'ERRO ❌'
  END as status
FROM public.clients c
LEFT JOIN public.user_profiles up ON c.email = up.email
LEFT JOIN auth.users au ON c.email = au.email
WHERE c.email IS NOT NULL;
```

**Resultado esperado**: Todos devem mostrar `OK ✅`

---

## 🎯 Isso Resolve:

- ✅ Documentos não somem mais
- ✅ Todos os clientes veem seus documentos
- ✅ Sincronização completa: clients ↔ user_profiles ↔ auth.users

---

**EXECUTE AGORA e teste!** 🚀

---

**Tempo**: 1 minuto  
**Dificuldade**: ⭐☆☆☆☆

