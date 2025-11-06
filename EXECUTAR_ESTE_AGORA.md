# ⚡ EXECUTE AGORA - Passo a Passo

## 🎯 Vamos descobrir E corrigir o problema

### PASSO 1: Diagnóstico (2 minutos)

1. Abra **Supabase → SQL Editor**
2. Abra o arquivo **`DIAGNOSTICO_COMPLETO_AGORA.sql`**
3. Execute TODO o conteúdo
4. **Tire print** ou **copie** os resultados das 5 tabelas

---

### PASSO 2: Analisar Resultados

Procure por:

#### Na tabela "2. DOCUMENTOS":
- Se algum documento tem `status = ❌ ÓRFÃO`
- **Anote o `client_id_documento` de cada documento**

#### Na tabela "3. USER_PROFILES":
- Se algum tem `status = ❌`
- **Anote quais emails têm problema**

#### Na tabela "5. RESUMO POR CLIENTE":
- Quantos documentos cada cliente DEVERIA ver
- Compare com quantos ele VÊ de verdade

---

### PASSO 3: Correção Automática (se necessário)

Se encontrou documentos ÓRFÃOS ou user_profiles descasados, execute:

```sql
-- Corrigir TODOS os user_profiles de uma vez
UPDATE public.user_profiles up
SET 
  client_id = c.id,
  name = c.name,
  cnpj = c.cnpj,
  updated_at = NOW()
FROM public.clients c
WHERE up.email = c.email
  AND up.role = 'client'
  AND (up.client_id IS NULL OR up.client_id != c.id);

-- Sincronizar metadata
UPDATE auth.users au
SET 
  raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{clientId}', to_jsonb(c.id::text)
      ),
      '{name}', to_jsonb(c.name)
    ),
    '{cnpj}', to_jsonb(COALESCE(c.cnpj, ''))
  ),
  updated_at = NOW()
FROM public.clients c
WHERE au.email = c.email
  AND c.email IS NOT NULL
  AND au.raw_user_meta_data->>'clientId' != c.id::text;
```

---

### PASSO 4: Teste com Cliente Novo (3 minutos)

1. **Recarregue a aplicação** (Ctrl+Shift+R)

2. **Login como Admin**

3. **Criar Cliente NOVO**:
   - Nome: "Teste Final"
   - Email: `testefinal@teste.com`
   - Senha: `123456`

4. **AGUARDE 3 segundos** (importante!)

5. **Selecione esse cliente** na lista

6. **Veja o console** (F12) - deve mostrar:
   ```
   🔍 Validando cliente antes do upload...
   📤 Upload confirmado para: {
     clienteId: "xxx-xxx-xxx",
     validacao: "✅ ID revalidado do banco"
   }
   ```

7. **Faça upload** de um arquivo qualquer

8. **Veja no console**:
   ```
   💾 Salvando documento no banco com ID VALIDADO: {
     clienteId: "xxx-xxx-xxx",
     validacao: "✅ Usando ID do banco, não do cache"
   }
   ```

9. **Faça Logout**

10. **Login como** `testefinal@teste.com` / `123456`

11. **✅ DEVE APARECER O DOCUMENTO!**

---

### PASSO 5: Se AINDA não aparecer

Execute no Supabase:

```sql
-- Ver exatamente onde está o documento
SELECT 
  d.name,
  d.client_id,
  c.name as cliente_correto,
  'testefinal@teste.com' as deveria_ser
FROM public.documents d
LEFT JOIN public.clients c ON c.id = d.client_id
WHERE d.name LIKE '%nome_do_arquivo_que_voce_uploadou%';
```

E me envie:
1. O resultado dessa query
2. Os prints do PASSO 1
3. Os logs do console do PASSO 4

---

## 🎯 Mudanças Feitas no Código

### Upload AGORA faz:

```typescript
// ANTES (usava cache):
await addDocument(currentClient.id, documento);

// AGORA (revalida do banco):
🔍 Busca cliente atual direto do banco
✅ Valida que ID existe
📤 Upload com ID validado
💾 Salva documento com ID correto
```

**Isso GARANTE que o ID está correto!**

---

## 📊 Logs Esperados (CORRETO):

```
🔍 Validando cliente antes do upload...
📤 Upload confirmado para: {
  clienteNome: "Teste Final",
  clienteId: "abc-123",  ← ID do banco
  validacao: "✅ ID revalidado do banco"
}
💾 Salvando documento no banco com ID VALIDADO: {
  clienteId: "abc-123",  ← MESMO ID
  validacao: "✅ Usando ID do banco, não do cache"
}
🔍 [CLIENTE] Buscando documentos do cliente: {
  clientId: "abc-123"  ← MESMO ID
}
📄 [CLIENTE] Documentos retornados: 1  ✅
```

---

**EXECUTE O DIAGNÓSTICO PRIMEIRO E ME MOSTRE OS RESULTADOS!** 🔍

