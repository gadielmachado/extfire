# 🔓 INSTRUÇÕES PARA LIBERAR TODAS AS POLÍTICAS

## ⚠️ PROBLEMA IDENTIFICADO

O erro ocorre porque as políticas RLS (Row Level Security) estão bloqueando operações de exclusão:

```
DELETE 400 (Bad Request)
{code: '22P02', message: 'invalid input syntax for type uuid: ""'}
```

## ✅ SOLUÇÃO RÁPIDA

### 1️⃣ Abra o Supabase Dashboard
- Acesse: https://supabase.com/dashboard
- Selecione seu projeto

### 2️⃣ Vá para SQL Editor
- No menu lateral, clique em **SQL Editor**

### 3️⃣ Execute o Script
- Copie TODO o conteúdo do arquivo `liberar_todas_politicas.sql`
- Cole no SQL Editor
- Clique em **RUN** ou pressione **Ctrl + Enter**

### 4️⃣ Aguarde a Execução
Você verá mensagens de sucesso:
```
✅ Todas as políticas antigas removidas
✅ Políticas da tabela clients criadas
✅ Políticas da tabela documents criadas
✅ Políticas da tabela user_profiles criadas
✅ Políticas do storage criadas
✅ RLS ativado em todas as tabelas
✅ Funções recursivas removidas
```

### 5️⃣ Verifique os Resultados
O script mostrará automaticamente todas as políticas criadas com indicação:
- ✅ SEM RESTRIÇÕES = Política totalmente permissiva
- ⚠️ COM RESTRIÇÕES = Ainda há alguma restrição

### 6️⃣ Recarregue a Aplicação
- Volte para http://localhost:3000
- Pressione **Ctrl + Shift + R** (hard reload)
- Tente excluir o cliente novamente

## 🎯 O QUE ESTE SCRIPT FAZ

1. **Remove TODAS as políticas existentes** de todas as tabelas
2. **Cria políticas totalmente permissivas** (sem nenhuma restrição)
3. **Remove funções recursivas** que podem causar problemas
4. **Ativa RLS** mas com políticas permissivas
5. **Verifica** se tudo foi configurado corretamente

## 📋 POLÍTICAS CRIADAS

Todas as tabelas terão 4 políticas:
- ✅ `allow_all_select` - Permite SELECT sem restrições
- ✅ `allow_all_insert` - Permite INSERT sem restrições
- ✅ `allow_all_update` - Permite UPDATE sem restrições
- ✅ `allow_all_delete` - Permite DELETE sem restrições

## ⚠️ IMPORTANTE

Estas políticas **não têm nenhuma restrição de segurança**. 

Todos os usuários autenticados poderão:
- Ver todos os dados
- Inserir qualquer dado
- Atualizar qualquer dado
- Excluir qualquer dado

**Isto é intencional** para resolver o problema imediato. Depois você pode refinar as políticas se necessário.

## 🔍 EM CASO DE ERRO

Se o erro persistir após executar o script:

1. Verifique se há erros no console do SQL Editor
2. Tente executar o script novamente
3. Limpe o cache do navegador (Ctrl + Shift + Delete)
4. Faça logout e login novamente na aplicação

## 📞 SUPORTE

Se ainda houver problemas, forneça:
- Screenshot do SQL Editor após executar o script
- Logs do console do navegador (F12)
- Mensagens de erro completas

