# Serviços Administrativos do Supabase

Este diretório contém serviços que interagem com a API administrativa do Supabase usando a chave `service_role`. Essas funções devem ser usadas com extremo cuidado.

## ⚠️ ATENÇÃO: Segurança da Service Role Key ⚠️

A chave `service_role` do Supabase tem privilégios administrativos completos sobre seu projeto Supabase. **NUNCA exponha esta chave em código de frontend aberto ao público**. Em um ambiente de produção real, estas funções deveriam ser executadas apenas:

1. Em um backend seguro (Node.js, Edge Functions, etc.)
2. Usando variáveis de ambiente para armazenar a chave, nunca hardcoded
3. Com camadas adequadas de autenticação e autorização

## Implementação Atual

Na implementação atual para este projeto de teste/desenvolvimento, a chave está temporariamente incluída no código fonte. **ISTO NÃO É SEGURO PARA PRODUÇÃO**.

Para um ambiente de produção, você deve:

1. Criar uma API segura (Edge Functions do Supabase, API Next.js, etc.)
2. Mover estas funções administrativas para essa API
3. Usar a chave `service_role` apenas no backend
4. Adicionar autenticação e autorização adequadas

## Funções Disponíveis

### 1. deleteUserByEmail(email)

Deleta completamente um usuário do sistema de autenticação do Supabase.

```typescript
const deleted = await deleteUserByEmail('usuario@exemplo.com');
```

### 2. updateUserPassword(email, newPassword)

Atualiza a senha de um usuário existente sem precisar da senha atual ou de um token de redefinição.

```typescript
const updated = await updateUserPassword('usuario@exemplo.com', 'novaSenhaSegura');
```

### 3. updateUserMetadata(email, metadata)

Atualiza os metadados de um usuário existente.

```typescript
const updated = await updateUserMetadata('usuario@exemplo.com', {
  clientId: '123456',
  role: 'client'
});
```

## Serviços de Cliente

O arquivo `clientService.ts` contém funções que combinam operações de cliente com operações de autenticação:

### 1. deleteClientWithAuth(client)

Deleta um cliente e suas credenciais de autenticação.

```typescript
const result = await deleteClientWithAuth(clientObj);
```

### 2. signUpOrUpdateUser(email, password, clientData)

Registra um novo usuário ou atualiza um existente, devolvendo o resultado da operação.

```typescript
const result = await signUpOrUpdateUser(
  'email@exemplo.com',
  'senha123',
  { 
    name: 'Nome da Empresa',
    cnpj: '12345678901234',
    clientId: 'abc-123'
  }
);

if (result.success) {
  if (result.operation === 'created') {
    // Usuário novo criado
  } else if (result.operation === 'updated') {
    // Usuário existente atualizado
  }
}
```

## Próximos Passos para Produção

1. Criar uma Edge Function ou API para expor estas operações de forma segura
2. Remover a chave service_role do código frontend
3. Adicionar autenticação e verificação de perfil de administrador para estas operações
4. Usar um arquivo .env para armazenar chaves secretas 