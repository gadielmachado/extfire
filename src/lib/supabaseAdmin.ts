/**
 * Este arquivo contém funções administrativas que usam a chave service_role do Supabase
 * ATENÇÃO: Estas operações só devem ser executadas em um ambiente seguro (backend/API)
 * ou atrás de um mecanismo de autorização adequado
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://dwhbznsijdsiwccamfvd.supabase.co";
// ATENÇÃO: Em um ambiente real, isso deveria estar em variáveis de ambiente no servidor
// e nunca exposto no frontend
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aGJ6bnNpamRzaXdjY2FtZnZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDA3NTIxMSwiZXhwIjoyMDc1NjUxMjExfQ.qkRD5E4-uQPBI3YIqWQjIHMgee-sG_Ed7bArFdDk6HE";

// Cliente Supabase com privilégios administrativos
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Revoga todas as sessões de um usuário pelo ID
 * @param userId ID do usuário para revogar sessões
 * @returns Booleano indicando sucesso ou falha
 */
export async function revokeAllUserSessions(userId: string): Promise<boolean> {
  try {
    if (!userId || userId.trim() === '') {
      console.error("ID de usuário vazio ou inválido fornecido para revogação de sessões");
      return false;
    }

    console.log(`Revogando todas as sessões para o usuário com ID: ${userId}`);
    
    // Invocar a API para revogar todas as sessões
    const { error } = await supabaseAdmin.auth.admin.signOut(userId);
    
    if (error) {
      console.error("Erro ao revogar sessões do usuário:", error);
      return false;
    }
    
    console.log(`Todas as sessões do usuário ${userId} foram revogadas com sucesso`);
    return true;
  } catch (error) {
    console.error("Erro geral ao revogar sessões do usuário:", error);
    return false;
  }
}

/**
 * Deleta um usuário de autenticação pelo email
 * @param email Email do usuário a ser deletado
 * @returns Booleano indicando sucesso ou falha
 */
export async function deleteUserByEmail(email: string): Promise<boolean> {
  try {
    console.log(`Tentando excluir o usuário com email: ${email}`);
    
    if (!email || email.trim() === '') {
      console.error("Email vazio ou inválido fornecido para exclusão");
      return false;
    }
    
    // Normalizar o email para garantir consistência
    const normalizedEmail = email.trim().toLowerCase();
    
    // 1. Primeiro, precisamos encontrar o usuário pelo email
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin
      .listUsers({ 
        page: 1,
        perPage: 1,
        filters: { email: normalizedEmail }
      });
    
    if (searchError) {
      console.error("Erro ao procurar usuário:", searchError);
      return false;
    }
    
    if (!users || users.users.length === 0) {
      console.warn(`Usuário com email ${normalizedEmail} não encontrado no sistema de autenticação.`);
      return false;
    }
    
    const userToDelete = users.users[0];
    
    // Validação adicional para verificar se é realmente o usuário que queremos excluir
    if (userToDelete.email?.toLowerCase() !== normalizedEmail) {
      console.error(`Erro de validação: Email encontrado (${userToDelete.email}) não corresponde ao email solicitado para exclusão (${normalizedEmail})`);
      return false;
    }
    
    console.log(`Usuário encontrado com ID: ${userToDelete.id}, email: ${userToDelete.email}`);
    
    // Primeiro, revogar todas as sessões ativas do usuário
    console.log(`Revogando todas as sessões ativas do usuário antes da exclusão...`);
    const revokeResult = await revokeAllUserSessions(userToDelete.id);
    
    if (!revokeResult) {
      console.warn(`Não foi possível revogar todas as sessões, mas continuaremos com a exclusão do usuário.`);
    }
    
    // 2. Agora podemos excluir o usuário
    const { error: deleteError } = await supabaseAdmin.auth.admin
      .deleteUser(userToDelete.id);
    
    if (deleteError) {
      console.error("Erro ao excluir usuário:", deleteError);
      return false;
    }
    
    console.log(`Usuário com email ${normalizedEmail} excluído com sucesso`);
    return true;
  } catch (error) {
    console.error("Erro geral ao excluir usuário:", error);
    return false;
  }
}

/**
 * Atualiza a senha de um usuário existente (mesmo sem estar logado)
 * @param email Email do usuário
 * @param newPassword Nova senha
 * @returns Booleano indicando sucesso ou falha
 */
export async function updateUserPassword(email: string, newPassword: string): Promise<boolean> {
  try {
    // 1. Primeiro, encontrar o usuário pelo email
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin
      .listUsers({ 
        page: 1,
        perPage: 1,
        filters: { email: email }
      });
    
    if (searchError || !users || users.users.length === 0) {
      console.error("Erro ao procurar usuário ou usuário não encontrado:", searchError);
      return false;
    }
    
    const userId = users.users[0].id;
    
    // 2. Atualizar a senha
    const { error: updateError } = await supabaseAdmin.auth.admin
      .updateUserById(userId, { password: newPassword });
    
    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError);
      return false;
    }
    
    console.log(`Senha do usuário ${email} atualizada com sucesso`);
    return true;
  } catch (error) {
    console.error("Erro geral ao atualizar senha:", error);
    return false;
  }
}

/**
 * Atualiza os metadados de um usuário existente
 * @param email Email do usuário
 * @param metadata Novos metadados (clientId, role, etc)
 * @returns Booleano indicando sucesso ou falha
 */
export async function updateUserMetadata(email: string, metadata: Record<string, any>): Promise<boolean> {
  try {
    // 1. Primeiro, encontrar o usuário pelo email
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin
      .listUsers({ 
        page: 1,
        perPage: 1,
        filters: { email: email }
      });
    
    if (searchError || !users || users.users.length === 0) {
      console.error("Erro ao procurar usuário ou usuário não encontrado:", searchError);
      return false;
    }
    
    const userId = users.users[0].id;
    
    // 2. Atualizar os metadados
    const { error: updateError } = await supabaseAdmin.auth.admin
      .updateUserById(userId, { user_metadata: metadata });
    
    if (updateError) {
      console.error("Erro ao atualizar metadados:", updateError);
      return false;
    }
    
    console.log(`Metadados do usuário ${email} atualizados com sucesso`);
    return true;
  } catch (error) {
    console.error("Erro geral ao atualizar metadados:", error);
    return false;
  }
} 