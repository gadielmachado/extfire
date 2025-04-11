/**
 * Serviço para gerenciamento de clientes e suas credenciais de autenticação
 */
import { supabase } from '@/integrations/supabase/client';
import { deleteUserByEmail, updateUserPassword } from './supabaseAdmin';
import { toast } from 'sonner';
import { Client } from '@/types/client';

/**
 * Deleta um cliente e suas credenciais de autenticação
 * @param client Cliente a ser deletado
 * @returns Booleano indicando sucesso
 */
export async function deleteClientWithAuth(client: Client): Promise<boolean> {
  try {
    // Se o cliente tem email associado, tenta deletar o usuário de autenticação
    if (client.email) {
      const deleted = await deleteUserByEmail(client.email);
      if (!deleted) {
        console.warn(`Não foi possível excluir o usuário de autenticação para ${client.email}, mas continuaremos com a exclusão do cliente.`);
      } else {
        console.log(`Credenciais do usuário ${client.email} excluídas com sucesso.`);
      }
    }
    
    return true;
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