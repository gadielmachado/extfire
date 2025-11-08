# 🔄 PROBLEMA: Arquivo Aparece e Depois Desaparece

## 🐛 O Bug Identificado

O cliente `jumpsorteio@gmail.com` está com **DOIS client_ids DIFERENTES**:

```
┌─────────────────────────────────────────────────┐
│ 1ª Carga (logo após login)                      │
│ clientId: 8f9df602-4db4-4b8d-9cb5-d84f63d3f67a  │
│ Documentos encontrados: 1 ✅                     │
└─────────────────────────────────────────────────┘
                    ↓
         (alguns segundos depois)
                    ↓
┌─────────────────────────────────────────────────┐
│ 2ª Carga (após refresh interno)                 │
│ clientId: 48d5d0c0-30a1-415d-9cf9-feddb32ef8e2  │
│ Documentos encontrados: 0 ❌                     │
└─────────────────────────────────────────────────┘
```

### Por que isso acontece?

O sistema tem TRÊS lugares que armazenam o `client_id`:

1. **Tabela `clients`** → ID real do cliente ✅
2. **Tabela `user_profiles`** → Pode ter um client_id ERRADO ❌
3. **`auth.users.raw_user_meta_data`** → Pode ter outro client_id ERRADO ❌

Quando o usuário faz login:
- AuthContext usa o `client_id` dos **metadados** (errado)
- Depois busca o `client_id` do **user_profile** (também errado)
- Sistema alterna entre os dois
- Documentos aparecem e somem dependendo de qual está usando

## 🔧 Solução em 2 Passos

### Passo 1: Diagnóstico (Obrigatório)

Execute no **SQL Editor**:

📁 **`DIAGNOSTICO_JUMPSORTEIO.sql`**

Isso vai mostrar:
- ✅ Qual é o `client_id` CORRETO (da tabela clients)
- ❌ Qual `client_id` está no user_profile (errado?)
- ❌ Qual `client_id` está nos metadados (errado?)
- 📄 Quantos documentos o cliente TEM

### Passo 2: Correção (Execute Depois)

Execute no **SQL Editor**:

📁 **`CORRECAO_CLIENT_ID_ERRADO.sql`**

Isso vai:
1. ✅ Identificar o `client_id` CORRETO da tabela `clients`
2. ✅ Corrigir o `user_profiles` para usar o ID correto
3. ✅ Corrigir os `metadados` do auth.users
4. ✅ Aplicar a correção para TODOS os clientes (não só jumpsorteio)
5. ✅ Verificar se ficou tudo correto

## 📊 O Que Você Vai Ver

### Antes da Correção ❌
```sql
-- DIAGNOSTICO_JUMPSORTEIO.sql mostrará algo como:

Cliente ID correto: 8f9df602-4db4-4b8d-9cb5-d84f63d3f67a
User_profile client_id: 48d5d0c0-30a1-415d-9cf9-feddb32ef8e2  ← DIFERENTE!
Metadata clientId: 48d5d0c0-30a1-415d-9cf9-feddb32ef8e2      ← DIFERENTE!
Status: ❌ user_profile com client_id ERRADO
```

### Depois da Correção ✅
```sql
-- CORRECAO_CLIENT_ID_ERRADO.sql mostrará:

Cliente ID correto: 8f9df602-4db4-4b8d-9cb5-d84f63d3f67a
User_profile client_id: 8f9df602-4db4-4b8d-9cb5-d84f63d3f67a  ← IGUAL!
Metadata clientId: 8f9df602-4db4-4b8d-9cb5-d84f63d3f67a      ← IGUAL!
Status: ✅ TUDO CORRETO!
Documentos visíveis: 1
```

## 🧪 Testando Depois da Correção

1. **Logout** do cliente jumpsorteio@gmail.com
2. **Limpe o cache do navegador**: Ctrl + Shift + Delete
3. **Faça login** novamente
4. **Verifique** se os documentos aparecem E PERMANECEM
5. **Aguarde 30 segundos** para ter certeza que não desaparecem

## ⚠️ Por Que Aconteceu?

Provavelmente você:
1. Criou o cliente `jumpsorteio@gmail.com`
2. Depois **RECRIOU** o mesmo cliente (talvez porque houve erro)
3. Isso criou um NOVO `client_id` na tabela `clients`
4. Mas o `user_profile` ficou com o `client_id` ANTIGO
5. Sistema ficou alternando entre os dois

## 🎯 Resultado Final

Após executar a correção:

```
┌─────────────────────────────────────────────────┐
│ Sempre usa o MESMO client_id                    │
│ clientId: 8f9df602-4db4-4b8d-9cb5-d84f63d3f67a  │
│ Documentos: SEMPRE 1 ✅                          │
│ NÃO DESAPARECE MAIS! 🎉                          │
└─────────────────────────────────────────────────┘
```

---

## 📝 Resumo Rápido

1. ✅ Execute `DIAGNOSTICO_JUMPSORTEIO.sql` para ver o problema
2. ✅ Execute `CORRECAO_CLIENT_ID_ERRADO.sql` para corrigir
3. ✅ Limpe cache do navegador
4. ✅ Faça login novamente
5. ✅ Documentos devem aparecer E PERMANECER para sempre!

**Execute agora e o problema estará resolvido! 💪**

