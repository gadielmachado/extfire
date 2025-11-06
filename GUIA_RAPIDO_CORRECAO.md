# ⚡ Guia Rápido de Correção

## 🎯 Execute Estes Passos Agora

### ✅ Passo 1: Atualizar Função SQL (2 minutos)

1. Abra o **Supabase Dashboard** → **SQL Editor**
2. Cole e execute este código:

```sql
-- Função para sincronizar user_profile (com validação de client_id)
CREATE OR REPLACE FUNCTION public.sync_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'client',
  user_client_id UUID DEFAULT NULL,
  user_cnpj TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_validated_client_id UUID;
BEGIN
  -- Validar se o client_id existe na tabela clients
  -- Se não existir, usar NULL para evitar erro de foreign key
  IF user_client_id IS NOT NULL THEN
    SELECT id INTO v_validated_client_id
    FROM public.clients
    WHERE id = user_client_id
    LIMIT 1;
    
    -- Se não encontrou o cliente, registrar log e usar NULL
    IF v_validated_client_id IS NULL THEN
      RAISE WARNING 'Client ID % não existe na tabela clients. Salvando user_profile sem client_id.', user_client_id;
    END IF;
  ELSE
    v_validated_client_id := NULL;
  END IF;
  
  -- Inserir ou atualizar user_profile com o client_id validado
  INSERT INTO public.user_profiles (
    id, email, name, role, client_id, cnpj, created_at, updated_at
  )
  VALUES (
    user_id, user_email, COALESCE(user_name, user_email),
    user_role, v_validated_client_id, user_cnpj, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, user_profiles.name),
    role = EXCLUDED.role,
    -- Atualizar client_id apenas se for válido e diferente de NULL
    client_id = CASE 
      WHEN EXCLUDED.client_id IS NOT NULL THEN EXCLUDED.client_id
      ELSE user_profiles.client_id
    END,
    cnpj = COALESCE(EXCLUDED.cnpj, user_profiles.cnpj),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. Aguarde mensagem de sucesso ✅

---

### ✅ Passo 2: Corrigir Dados Inconsistentes (3 minutos)

1. No mesmo **SQL Editor**, abra nova query
2. Copie **TODO** o conteúdo do arquivo `corrigir_dados_inconsistentes.sql`
3. Cole e execute
4. **Leia os resultados** - anote quantos registros foram corrigidos

---

### ✅ Passo 3: Recarregar Aplicação (1 minuto)

1. Pare o servidor (Ctrl+C)
2. Limpe o cache do navegador (F12 → Botão direito em Reload → Empty Cache and Hard Reload)
3. Inicie novamente:
   ```bash
   npm run dev
   ```
4. Faça logout e login novamente

---

### ✅ Passo 4: Testar (2 minutos)

1. **Login como Admin**:
   - Selecione um cliente
   - Faça upload de um documento
   
2. **Login como Cliente**:
   - Verifique se o documento aparece
   - Verifique o console (F12) - NÃO deve ter erros

---

## ✅ Checklist Rápido

Após executar os passos acima, verifique:

- [ ] Login funciona sem erros de foreign key constraint
- [ ] Não há timeout ao buscar user_profile
- [ ] Documentos aparecem para o cliente
- [ ] Console mostra "✅ Dados do user_profile carregados"
- [ ] Console mostra "📄 [CLIENTE] Documentos retornados: X" (X > 0)

---

## ❌ Se algo deu errado

Veja instruções detalhadas em: `INSTRUCOES_CORRECAO.md`

---

## 📝 O Que Foi Corrigido?

1. ✅ **Foreign Key Constraint**: Função SQL agora valida client_id antes de salvar
2. ✅ **Documentos Invisíveis**: Script corrige associações incorretas
3. ✅ **Timeout**: Consultas otimizadas e mais robustas

Detalhes técnicos completos em: `RESUMO_CORRECOES.md`

---

**Tempo Total**: ~8 minutos  
**Dificuldade**: ⭐⭐☆☆☆ (Fácil - apenas copiar e colar)

