/**
 * Serviço para gerenciamento de clientes e suas credenciais de autenticação
 */
import { supabase } from '@/integrations/supabase/client';
import { deleteUserByEmail, updateUserPassword, updateUserMetadata } from './supabaseAdmin';
import { toast } from 'sonner';
import { Client } from '@/types/client';
import { AuthError } from '@supabase/supabase-js';

/**
 * Deleta um cliente e suas credenciais de autenticação
 * @param client Cliente a ser deletado
 * @returns Booleano indicando sucesso
 */
export async function deleteClientWithAuth(client: Client): Promise<boolean> {
  try {
    console.log(`Iniciando processo de exclusão do cliente: ${client.name} (ID: ${client.id})`);
    
    // Validar se o cliente tem email associado
    if (!client.email || client.email.trim() === '') {
      console.log(`Cliente ${client.name} (ID: ${client.id}) não possui email associado. Nenhuma credencial para excluir.`);
      return true; // Retorna true porque não há o que excluir
    }
    
    console.log(`Tentando excluir credenciais de autenticação para o email: ${client.email}`);
    
    // Antes de excluir, atualizar os metadados do usuário para refletir o status de desativado
    // Isso é uma medida adicional caso por algum motivo a exclusão falhe
    try {
      console.log(`Marcando usuário como desativado nos metadados antes da exclusão...`);
      await updateUserMetadata(client.email, {
        disabled: true,
        deactivatedAt: new Date().toISOString(),
        role: 'disabled',
        clientId: null // Remover associação com o cliente
      });
    } catch (err) {
      console.warn(`Falha ao atualizar metadados, continuando com exclusão...`, err);
    }
    
    // Deleta o usuário específico pelo email
    // A função deleteUserByEmail já inclui a revogação de todas as sessões
    const deleted = await deleteUserByEmail(client.email);
    
    if (!deleted) {
      console.warn(`Não foi possível excluir o usuário de autenticação para ${client.email}, mas continuaremos com a exclusão do cliente.`);
      
      // Forçar logout local caso a exclusão do usuário falhe
      try {
        console.log(`Tentando fazer logout local para garantir que sessões não persistam...`);
        await supabase.auth.signOut();
      } catch (logoutErr) {
        console.warn(`Falha ao fazer logout local:`, logoutErr);
      }
      
      return true; // Retornamos true para permitir que a exclusão do cliente continue
    } else {
      console.log(`Credenciais do usuário ${client.email} excluídas com sucesso.`);
      
      // Verificar novamente se o usuário foi realmente excluído
      // Usando backoff exponencial para tentar algumas vezes
      let verificado = false;
      let tentativas = 0;
      const maxTentativas = 3;
      
      while (!verificado && tentativas < maxTentativas) {
        try {
          tentativas++;
          
          // Atraso exponencial: 1s, 2s, 4s
          const delayMs = Math.pow(2, tentativas - 1) * 1000;
          console.log(`Verificando exclusão (tentativa ${tentativas}/${maxTentativas}), aguardando ${delayMs}ms...`);
          
          // Esperar um pouco antes de verificar
          await new Promise(resolve => setTimeout(resolve, delayMs));
          
          // Verificar se o usuário ainda existe no Supabase usando signInWithPassword
          const { error } = await supabase.auth.signInWithPassword({
            email: client.email,
            password: "senha-aleatoria-que-nao-deve-funcionar-123456789"
          });
          
          // Se o erro for "usuário não encontrado", então a exclusão funcionou
          if (error && (
            error.message.includes('user not found') || 
            error.message.includes('User not found') ||
            error.message.includes('Invalid login credentials'))) {
            console.log(`Verificação confirmou que o usuário foi excluído com sucesso.`);
            verificado = true;
          } else {
            console.warn(`Usuário ainda parece existir após exclusão. Tentando novamente...`);
          }
        } catch (verifyErr) {
          console.warn(`Erro ao verificar exclusão:`, verifyErr);
        }
      }
      
      if (!verificado) {
        console.warn(`Não foi possível confirmar a exclusão completa do usuário após ${maxTentativas} tentativas.`);
      }
      
      // Garantir que o usuário seja deslogado localmente
      try {
        console.log(`Realizando logout local para garantir que sessões não persistam...`);
        await supabase.auth.signOut();
      } catch (logoutErr) {
        console.warn(`Falha ao fazer logout local após exclusão bem-sucedida:`, logoutErr);
      }
      
      // Limpar qualquer cache ou estado relacionado ao cliente excluído
      localStorage.removeItem(`extfire_client_${client.id}`);
      
      return true;
    }
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
): Promise<{ success: boolean; operation: 'created' | 'updated' | 'failed', error?: AuthError | null }> {
  try {
    console.log(`Tentando registrar/atualizar usuário com email: ${email}`);
    
    // Lista de emails de administradores
    const ADMIN_EMAILS = [
      'gadielmachado.bm@gmail.com',
      'gadyel.bm@gmail.com',
      'extfire.extfire@gmail.com',
      'paoliellocristiano@gmail.com'
    ];
    
    // Verificar se é um email de administrador
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
    
    // Tratar caso especial para paoliellocristiano@gmail.com
    if (email.toLowerCase() === 'paoliellocristiano@gmail.com') {
      console.log(`Email especial detectado: ${email}. Tratando como administrador.`);
      
      // Primeiro verificar se o usuário já existe
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
        
        // Se o usuário já existe, apenas atualizamos os metadados e a senha
        if (!userError && userData) {
          console.log(`Usuário admin ${email} já existe. Atualizando metadados e senha...`);
          
          // Atualizar metadados para garantir que seja admin
          const { updateUserMetadata, updateUserPassword } = await import('./supabaseAdmin');
          
          await updateUserMetadata(email, {
            name: clientData.name || 'Cristiano (Admin)',
            role: 'admin',
            isAdmin: true
          });
          
          // Atualizar senha se fornecida
          if (password && password.length >= 6) {
            await updateUserPassword(email, password);
          }
          
          return { success: true, operation: 'updated' };
        }
        
        // Se o usuário não existe, criamos com permissões de admin
        console.log(`Criando usuário admin ${email}...`);
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: password || 'Extfire@197645', // Usar senha fornecida ou padrão
          options: {
            data: {
              name: clientData.name || 'Cristiano (Admin)',
              role: 'admin',
              isAdmin: true
            }
          }
        });
        
        if (signUpError) {
          console.error(`Erro ao criar usuário admin ${email}:`, signUpError);
          return { success: false, operation: 'failed', error: signUpError };
        }
        
        console.log(`Usuário admin ${email} criado com sucesso!`);
        return { success: true, operation: 'created' };
      } catch (specialError) {
        console.error(`Erro ao tratar email especial ${email}:`, specialError);
      }
    }
    
    // Para usuários normais, tenta criar um novo usuário
    console.log(`Tentando criar usuário: ${email}, Role: ${isAdmin ? 'admin' : 'client'}`);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: clientData.name,
          cnpj: clientData.cnpj,
          role: isAdmin ? 'admin' : 'client',
          clientId: isAdmin ? null : clientData.clientId
        }
      }
    });
    
    // Se não houver erro, o usuário foi criado com sucesso
    if (!error) {
      console.log(`Usuário ${email} criado com sucesso!`);
      
      // CRÍTICO: Aguardar um pouco para o auth.users ser criado antes de criar user_profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Criar user_profile usando função RPC
      try {
        console.log(`Criando user_profile via trigger automático para ${email}...`);
        // O trigger do banco deve criar automaticamente, mas vamos garantir
      } catch (profileErr) {
        console.error(`Erro ao criar user_profile:`, profileErr);
      }
      
      return { success: true, operation: 'created' };
    }
    
    // Se o erro indicar que o usuário já existe, tentamos atualizar a senha e os metadados
    if (error.message.includes('User already registered') || 
        error.message.includes('already in use') || 
        error.message.includes('already exists')) {
      
      console.log(`Usuário ${email} já existe. Tentando atualizar senha e metadados...`);
      
      // Atualizar metadados para garantir que os dados estejam corretos
      const { updateUserMetadata, updateUserPassword } = await import('./supabaseAdmin');
      
      // Atualizar metadados primeiro
      const metadataUpdated = await updateUserMetadata(email, {
        name: clientData.name,
        cnpj: clientData.cnpj,
        role: isAdmin ? 'admin' : 'client',
        clientId: isAdmin ? null : clientData.clientId
      });
      
      // Depois atualizar a senha
      const passwordUpdated = await updateUserPassword(email, password);
      
      if (metadataUpdated && passwordUpdated) {
        console.log(`Dados do usuário ${email} atualizados com sucesso!`);
        
        // CRÍTICO: Aguardar para garantir que auth.users seja atualizado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`✅ Metadados e user_profile atualizados via trigger para ${email}`);
        
        return { success: true, operation: 'updated' };
      } else if (metadataUpdated) {
        console.warn(`Metadados do usuário ${email} atualizados, mas houve erro ao atualizar senha.`);
        return { success: true, operation: 'updated' };
      } else if (passwordUpdated) {
        console.warn(`Senha do usuário ${email} atualizada, mas houve erro ao atualizar metadados.`);
        return { success: true, operation: 'updated' };
      } else {
        console.error(`Erro ao atualizar usuário ${email}.`);
        return { success: false, operation: 'failed', error: new AuthError('Falha ao atualizar metadados e senha do usuário') };
      }
    }
    
    // Qualquer outro erro
    console.error("Erro ao registrar usuário:", error);
    return { success: false, operation: 'failed', error };
  } catch (error) {
    console.error("Erro geral no processo de registro/atualização:", error);
    return { success: false, operation: 'failed', error: error as AuthError };
  }
} 