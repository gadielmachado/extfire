/**
 * Este arquivo contém funções administrativas que usam a chave service_role do Supabase
 * ATENÇÃO: Estas operações só devem ser executadas em um ambiente seguro (backend/API)
 * ou atrás de um mecanismo de autorização adequado
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://uktpudqpzajkucqqsyvb.supabase.co";
// ATENÇÃO: Em um ambiente real, isso deveria estar em variáveis de ambiente no servidor
// e nunca exposto no frontend
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdHB1ZHFwemFqa3VjcXFzeXZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzY5OTkwNCwiZXhwIjoyMDU5Mjc1OTA0fQ.QRWeKNWmgretwrF-FTP2DHRUZGiVEsOir9FnlBYjpsM";

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
 * Deleta um usuário de autenticação pelo email
 * @param email Email do usuário a ser deletado
 * @returns Booleano indicando sucesso ou falha
 */
export async function deleteUserByEmail(email: string): Promise<boolean> {
  try {
    // 1. Primeiro, precisamos encontrar o usuário pelo email
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
    
    // 2. Agora podemos excluir o usuário
    const { error: deleteError } = await supabaseAdmin.auth.admin
      .deleteUser(userId);
    
    if (deleteError) {
      console.error("Erro ao excluir usuário:", deleteError);
      return false;
    }
    
    console.log(`Usuário com email ${email} excluído com sucesso`);
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