# 📋 ORDEM DE EXECUÇÃO DOS SCRIPTS SQL

Execute os scripts **EXATAMENTE NESTA ORDEM** no Supabase SQL Editor:

## 📊 FASE 1: DIAGNÓSTICO (Execute primeiro para ver o problema)

### 1️⃣ `01_diagnostico.sql`
- Mostra os dados do cliente
- **O que esperar**: Deve retornar 1 linha com os dados

### 2️⃣ `02_verificar_usuario.sql`
- Mostra o usuário de autenticação
- **O que esperar**: Deve retornar 1 linha com user_id e email

### 3️⃣ `03_verificar_user_profile.sql` ⚠️ **IMPORTANTE**
- Mostra o user_profile (AQUI ESTÁ O PROBLEMA!)
- **O que esperar**: 
  - ❌ Se mostrar "CLIENT_ID NULL!" = PROBLEMA ENCONTRADO
  - ✅ Se mostrar "CLIENT_ID CORRETO" = Está OK

### 4️⃣ `04_testar_funcao.sql`
- Testa a função get_user_client_id()
- **O que esperar**:
  - ❌ Se mostrar "FUNÇÃO RETORNA NULL!" = PROBLEMA
  - ✅ Se mostrar "FUNÇÃO OK" = Está funcionando

### 5️⃣ `05_ver_todos_documentos.sql`
- Mostra TODOS os documentos no banco
- **O que esperar**: 
  - Se retornar 0 linhas = Não há documentos
  - Se retornar linhas = Verificar a coluna "status"

---

## 🔧 FASE 2: CORREÇÃO (Execute se encontrou problemas)

### 6️⃣ `06_corrigir_user_profile.sql`
- Corrige o user_profile com client_id correto
- **O que esperar**: Mensagem "✅ User_profile atualizado com sucesso!"

### 7️⃣ `07_melhorar_funcao.sql`
- Melhora a função get_user_client_id()
- **O que esperar**: Nenhum erro, execução silenciosa

### 8️⃣ `08_atualizar_politicas.sql`
- Atualiza as políticas RLS
- **O que esperar**: Nenhum erro, execução silenciosa

---

## ✅ FASE 3: VERIFICAÇÃO (Execute para confirmar)

### 9️⃣ `09_verificar_correcao.sql`
- Confirma que user_profile está correto
- **O que esperar**: Status "✅ CLIENT_ID PREENCHIDO"

### 🔟 `10_testar_select.sql`
- Testa se a busca de documentos funciona
- **O que esperar**: 
  - Se houver documentos para este cliente, eles vão aparecer
  - Se não houver documentos, retorna vazio (precisa fazer upload)

---

## ⏱️ TEMPO ESTIMADO

- **Fase 1 (Diagnóstico)**: 2 minutos
- **Fase 2 (Correção)**: 2 minutos
- **Fase 3 (Verificação)**: 1 minuto
- **TOTAL**: 5 minutos

---

## 📸 APÓS EXECUTAR TODOS

1. ✅ Faça **LOGOUT** do aplicativo
2. ✅ Limpe o **cache** (Ctrl + Shift + Delete)
3. ✅ Faça **LOGIN** novamente
4. ✅ Veja se os documentos aparecem
5. ✅ **Atualize** (F5) e veja se permanecem

---

## 🆘 SE DER ERRO

Se algum script der erro:
1. **Copie o erro completo**
2. **Me envie** junto com o número do script
3. **NÃO** execute os próximos até resolver

---

## 💡 RESUMO RÁPIDO

```
DIAGNÓSTICO (01-05) → Ver o problema
    ↓
CORREÇÃO (06-08) → Corrigir o problema  
    ↓
VERIFICAÇÃO (09-10) → Confirmar que funcionou
    ↓
TESTAR NO APP → Logout, limpar cache, login, F5
```

---

**🚀 COMECE PELO SCRIPT 01 e vá em ordem!**

