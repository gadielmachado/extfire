# 🚀 Guia de Início Rápido - ExtFire

## ⚡ 5 Minutos para Começar

### 1️⃣ Atualizar Service Role Key (1 min)

📁 Abra: `src/lib/supabaseAdmin.ts`

```typescript
// Linha 12 - Substitua:
const SERVICE_ROLE_KEY = "SUA_SERVICE_ROLE_KEY_AQUI";

// Por (obtenha no Dashboard do Supabase > Settings > API):
const SERVICE_ROLE_KEY = "sua-chave-service-role-real-aqui";
```

### 2️⃣ Executar Script SQL (2 min)

1. Acesse: https://dwhbznsijdsiwccamfvd.supabase.co
2. Clique em **SQL Editor** (menu lateral)
3. Copie TUDO de `database_setup_rapido.sql`
4. Cole no editor
5. Clique **Run** ou Ctrl+Enter

✅ **Sucesso**: Deve mostrar "CREATE TABLE", "CREATE INDEX", etc.

### 3️⃣ Criar Bucket de Storage (1 min)

1. Clique em **Storage** (menu lateral)
2. Clique **New bucket**
3. Configure:
   - Name: `documents`
   - Public: ❌ (deixe desmarcado)
4. Clique **Create bucket**

### 4️⃣ Criar Usuário Admin (1 min)

**Opção A - Via Aplicação** (recomendado):
```bash
npm run dev
# Acesse http://localhost:5173
# Clique em "Registrar"
# Preencha seus dados
```

Depois, no SQL Editor:
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'seu-email@exemplo.com';
```

**Opção B - Direto no Supabase**:
1. **Authentication** > **Users** > **Add user**
2. Preencha email e senha
3. Execute no SQL Editor:
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'email-do-usuario@exemplo.com';
```

### 5️⃣ Verificar Instalação (30 seg)

No SQL Editor, copie e execute: `verificacao_instalacao.sql`

✅ Deve mostrar: "🎉 INSTALAÇÃO COMPLETA E FUNCIONAL!"

---

## 🎯 Testar a Aplicação

```bash
# Instalar dependências (se ainda não instalou)
npm install

# Iniciar aplicação
npm run dev
```

Acesse: http://localhost:5173

### Teste Completo:

1. ✅ Login com usuário admin
2. ✅ Adicionar novo cliente (botão +)
3. ✅ Clicar no cliente
4. ✅ Upload de documento
5. ✅ Visualizar documento
6. ✅ Editar cliente
7. ✅ Deletar documento

---

## 📚 Arquivos de Referência

| Arquivo | Para que serve | Quando usar |
|---------|---------------|-------------|
| `INICIO_RAPIDO.md` | Começar rápido (este arquivo) | ⭐ Comece aqui |
| `INSTRUCOES_RESTAURACAO_BANCO.md` | Guia completo | Se tiver dúvidas |
| `database_setup_rapido.sql` | Script SQL compacto | ⭐ Execute este |
| `database_setup_complete.sql` | Script SQL comentado | Se quiser entender |
| `verificacao_instalacao.sql` | Verificar instalação | Após executar SQL |
| `RESUMO_ALTERACOES.md` | O que foi alterado | Para revisão |

---

## 🆘 Problemas?

### ❌ Erro: "Invalid API key"
```
✅ Solução:
1. Verifique src/integrations/supabase/client.ts
2. Limpe cache: Ctrl+Shift+Delete
3. Faça logout e login novamente
```

### ❌ Erro: "relation does not exist"
```
✅ Solução:
1. Execute database_setup_rapido.sql novamente
2. Verifique no SQL Editor: SELECT * FROM clients;
```

### ❌ Erro ao fazer upload
```
✅ Solução:
1. Verifique se bucket 'documents' existe (Storage > Buckets)
2. Verifique se o bucket é PRIVADO (não público)
3. Execute as políticas de storage (seção 8 do SQL)
```

### ❌ Não consigo criar cliente
```
✅ Solução:
1. Verifique se seu usuário é admin:
   SELECT role FROM user_profiles WHERE email = 'seu-email';
2. Se não for admin, execute:
   UPDATE user_profiles SET role = 'admin' WHERE email = 'seu-email';
```

### ❌ Service Role Key não funciona
```
✅ Solução:
1. Dashboard > Settings > API
2. Copie a chave "service_role" (não "anon")
3. Cole em src/lib/supabaseAdmin.ts
4. Reinicie a aplicação (Ctrl+C e npm run dev)
```

---

## 🎉 Pronto!

Sua aplicação ExtFire está configurada e rodando!

**Próximos passos:**
- 📖 Leia `INSTRUCOES_RESTAURACAO_BANCO.md` para detalhes
- 🔒 Configure backups regulares no Supabase
- 👥 Adicione mais usuários
- 🏢 Cadastre seus clientes

---

## 📞 Informações do Projeto

- **URL**: https://dwhbznsijdsiwccamfvd.supabase.co
- **Project ID**: dwhbznsijdsiwccamfvd
- **Local**: http://localhost:5173

**Data de Configuração**: 10 de Outubro de 2025  
**Versão**: 2.0

---

**Dica**: Salve este arquivo como referência rápida! 🌟

