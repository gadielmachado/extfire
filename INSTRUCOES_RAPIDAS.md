# 🚀 INSTRUÇÕES RÁPIDAS - RESOLVER PROBLEMA DE DOCUMENTOS

## ❌ O PROBLEMA

**Documentos aparecem uma vez mas desaparecem ao atualizar (F5).**

---

## ✅ SOLUÇÃO RÁPIDA

### PASSO 1: Abra o Supabase SQL Editor

Acesse: https://supabase.com/dashboard/project/dwhbznsijdsiwccamfvd/sql/new

### PASSO 2: Execute o Script 9 (Diagnóstico)

Abra o arquivo `scripts_consolidados.sql` e copie todo o **SCRIPT 9: DIAGNÓSTICO ESPECÍFICO** (linhas 752-839).

Cole no SQL Editor e execute.

**Resultado esperado:** Você verá que o `client_id` está NULL no `user_profile`.

### PASSO 3: Execute o Script 10 (Correção)

Copie todo o **SCRIPT 10: CORREÇÃO DEFINITIVA** (linhas 842-1091).

Cole no SQL Editor e execute.

**Resultado esperado:** Mensagem de sucesso confirmando a correção.

### PASSO 4: Execute o Script 11 (Verificação)

Copie todo o **SCRIPT 11: VERIFICAÇÃO FINAL** (linhas 1094-1148).

Cole no SQL Editor e execute.

**Resultado esperado:** Todos os status devem mostrar ✅ OK.

### PASSO 5: Teste no App

1. **Faça LOGOUT** do aplicativo
2. **Limpe o cache** (Ctrl + Shift + Delete)
3. **Faça LOGIN** como cliente (gadielmachado01@gmail.com)
4. **Verifique** se os documentos aparecem
5. **Atualize** a página (F5)
6. ✅ **Os documentos devem permanecer visíveis!**

---

## 📁 ONDE ESTÃO OS ARQUIVOS?

| Arquivo | Descrição |
|---------|-----------|
| `scripts_consolidados.sql` | Todos os scripts SQL numerados |
| `SOLUCAO_DOCUMENTOS_COMPLETA.md` | Documentação completa e detalhada |
| `INSTRUCOES_RAPIDAS.md` | Este arquivo (resumo rápido) |

---

## ⏱️ TEMPO TOTAL

**5-7 minutos** para resolver completamente

---

## 🆘 SE NÃO FUNCIONAR

Execute o **SCRIPT 12: DIAGNÓSTICO AVANÇADO** (linha 1152 em diante) e me envie o resultado.

---

## 📋 CHECKLIST

- [ ] Executei o script de diagnóstico
- [ ] Executei o script de correção
- [ ] Executei o script de verificação
- [ ] Fiz logout e limpei cache
- [ ] Fiz login novamente
- [ ] Testei upload de documento
- [ ] Atualizei a página (F5)
- [ ] ✅ O documento permanece visível!

---

**✅ Pronto! Seu problema está resolvido!**

