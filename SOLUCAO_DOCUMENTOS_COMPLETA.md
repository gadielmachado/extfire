# 🔧 SOLUÇÃO COMPLETA: Clientes Não Veem Documentos Após Upload

## 🎯 PROBLEMA IDENTIFICADO

Você está enfrentando um problema onde:
- ✅ O upload do arquivo funciona
- ✅ O arquivo aparece **uma vez** na interface
- ❌ Ao atualizar a página (F5), o arquivo **desaparece**
- ❌ Clientes não conseguem ver os arquivos que o admin fez upload

## 🔍 CAUSA RAIZ

O problema ocorre porque:

1. **Ao fazer upload**: O arquivo é adicionado ao estado local do React (por isso aparece)
2. **Ao atualizar**: O React busca os arquivos do Supabase usando políticas RLS
3. **A política RLS bloqueia**: A função `get_user_client_id()` não está retornando o `client_id` correto
4. **Resultado**: O SELECT não retorna os documentos para o cliente

### Por que isso acontece?

O `user_profile` do cliente está **sem o campo `client_id` preenchido**, então a função `get_user_client_id()` retorna `NULL`, e a política RLS bloqueia o acesso.

---

## ✅ SOLUÇÃO EM 3 PASSOS

Siga **exatamente nesta ordem**:

### 📋 PASSO 1: DIAGNÓSTICO

Execute este script no **SQL Editor** do Supabase para confirmar o problema:

```sql
-- ====================================================
-- DIAGNÓSTICO COMPLETO - PROBLEMA DE VISUALIZAÇÃO
-- ====================================================

-- 1️⃣ VERIFICAR CLIENTE ESPECÍFICO
SELECT '1️⃣ DADOS DO CLIENTE' as passo;
SELECT id, name, email, cnpj FROM clients 
WHERE email = 'gadielmachado01@gmail.com'
  OR name LIKE '%Nova Política%'
  OR cnpj = '321941204012401';

-- 2️⃣ VERIFICAR USUÁRIO DE AUTENTICAÇÃO
SELECT '2️⃣ USUÁRIO AUTH' as passo;
SELECT 
  id, 
  email,
  raw_user_meta_data->>'clientId' as clientId_metadata,
  raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email = 'gadielmachado01@gmail.com';

-- 3️⃣ VERIFICAR USER_PROFILE (AQUI ESTÁ O PROBLEMA!)
SELECT '3️⃣ USER_PROFILE - ESTE É O PROBLEMA!' as passo;
SELECT 
  id, 
  email, 
  name,
  role,
  client_id,
  CASE 
    WHEN client_id IS NULL THEN '❌ CLIENT_ID ESTÁ NULL - PROBLEMA AQUI!'
    ELSE '✅ CLIENT_ID OK'
  END as status
FROM user_profiles 
WHERE email = 'gadielmachado01@gmail.com';

-- 4️⃣ TESTAR A FUNÇÃO get_user_client_id()
SELECT '4️⃣ TESTE DA FUNÇÃO' as passo;
SELECT 
  u.id as user_id,
  u.email,
  public.get_user_client_id(u.id) as retorna,
  c.id as deveria_retornar,
  CASE 
    WHEN public.get_user_client_id(u.id) = c.id THEN '✅ OK'
    WHEN public.get_user_client_id(u.id) IS NULL THEN '❌ RETORNA NULL - ESTE É O PROBLEMA!'
    ELSE '❌ RETORNA VALOR ERRADO'
  END as status
FROM auth.users u
CROSS JOIN clients c
WHERE u.email = 'gadielmachado01@gmail.com'
  AND (c.email = 'gadielmachado01@gmail.com' 
       OR c.name LIKE '%Nova Política%'
       OR c.cnpj = '321941204012401');

-- 5️⃣ DOCUMENTOS NO BANCO
SELECT '5️⃣ DOCUMENTOS NO BANCO' as passo;
SELECT 
  d.id,
  d.name,
  d.client_id,
  c.name as cliente_nome,
  c.email as cliente_email
FROM documents d
LEFT JOIN clients c ON d.client_id = c.id
WHERE d.client_id IN (
  SELECT id FROM clients 
  WHERE email = 'gadielmachado01@gmail.com'
    OR name LIKE '%Nova Política%'
    OR cnpj = '321941204012401'
);

-- 6️⃣ SIMULAÇÃO (O QUE ACONTECE NO APP)
SELECT '6️⃣ SIMULAÇÃO - O QUE O APP TENTA FAZER' as passo;
SELECT 
  d.id,
  d.name,
  'Via Política RLS' as origem,
  public.get_user_client_id(
    (SELECT id FROM auth.users WHERE email = 'gadielmachado01@gmail.com')
  ) as client_id_usado
FROM documents d
WHERE d.client_id = public.get_user_client_id(
  (SELECT id FROM auth.users WHERE email = 'gadielmachado01@gmail.com')
);
```

**📸 RESULTADO ESPERADO:**
- Na tabela 3, você verá `❌ CLIENT_ID ESTÁ NULL - PROBLEMA AQUI!`
- Na tabela 4, você verá `❌ RETORNA NULL - ESTE É O PROBLEMA!`
- Na tabela 6, não retornará nenhum documento

---

### 🔧 PASSO 2: CORREÇÃO COMPLETA

Após confirmar o diagnóstico, execute este script de correção:

```sql
-- ====================================================
-- CORREÇÃO COMPLETA E DEFINITIVA
-- ====================================================

-- PARTE 1: MELHORAR A FUNÇÃO get_user_client_id
-- Esta função agora busca em 3 lugares diferentes
CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id UUID;
  v_email TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- MÉTODO 1: Buscar em user_profiles (mais confiável)
  SELECT client_id INTO v_client_id
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- MÉTODO 2: Buscar em raw_user_meta_data
  BEGIN
    SELECT (raw_user_meta_data->>'clientId')::UUID INTO v_client_id
    FROM auth.users
    WHERE id = user_id
    LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
      RETURN v_client_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- MÉTODO 3: Buscar por email (fallback crítico)
  BEGIN
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = user_id;
    
    IF v_email IS NOT NULL THEN
      SELECT id INTO v_client_id
      FROM public.clients
      WHERE LOWER(email) = LOWER(v_email)
      LIMIT 1;
      
      IF v_client_id IS NOT NULL THEN
        RETURN v_client_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_client_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_client_id(UUID) TO anon;

-- PARTE 2: SINCRONIZAR TODOS OS USER_PROFILES
DO $$
DECLARE
  v_client RECORD;
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando sincronização de todos os clientes...';
  
  FOR v_client IN 
    SELECT id, email, name, cnpj 
    FROM clients 
    WHERE email IS NOT NULL AND email != ''
  LOOP
    -- Buscar usuário pelo email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(v_client.email);
    
    IF v_user_id IS NOT NULL THEN
      -- Inserir ou atualizar user_profile com client_id correto
      INSERT INTO user_profiles (id, email, name, role, client_id, cnpj)
      VALUES (
        v_user_id,
        v_client.email,
        v_client.name,
        CASE 
          WHEN v_client.email IN ('gadielmachado.bm@gmail.com', 'gadyel.bm@gmail.com', 'extfire.extfire@gmail.com', 'paoliellocristiano@gmail.com') 
          THEN 'admin'
          ELSE 'client'
        END,
        v_client.id,
        v_client.cnpj
      )
      ON CONFLICT (id) DO UPDATE SET
        client_id = v_client.id,
        email = v_client.email,
        name = v_client.name,
        cnpj = v_client.cnpj,
        updated_at = NOW();
      
      v_count := v_count + 1;
      RAISE NOTICE '  ✅ [%] Sincronizado: % (client_id: %)', v_count, v_client.email, v_client.id;
    ELSE
      RAISE NOTICE '  ⚠️  Usuário não encontrado para: %', v_client.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sincronização concluída! Total: % clientes', v_count;
END $$;

-- PARTE 3: REMOVER POLÍTICAS ANTIGAS
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'documents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON documents', r.policyname);
  END LOOP;
END $$;

-- PARTE 4: CRIAR POLÍTICAS RLS CORRETAS
-- SELECT: Admins veem tudo, clientes veem apenas seus documentos
CREATE POLICY "Visualizar documentos com permissão"
  ON documents FOR SELECT
  USING (
    public.is_admin(auth.uid()) 
    OR
    client_id = public.get_user_client_id(auth.uid())
  );

-- INSERT: Admin pode inserir, clientes podem inserir para si mesmos
CREATE POLICY "Inserir documentos com permissão"
  ON documents FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR
    client_id = public.get_user_client_id(auth.uid())
  );

-- UPDATE: Apenas admins
CREATE POLICY "Atualizar documentos (admin apenas)"
  ON documents FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- DELETE: Apenas admins
CREATE POLICY "Deletar documentos (admin apenas)"
  ON documents FOR DELETE
  USING (public.is_admin(auth.uid()));

-- PARTE 5: POLÍTICAS DE STORAGE
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (policyname LIKE '%documento%' 
           OR policyname LIKE '%arquivo%'
           OR policyname LIKE '%upload%'
           OR policyname LIKE '%visualizar%'
           OR policyname LIKE '%permissão%'
           OR policyname LIKE '%admin%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- SELECT: Admins veem tudo, clientes veem seus arquivos
CREATE POLICY "Visualizar arquivos com permissão"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' 
    AND (
      public.is_admin(auth.uid())
      OR
      (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
    )
  );

-- INSERT: Admin pode fazer upload, clientes podem fazer upload na sua pasta
CREATE POLICY "Upload com permissão"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' 
    AND (
      public.is_admin(auth.uid())
      OR
      (storage.foldername(name))[1] = public.get_user_client_id(auth.uid())::TEXT
    )
  );

-- UPDATE: Apenas admins
CREATE POLICY "Atualizar arquivos (admin apenas)"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' 
    AND public.is_admin(auth.uid())
  );

-- DELETE: Apenas admins
CREATE POLICY "Deletar arquivos (admin apenas)"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' 
    AND public.is_admin(auth.uid())
  );

-- PARTE 6: MENSAGEM FINAL
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║        ✅ CORREÇÃO APLICADA COM SUCESSO!              ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 O QUE FOI FEITO:';
  RAISE NOTICE '  ✓ Função get_user_client_id() melhorada com 3 métodos';
  RAISE NOTICE '  ✓ Todos os user_profiles sincronizados com client_id';
  RAISE NOTICE '  ✓ Políticas RLS de documents atualizadas';
  RAISE NOTICE '  ✓ Políticas RLS de storage atualizadas';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PRÓXIMO PASSO:';
  RAISE NOTICE '  1. Execute o script de VERIFICAÇÃO (Passo 3)';
  RAISE NOTICE '  2. Faça logout e login novamente no app';
  RAISE NOTICE '  3. Tente fazer upload de um documento';
  RAISE NOTICE '  4. Atualize a página (F5)';
  RAISE NOTICE '  5. O documento deve permanecer visível!';
  RAISE NOTICE '';
END $$;
```

---

### ✅ PASSO 3: VERIFICAÇÃO

Execute este script para confirmar que tudo está funcionando:

```sql
-- ====================================================
-- VERIFICAÇÃO FINAL
-- ====================================================

SELECT '=== VERIFICAÇÃO COMPLETA ===' as info;

-- 1. Verificar se a função retorna corretamente
SELECT 
  u.email,
  public.get_user_client_id(u.id) as client_id_retornado,
  up.client_id as client_id_esperado,
  CASE 
    WHEN public.get_user_client_id(u.id) = up.client_id THEN '✅ OK'
    WHEN public.get_user_client_id(u.id) IS NULL THEN '❌ AINDA NULL!'
    ELSE '❌ VALOR ERRADO'
  END as status
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.email = 'gadielmachado01@gmail.com';

-- 2. Verificar user_profiles
SELECT 
  email,
  name,
  role,
  client_id,
  CASE 
    WHEN client_id IS NOT NULL THEN '✅ CLIENT_ID PREENCHIDO'
    ELSE '❌ AINDA VAZIO'
  END as status
FROM user_profiles
WHERE email = 'gadielmachado01@gmail.com';

-- 3. Testar SELECT de documentos
SELECT 
  d.id,
  d.name,
  'Deve aparecer!' as resultado
FROM documents d
WHERE d.client_id = public.get_user_client_id(
  (SELECT id FROM auth.users WHERE email = 'gadielmachado01@gmail.com')
);

-- 4. Verificar políticas ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('documents', 'objects')
  AND schemaname IN ('public', 'storage')
ORDER BY tablename, cmd;
```

**📸 RESULTADO ESPERADO:**
- Todas as verificações devem mostrar `✅ OK`
- Os documentos devem aparecer na consulta
- As políticas devem estar listadas

---

## 🧪 TESTE NO APLICATIVO

Após executar os 3 scripts SQL:

### 1️⃣ LOGOUT E LOGIN

```
1. Faça LOGOUT do aplicativo
2. Limpe o cache do navegador (Ctrl + Shift + Delete)
3. Faça LOGIN novamente com o email do cliente
```

### 2️⃣ TESTAR UPLOAD

Como **Admin**:
```
1. Login como admin
2. Selecione o cliente "Nova Política"
3. Faça upload de um arquivo teste
4. Verifique se o arquivo aparece
```

### 3️⃣ TESTAR VISUALIZAÇÃO

Como **Cliente**:
```
1. Logout
2. Login com gadielmachado01@gmail.com
3. Verifique se o documento aparece
4. Atualize a página (F5) ← MOMENTO CRÍTICO
5. O documento DEVE CONTINUAR VISÍVEL! ✅
```

---

## 🔍 SE AINDA NÃO FUNCIONAR

Se após executar TUDO acima o problema persistir, execute este diagnóstico avançado:

```sql
-- DIAGNÓSTICO AVANÇADO
DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID;
  v_email TEXT := 'gadielmachado01@gmail.com';
BEGIN
  -- Buscar IDs
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  SELECT id INTO v_client_id FROM clients WHERE email = v_email OR name LIKE '%Nova Política%' OR cnpj = '321941204012401';
  
  RAISE NOTICE '=== DIAGNÓSTICO DETALHADO ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Client ID esperado: %', v_client_id;
  RAISE NOTICE 'Client ID retornado pela função: %', public.get_user_client_id(v_user_id);
  RAISE NOTICE '';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ PROBLEMA: Usuário não existe no auth.users!';
    RAISE NOTICE '   Solução: Criar o usuário através do app';
    RETURN;
  END IF;
  
  IF v_client_id IS NULL THEN
    RAISE NOTICE '❌ PROBLEMA: Cliente não existe na tabela clients!';
    RAISE NOTICE '   Solução: Verificar o CNPJ ou nome do cliente';
    RETURN;
  END IF;
  
  IF public.get_user_client_id(v_user_id) IS NULL THEN
    RAISE NOTICE '❌ PROBLEMA CRÍTICO: Função retorna NULL!';
    RAISE NOTICE '   Verificando camadas...';
    RAISE NOTICE '';
    
    -- Verificar user_profiles
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user_id AND client_id = v_client_id) THEN
      RAISE NOTICE '   ✅ user_profiles tem client_id correto';
    ELSIF EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user_id) THEN
      RAISE NOTICE '   ⚠️  user_profiles existe mas client_id está NULL ou errado';
      UPDATE user_profiles SET client_id = v_client_id WHERE id = v_user_id;
      RAISE NOTICE '   ✅ CORRIGIDO! Execute o teste novamente';
    ELSE
      RAISE NOTICE '   ❌ user_profiles não existe!';
      INSERT INTO user_profiles (id, email, name, role, client_id)
      SELECT v_user_id, email, COALESCE(name, email), 'client', v_client_id
      FROM clients WHERE id = v_client_id;
      RAISE NOTICE '   ✅ CRIADO! Execute o teste novamente';
    END IF;
  ELSE
    RAISE NOTICE '✅ TUDO OK! A função retorna o client_id correto';
  END IF;
END $$;
```

---

## 📊 RESUMO DA SOLUÇÃO

| Etapa | Ação | Tempo Estimado |
|-------|------|----------------|
| 1 | Executar diagnóstico SQL | 1 minuto |
| 2 | Executar correção SQL | 2 minutos |
| 3 | Executar verificação SQL | 1 minuto |
| 4 | Logout e login no app | 1 minuto |
| 5 | Testar upload e visualização | 2 minutos |
| **TOTAL** | | **7 minutos** |

---

## 💡 POR QUE ISSO ACONTECEU?

O problema ocorreu porque:

1. Quando você criou um cliente, o sistema criou o registro na tabela `clients`
2. Mas o `user_profile` foi criado **sem** o campo `client_id` preenchido
3. Ao fazer upload, o arquivo foi salvo no banco com o `client_id` correto
4. Mas ao buscar (SELECT), a política RLS usa `get_user_client_id()` que retornava NULL
5. Como NULL ≠ client_id do documento, a política bloqueou o acesso

---

## ✅ O QUE FOI CORRIGIDO?

1. ✅ Função `get_user_client_id()` agora busca em 3 lugares diferentes
2. ✅ Todos os `user_profiles` foram sincronizados com `client_id` correto
3. ✅ Políticas RLS foram recriadas para funcionar corretamente
4. ✅ Políticas de Storage também foram corrigidas

---

## 🎯 RESULTADO ESPERADO

Após aplicar a solução:

✅ Admin faz upload de documento para o cliente  
✅ Cliente loga no sistema  
✅ Cliente VÊ o documento  
✅ Cliente atualiza a página (F5)  
✅ Documento CONTINUA VISÍVEL  
✅ Cliente pode fazer download  

---

**🚀 Boa sorte! Execute os scripts na ordem e o problema será resolvido!**

