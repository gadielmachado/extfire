# ⚡ EXECUTE AGORA - CORREÇÃO IMEDIATA

## 🎯 Execute estes 3 scripts em ordem

### ✅ PASSO 1: Diagnóstico (1_diagnostico.sql)

1. Abra **Supabase** → **SQL Editor**
2. Clique em **New Query**
3. Copie **TODO** o conteúdo do arquivo `1_diagnostico.sql`
4. Cole e clique em **RUN**
5. **ANOTE os resultados** - você verá 4 tabelas

**O que você deve ver:**
- Tabela 1: user_profile (provavelmente com `client_id` = NULL)
- Tabela 2: cliente (ID = `ec3b55a0-bc30-4104-9987-2e8ed687c6ad`)
- Tabela 3: documento (associado ao cliente acima)
- Tabela 4: usuário auth

---

### ✅ PASSO 2: Correção (2_corrigir_user_profile.sql)

1. No **SQL Editor**, clique em **New Query** novamente
2. Copie **TODO** o conteúdo do arquivo `2_corrigir_user_profile.sql`
3. Cole e clique em **RUN**
4. **Veja os resultados**:
   - Primeira tabela: ANTES DA CORREÇÃO (client_id_atual = NULL, client_id_correto = ec3b...)
   - Segunda tabela: DEPOIS DA CORREÇÃO (client_id = ec3b...)

**✅ Se aparecer "DEPOIS DA CORREÇÃO" com `client_id` preenchido = SUCESSO!**

---

### ✅ PASSO 3: Verificação Final (3_verificar_tudo.sql)

1. No **SQL Editor**, clique em **New Query** novamente
2. Copie **TODO** o conteúdo do arquivo `3_verificar_tudo.sql`
3. Cole e clique em **RUN**
4. **Veja os resultados**:
   - Verificação 1: USER_PROFILE → deve mostrar "OK ✅"
   - Verificação 2: DOCUMENTOS → deve mostrar "OK ✅"
   - Verificação 3: RESUMO → deve mostrar:
     - clientes: 1
     - user_profiles: 1
     - documentos_visiveis: 1

**✅ Se tudo mostrar "OK ✅" = PROBLEMA RESOLVIDO!**

---

## 🧪 PASSO 4: Testar na Aplicação

1. **Limpe o cache do navegador**:
   - F12 → Botão direito em reload → "Empty Cache and Hard Reload"

2. **Faça logout e login novamente**

3. **Verifique o console** (F12):
   ```
   ✅ Dados do user_profile carregados: {clientId: 'ec3b55a0-bc30-4104-9987-2e8ed687c6ad', ...}
   📄 [CLIENTE] Documentos retornados: 1
   ```

4. **Verifique se o documento aparece na interface** ✅

---

## ❌ O que NÃO fazer:

- ❌ **NÃO copie** o nome do arquivo (`1_diagnostico.sql`)
- ❌ **NÃO copie** comentários markdown (linhas com `#` ou `##`)
- ❌ **COPIE APENAS** o conteúdo SQL puro de dentro do arquivo

---

## 🔍 Problema Identificado:

Baseado nas imagens que você enviou:

- **Cliente no banco**: `ec3b55a0-bc30-4104-9987-2e8ed687c6ad` ✅
- **Documento associado a**: `ec3b55a0-bc30-4104-9987-2e8ed687c6ad` ✅
- **User_profile com**: `client_id = NULL` ❌ **← ESTE É O PROBLEMA!**

O script `2_corrigir_user_profile.sql` vai corrigir isso, associando o user_profile ao cliente correto.

---

## ✅ Resultado Esperado:

Após executar os 3 scripts, quando você fizer login como cliente:

- ✅ Não haverá mais timeout
- ✅ O `client_id` será `ec3b55a0-bc30-4104-9987-2e8ed687c6ad`
- ✅ O documento "documentação stripe clapp.txt" será visível
- ✅ Logs mostrarão "📄 [CLIENTE] Documentos retornados: 1"

---

**Tempo estimado: 3 minutos**  
**Dificuldade: ⭐☆☆☆☆ (Muito fácil)**

