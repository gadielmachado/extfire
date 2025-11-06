# 🔍 TESTE DEFINITIVO - Me Envie os Resultados

## PASSO 1: Execute o SQL

Abra **Supabase → SQL Editor**

Cole TODO o conteúdo do arquivo **`MOSTRAR_PROBLEMA.sql`** e execute.

**TIRE PRINT** ou **COPIE E COLE** os 5 resultados aqui.

---

## PASSO 2: Logs do Upload

1. Abra a aplicação
2. Pressione **F12** (abrir console)
3. Limpe o console (ícone 🚫)
4. **Login como Admin**
5. **Crie um cliente NOVO**:
   - Nome: `Teste Definitivo`
   - Email: `testedefinitivo@teste.com`
   - Senha: `123456`
6. **Aguarde 3 segundos**
7. **Selecione esse cliente** na lista
8. **Faça upload** de qualquer arquivo
9. **COPIE TODOS OS LOGS** do console e me envie

---

## PASSO 3: Ver no Banco o que foi salvo

Execute no Supabase:

```sql
-- Ver o que aconteceu
SELECT 
  'RESULTADO UPLOAD' as tipo,
  d.name as arquivo,
  d.client_id as id_documento,
  c.name as cliente,
  c.email as email,
  c.id as id_cliente
FROM public.documents d
LEFT JOIN public.clients c ON c.id = d.client_id
WHERE c.email = 'testedefinitivo@teste.com'
ORDER BY d.upload_date DESC
LIMIT 1;
```

**ME ENVIE** o resultado.

---

## PASSO 4: Login como Cliente

1. **Logout**
2. **Login como**: `testedefinitivo@teste.com` / `123456`
3. **Limpe o console** novamente
4. **Aguarde** a página carregar
5. **COPIE TODOS OS LOGS** do console
6. **ME ENVIE** os logs

---

## O QUE EU PRECISO VER:

✅ **Resultados do PASSO 1** (SQL)
✅ **Logs do PASSO 2** (Upload)
✅ **Resultado do PASSO 3** (SQL)
✅ **Logs do PASSO 4** (Login cliente)

Com essas informações vou identificar EXATAMENTE onde está o problema!

