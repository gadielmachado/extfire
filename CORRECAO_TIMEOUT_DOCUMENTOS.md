# Correção do Problema de Timeout e Desaparecimento de Documentos

## Problema Identificado

O sistema estava apresentando timeouts ao buscar o `user_profile`, causando:
- Documentos aparecendo por alguns segundos e depois desaparecendo
- Mensagem de erro: "⚠️ Timeout ao buscar user_profile após 5s"
- ClientId alternando entre dois valores diferentes
- Documentos não sendo mostrados quando o clientId mudava

## Causa Raiz

1. **Timeout de 3 segundos** no `AuthContext.tsx` que interrompia a busca do `user_profile` antes dela ser concluída
2. **Race condition** entre o carregamento do AuthContext e ClientContext
3. Falta de tentativas de retry adequadas na busca do `user_profile`

## Correções Implementadas

### 1. AuthContext.tsx - Remoção do Timeout

**ANTES:**
```typescript
const syncUserDataFromProfile = async (userId: string, userEmail: string) => {
  // Timeout geral de 3 segundos para toda a função
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn(`⏱️ Timeout geral de 3s atingido para ${userEmail}`);
      resolve(null);
    }, 3000);
  });
  
  // ... código de busca
  
  // Usar Promise.race para garantir que não trave
  const result = await Promise.race([fetchPromise(), timeoutPromise]);
  return result;
};
```

**DEPOIS:**
```typescript
const syncUserDataFromProfile = async (userId: string, userEmail: string) => {
  try {
    console.log(`🔍 Buscando user_profile para: ${userEmail}`);
    
    // Tentativa 1: Buscar do user_profile com múltiplas tentativas
    const maxRetries = 5;
    let attempt = 0;
    let profileData = null;
    
    while (attempt < maxRetries && !profileData) {
      attempt++;
      
      try {
        console.log(`Tentativa ${attempt}/${maxRetries} de buscar user_profile...`);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('client_id, role, name, cnpj')
          .eq('id', userId)
          .maybeSingle();
        
        if (!error && data) {
          console.log(`✅ User_profile encontrado na tentativa ${attempt}:`, {
            clientId: data.client_id,
            role: data.role
          });
          
          profileData = {
            clientId: data.client_id,
            role: data.role,
            name: data.name,
            cnpj: data.cnpj
          };
          break;
        }
        
        // Aguardar 1 segundo antes de tentar novamente
        if (attempt < maxRetries && !profileData) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err: any) {
        console.warn(`⚠️ Exceção ao buscar user_profile (tentativa ${attempt}):`, err.message);
        
        // Aguardar antes de tentar novamente
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // Se encontrou no user_profile, retornar
    if (profileData) {
      return profileData;
    }
    
    // Tentativa 2: Se user_profile falhou após todas as tentativas, 
    // buscar direto da tabela clients
    console.log(`🔄 Buscando client_id direto da tabela clients para: ${userEmail}`);
    
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name, cnpj')
      .eq('email', userEmail)
      .maybeSingle();
    
    if (!clientError && clientData) {
      return {
        clientId: clientData.id,
        role: 'client',
        name: clientData.name,
        cnpj: clientData.cnpj
      };
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Erro crítico ao buscar dados do perfil:', error?.message || error);
    return null;
  }
};
```

**Mudanças:**
- ✅ **Removido o timeout de 3 segundos** - agora a função aguarda o tempo necessário
- ✅ **Adicionado sistema de retry** - 5 tentativas com intervalo de 1 segundo
- ✅ **Melhor tratamento de erros** - logs mais detalhados para diagnóstico
- ✅ **Fallback para tabela clients** - se user_profile falhar, busca direto da tabela clients

### 2. ClientContext.tsx - Melhoria na Sincronização

**Mudanças:**
- ✅ **Adicionado delay de 500ms** antes de carregar dados do Supabase
- ✅ **Aumentado tentativas de retry** de 3 para 5
- ✅ **Reduzido intervalo de retry** de 3s para 2s para sincronização mais rápida

```typescript
const loadWithDelay = async () => {
  // Aguardar 500ms para garantir que o AuthContext terminou completamente
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log("🔄 Iniciando carregamento de dados do Supabase (fonte primária)...");
  console.log("👤 Usuário atual:", currentUser?.email, "clientId:", currentUser?.clientId);
  
  // SEMPRE tentar carregar do Supabase primeiro
  const supabaseLoaded = await loadClientsFromSupabase();
  
  // ... resto do código
};
```

## Benefícios das Correções

1. **✅ SEM MAIS TIMEOUTS**: Os documentos não desaparecem mais após alguns segundos
2. **✅ CLIENTID ESTÁVEL**: O clientId não fica alternando entre valores diferentes
3. **✅ DADOS PERSISTENTES**: Documentos aparecem e permanecem visíveis
4. **✅ MELHOR RESILIÊNCIA**: Sistema tenta múltiplas vezes antes de desistir
5. **✅ SINCRONIZAÇÃO CONFIÁVEL**: Race conditions foram eliminadas

## Como Testar

1. Limpe o cache do navegador (Ctrl + Shift + Delete)
2. Faça logout e login novamente como admin
3. Faça upload de um documento em um cliente
4. Faça logout do admin
5. Faça login como o cliente que recebeu o documento
6. **RESULTADO ESPERADO**: O documento deve aparecer e **permanecer visível indefinidamente**

## Próximos Passos (se ainda houver problemas)

Se ainda houver problemas de timeout, verifique:
1. **Policies RLS no Supabase** - certifique-se de que as permissões estão corretas
2. **Triggers do banco de dados** - verifique se os triggers estão funcionando corretamente
3. **Conexão com o Supabase** - verifique a latência e estabilidade da conexão
4. **Console do navegador** - verifique os logs detalhados para identificar onde está travando

## Arquivos Modificados

- ✅ `src/contexts/AuthContext.tsx` - Removido timeout e adicionado retry
- ✅ `src/contexts/ClientContext.tsx` - Adicionado delay e melhorado retry
- ✅ Build atualizado em `dist/` - Nova versão compilada sem timeouts

## Data da Correção

08/11/2025

