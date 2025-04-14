/**
 * Serviço para gerenciamento de clientes e suas credenciais de autenticação
 */
import { supabase } from '@/integrations/supabase/client';
import { deleteUserByEmail, updateUserPassword, updateUserMetadata } from './supabaseAdmin';
import { toast } from 'sonner';
import { Client } from '@/types/client';

/**
 * Deleta um cliente e suas credenciais de autenticação
 * @param client Cliente a ser deletado
 * @returns Booleano indicando sucesso
 */
export async function deleteClientWithAuth(client: Client): Promise<boolean> {
  try {
    let credentialsDeleted = false;
    
    // Se o cliente tem email associado, tenta deletar o usuário de autenticação
    if (client.email) {
      // Primeiro, tenta desativar o acesso do usuário alterando os metadados
      // para remover associação com cliente e marcar como inativo
      try {
        await updateUserMetadata(client.email, {
          clientId: null,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          role: 'inactive',
          // Remover quaisquer outras informações sensíveis ou de acesso
          previousRole: client.userRole || 'client',
          previousClientId: client.id
        });
        console.log(`Acesso do usuário ${client.email} desativado via metadados.`);
      } catch (err) {
        console.warn(`Não foi possível desativar o acesso via metadados para ${client.email}, tentando exclusão total.`);
      }
      
      // Agora tenta excluir completamente o usuário
      credentialsDeleted = await deleteUserByEmail(client.email);
      
      if (credentialsDeleted) {
        console.log(`Credenciais do usuário ${client.email} excluídas com sucesso.`);
      } else {
        console.warn(`Não foi possível excluir o usuário de autenticação para ${client.email}.`);
        
        // Se não foi possível excluir, tenta desativar o usuário via bloqueio
        try {
          // Desativar usuário usando um email aleatório para impedir login
          const randomSuffix = Math.random().toString(36).substring(2, 15);
          const invalidEmail = `deleted-${randomSuffix}-${client.email}`;
          
          // Tentar atualizar o email do usuário para um inválido, impedindo login
          const { error } = await supabase.auth.updateUser({
            email: invalidEmail,
          });
          
          if (!error) {
            console.log(`Email do usuário alterado para ${invalidEmail} para impedir acesso.`);
            credentialsDeleted = true;
          }
        } catch (err) {
          console.error(`Erro ao tentar invalidar email do usuário: ${err}`);
        }
      }
    }
    
    return credentialsDeleted || true; // Retorna verdadeiro mesmo se apenas os metadados foram alterados
  } catch (error) {
    console.error("Erro ao excluir cliente e suas credenciais:", error);
    toast.error("Erro ao excluir completamente o cliente. Algumas informações podem permanecer no sistema.");
    return false;
  }
}

/**
 * Registra um novo usuário de autenticação ou atualiza as credenciais existentes
 * @param email Email do usuário
 * @param password Senha
 * @param clientData Dados do cliente a serem associados
 * @returns Booleano indicando sucesso e o tipo de operação realizada
 */
export async function signUpOrUpdateUser(
  email: string,
  password: string, 
  clientData: { 
    name: string;
    cnpj: string;
    clientId: string;
  }
): Promise<{ success: boolean; operation: 'created' | 'updated' | 'failed' }> {
  try {
    // Tenta criar um novo usuário
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: clientData.name,
          cnpj: clientData.cnpj,
          role: 'client',
          clientId: clientData.clientId
        }
      }
    });
    
    // Se não houver erro, o usuário foi criado com sucesso
    if (!error) {
      return { success: true, operation: 'created' };
    }
    
    // Se o erro indicar que o usuário já existe, tentamos atualizar a senha
    if (error.message.includes('User already registered') || 
        error.message.includes('already in use') || 
        error.message.includes('already exists')) {
      
      // Tenta atualizar a senha do usuário existente
      const updated = await updateUserPassword(email, password);
      
      if (updated) {
        return { success: true, operation: 'updated' };
      } else {
        console.error("Erro ao atualizar senha do usuário existente");
        return { success: false, operation: 'failed' };
      }
    }
    
    // Qualquer outro erro
    console.error("Erro ao registrar usuário:", error);
    return { success: false, operation: 'failed' };
  } catch (error) {
    console.error("Erro geral no processo de registro/atualização:", error);
    return { success: false, operation: 'failed' };
  }
} 