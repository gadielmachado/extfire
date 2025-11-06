import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types/user';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Client } from '@/types/client';

// Lista de emails de administradores autorizados
const ADMIN_EMAILS = [
  'gadielmachado.bm@gmail.com',
  'gadyel.bm@gmail.com',
  'extfire.extfire@gmail.com',
  'paoliellocristiano@gmail.com'
];

// Senha padrão para administradores
const ADMIN_PASSWORD = '200105@Ga';

// Lista de emails de administradores com necessidade de recriação (fix para emails que perderam acesso)
const ADMIN_RECREATE = [
  'gadyel.bm@gmail.com',
  'paoliellocristiano@gmail.com'
];

// Caso especial - Admin que requer tratamento especial para garantir criação/login
const SPECIAL_ADMIN = 'paoliellocristiano@gmail.com';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isClientBlocked: (clients?: Client[]) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Função para verificar se um email é de administrador
  const isAdminEmail = (email: string | null): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
  };

  // Função para verificar se o cliente atual está bloqueado
  const isClientBlocked = (clientsList?: Client[]): boolean => {
    if (isAdmin) return false; // Admins nunca são bloqueados
    
    // Se não for admin, verificar se o cliente está bloqueado
    if (!currentUser) return false;
    
    // Verificar se temos clientId ou email para identificar o cliente
    const clientId = currentUser.clientId;
    const userEmail = currentUser.email;
    
    if (!clientId && !userEmail) return false;
    
    // Usar a lista de clientes fornecida ou uma lista vazia
    const clients = clientsList || [];
    
    // Encontrar o cliente correspondente
    const currentClient = clients.find(client => 
      (clientId && client.id === clientId) || 
      (userEmail && client.email === userEmail)
    );
    
    // Se não encontrar o cliente ou o cliente não estiver bloqueado, retorna false
    if (!currentClient) return false;
    
    return currentClient.isBlocked === true;
  };

  useEffect(() => {
    // Função para garantir que os emails de admin existam no Supabase
    const ensureAdminUsersExist = async () => {
      // Verificar emails de admin que precisam ser recriados/garantidos
      for (const email of ADMIN_RECREATE) {
        try {
          console.log(`Verificando existência do usuário admin: ${email}`);
          
          // Verificar se é o admin especial que precisa de tratamento diferenciado
          const isSpecialAdmin = email.toLowerCase() === SPECIAL_ADMIN.toLowerCase();
          
          if (isSpecialAdmin) {
            console.log(`Tratamento especial para o admin: ${email}`);
            
            // Importar o serviço clientService de forma dinâmica
            const { signUpOrUpdateUser } = await import('@/lib/clientService');
            
            // Usar a função aprimorada que trata especificamente este email
            const result = await signUpOrUpdateUser(
              email,
              ADMIN_PASSWORD,
              {
                name: 'Cristiano (Admin)',
                cnpj: '',
                clientId: ''
              }
            );
            
            if (result.success) {
              console.log(`Admin especial ${email} ${result.operation === 'created' ? 'criado' : 'atualizado'} com sucesso!`);
            } else {
              console.error(`Falha ao garantir admin especial ${email}`);
            }
            
            continue; // Pula para o próximo email
          }
          
          // Para outros emails de admin, segue o fluxo normal
          // Tentar recuperar senha para verificar se usuário existe
          const { data, error } = await supabase.auth.resetPasswordForEmail(email);
          
          // Se der erro que o usuário não existe, criar
          if (error && (error.message.includes('user not found') || error.message.includes('User not found'))) {
            console.log(`Criando usuário admin: ${email}`);
            
            // Criar o usuário admin
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: email,
              password: ADMIN_PASSWORD,
              options: {
                data: {
                  name: 'Usuário Master',
                  role: 'admin'
                }
              }
            });
            
            if (signUpError) {
              console.error(`Erro ao criar usuário admin ${email}:`, signUpError);
            } else {
              console.log(`Usuário admin ${email} criado com sucesso!`);
            }
          } else {
            console.log(`Usuário admin ${email} já existe.`);
          }
        } catch (err) {
          console.error(`Erro ao verificar/criar usuário admin ${email}:`, err);
        }
      }
    };

    // Executar apenas uma vez ao carregar
    if (!isLoading && session?.user && isAdmin) {
      ensureAdminUsersExist();
    }

    // Configure a listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user) {
          // Verificar se o usuário é admin baseado na lista de emails
          const userIsAdmin = isAdminEmail(session.user.email);
          setIsAdmin(userIsAdmin);
          
          // Map Supabase user to our User type
          const user: User = {
            id: session.user.id,
            cnpj: session.user.user_metadata?.cnpj || '',
            name: session.user.user_metadata?.name || 'Usuário',
            email: session.user.email || '',
            role: userIsAdmin ? 'admin' : 'client',
            clientId: session.user.user_metadata?.clientId || null
          };
          setCurrentUser(user);
          localStorage.setItem('extfireUser', JSON.stringify(user));
        } else {
          setCurrentUser(null);
          setIsAdmin(false);
          localStorage.removeItem('extfireUser');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Verificar se o usuário é admin baseado na lista de emails
        const userIsAdmin = isAdminEmail(session.user.email);
        setIsAdmin(userIsAdmin);
        
        const user: User = {
          id: session.user.id,
          cnpj: session.user.user_metadata?.cnpj || '',
          name: session.user.user_metadata?.name || 'Usuário',
          email: session.user.email || '',
          role: userIsAdmin ? 'admin' : 'client',
          clientId: session.user.user_metadata?.clientId || null
        };
        setCurrentUser(user);
        localStorage.setItem('extfireUser', JSON.stringify(user));
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Special case for admin user shortcut
      if (email === "admin" && password === "admin123") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'gadielmachado.bm@gmail.com',
          password: ADMIN_PASSWORD
        });
        
        if (error) {
          // Verificar se o erro é realmente que o usuário não existe, caso contrário, não criar
          if (error.message.includes('user not found') || error.message.includes('User not found')) {
            console.log("Usuário admin não encontrado, tentando criar...");
            
            // Tenta criar apenas se o usuário realmente não existir
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: 'gadielmachado.bm@gmail.com',
              password: ADMIN_PASSWORD,
              options: {
                data: {
                  name: 'Usuário Master',
                  role: 'admin'
                }
              }
            });
            
            if (signUpError) {
              // Se erro indicar que o usuário já existe, tente login novamente
              if (signUpError.message.includes('User already registered') || 
                  signUpError.message.includes('already registered') || 
                  signUpError.message.includes('already exists') ||
                  signUpError.message.includes('already in use')) {
                
                toast.error("Usuário admin já existe. Por favor, verifique suas credenciais e tente novamente.");
              } else {
                toast.error("Erro ao criar usuário admin: " + signUpError.message);
              }
              setIsLoading(false);
              return false;
            }
            
            toast.success("Usuário admin criado com sucesso! Efetue login novamente.");
            setIsLoading(false);
            return false; // Retorna false para que o usuário faça login novamente
          } else {
            toast.error("Erro de autenticação: " + error.message);
            setIsLoading(false);
            return false;
          }
        }
        
        setIsAdmin(true);
        setIsLoading(false);
        return true;
      }
      
      // Special shortcut for gadyel.bm email
      if (email === "gadyel" && password === "admin123") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'gadyel.bm@gmail.com',
          password: ADMIN_PASSWORD
        });
        
        if (error) {
          // Se o usuário não existir, tenta criar
          if (error.message.includes('user not found') || error.message.includes('User not found')) {
            console.log("Usuário gadyel.bm não encontrado, tentando criar...");
            
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: 'gadyel.bm@gmail.com',
              password: ADMIN_PASSWORD,
              options: {
                data: {
                  name: 'Gadiel (Admin)',
                  role: 'admin'
                }
              }
            });
            
            if (signUpError) {
              toast.error("Erro ao criar usuário gadyel.bm: " + signUpError.message);
              setIsLoading(false);
              return false;
            }
            
            toast.success("Usuário gadyel.bm criado com sucesso! Efetue login novamente.");
            setIsLoading(false);
            return false;
          } else {
            toast.error("Erro de autenticação: " + error.message);
            setIsLoading(false);
            return false;
          }
        }
        
        setIsAdmin(true);
        setIsLoading(false);
        return true;
      }
      
      // Special shortcut for paoliellocristiano email
      if (email === "cristiano" && password === "admin123") {
        console.log("Tentando login com email especial paoliellocristiano@gmail.com");
        
        try {
          // Importar o serviço especial para garantir que o usuário exista
          const { signUpOrUpdateUser } = await import('@/lib/clientService');
          
          // Primeiro garantir que o usuário exista com os metadados corretos
          const setupResult = await signUpOrUpdateUser(
            'paoliellocristiano@gmail.com',
            ADMIN_PASSWORD,
            {
              name: 'Cristiano (Admin)',
              cnpj: '',
              clientId: ''
            }
          );
          
          if (setupResult.success) {
            console.log(`Admin especial configurado com sucesso: ${setupResult.operation}`);
            
            // Agora tenta fazer login
            const { data, error } = await supabase.auth.signInWithPassword({
              email: 'paoliellocristiano@gmail.com',
              password: ADMIN_PASSWORD
            });
            
            if (error) {
              console.error("Erro ao fazer login com email paoliellocristiano@gmail.com:", error);
              toast.error("Não foi possível fazer login como admin: " + error.message);
              setIsLoading(false);
              return false;
            }
            
            setIsAdmin(true);
            toast.success("Login como administrador realizado com sucesso!");
            setIsLoading(false);
            return true;
          } else {
            console.error("Falha ao configurar admin especial:", setupResult);
            toast.error("Erro ao configurar conta de administrador");
            setIsLoading(false);
            return false;
          }
        } catch (specialError) {
          console.error("Erro ao processar admin especial:", specialError);
          toast.error("Erro inesperado ao processar login de administrador");
          setIsLoading(false);
          return false;
        }
      }
      
      // For regular users, login with email/password
      const cleanEmail = email.trim().toLowerCase();
      
      console.log("Tentando login com email:", cleanEmail);
      
      // Verificar se é um email de admin tentando fazer login
      const isAttemptingAdminLogin = isAdminEmail(cleanEmail);
      
      // Se for um admin, verificar se a senha está correta
      if (isAttemptingAdminLogin && password !== ADMIN_PASSWORD) {
        toast.error("Senha de administrador incorreta");
        setIsLoading(false);
        return false;
      }
      
      // Para logins de admin, sempre tentar com a senha padrão
      if (isAttemptingAdminLogin) {
        // Sempre tentar primeiro com a senha padrão de admin
        const { data: adminData, error: adminError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: ADMIN_PASSWORD,
        });
        
        // Se o login for bem-sucedido, retornar
        if (!adminError) {
          console.log("Login admin bem-sucedido com a senha padrão");
          setIsAdmin(true);
          setIsLoading(false);
          return true;
        }
        
        // Se o erro for que o usuário não existe
        if (adminError.message.includes('user not found') || adminError.message.includes('User not found')) {
          // Verificar com o usuário antes de criar nova conta
          toast.error("Conta de administrador não encontrada. Entre em contato com o suporte.");
          setIsLoading(false);
          return false;
        } else {
          toast.error("Erro de autenticação: " + adminError.message);
          setIsLoading(false);
          return false;
        }
      }
      
      // Para usuários regulares, tentar login normal
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      
      if (error) {
        // Verificar se o erro é "senha incorreta" ou "usuário não encontrado"
        if (error.message.includes('Invalid login') || 
            error.message.includes('Invalid email') || 
            error.message.includes('Invalid password') ||
            error.message.includes('Email not confirmed')) {
          toast.error("Email ou senha inválidos");
        } else if (error.message.includes('user not found') || 
                  error.message.includes('User not found')) {
          toast.error("Usuário não encontrado. Verifique seu email ou crie uma nova conta.");
        } else {
          toast.error("Erro ao fazer login: " + error.message);
        }
        
        setIsLoading(false);
        return false;
      }
      
      // Login bem-sucedido
      // Verificar se é admin
      if (isAdminEmail(cleanEmail)) {
        setIsAdmin(true);
      }
      
      // CORREÇÃO: Sincronizar user_profile após login bem-sucedido
      // Isso garante que o user_profile exista e esteja atualizado
      try {
        console.log(`Sincronizando user_profile para ${cleanEmail}...`);
        
        // Determinar role e clientId
        const userRole = isAdminEmail(cleanEmail) ? 'admin' : 'client';
        let userClientId = data.user.user_metadata?.clientId || null;
        let userCnpj = data.user.user_metadata?.cnpj || null;
        
        // Se for cliente e não tiver clientId, tentar encontrar pelo email
        if (!isAdminEmail(cleanEmail) && !userClientId) {
          // Tentar obter a lista de clientes do localStorage
          const storedClients = localStorage.getItem('extfireClients');
          
          if (storedClients) {
            const clients = JSON.parse(storedClients);
            const matchingClient = clients.find((client: any) => 
              client.email && client.email.toLowerCase() === cleanEmail
            );
            
            if (matchingClient) {
              console.log(`Encontrou cliente correspondente ao email ${cleanEmail}, ID: ${matchingClient.id}`);
              userClientId = matchingClient.id;
              userCnpj = matchingClient.cnpj;
              
              // Também atualizar metadados no auth.users para consistência
              const { updateUserMetadata } = await import('@/lib/supabaseAdmin');
              await updateUserMetadata(cleanEmail, {
                ...data.user.user_metadata,
                clientId: userClientId,
                cnpj: userCnpj
              });
            }
          }
        }
        
        // Chamar função SQL de sincronização via RPC
        const { error: syncError } = await supabase.rpc('sync_user_profile', {
          user_id: data.user.id,
          user_email: cleanEmail,
          user_name: data.user.user_metadata?.name || cleanEmail,
          user_role: userRole,
          user_client_id: userClientId,
          user_cnpj: userCnpj
        });
        
        if (syncError) {
          console.warn('Erro ao sincronizar user_profile:', syncError);
          // Não impede o login, apenas registra o aviso
        } else {
          console.log(`✅ User_profile sincronizado com sucesso para ${cleanEmail}`);
          }
      } catch (syncErr) {
        console.error("Erro ao sincronizar user_profile:", syncErr);
          // Não impedimos o login por causa desse erro
      }
      
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error("Erro ao fazer login: " + (error.message || "Erro desconhecido"));
      setIsLoading(false);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Verificar se está tentando registrar um email de admin
      const cleanEmail = email.trim().toLowerCase();
      if (isAdminEmail(cleanEmail)) {
        toast.error("Este email já está registrado como administrador do sistema");
        setIsLoading(false);
        return false;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name,
            role: 'client' // Por padrão, usuários registrados são clientes
          }
        }
      });
      
      if (error) {
        console.error("Erro ao registrar:", error);
        
        // Verificar se o erro é relacionado a email já existente
        if (error.message.includes("User already registered") || 
            error.message.includes("already registered") || 
            error.message.includes("already exists") ||
            error.message.includes("already in use")) {
          
          toast.error("Este email já está cadastrado. Use a opção 'Esqueci minha senha' para redefinir seu acesso.");
        } else {
          toast.error("Erro ao criar conta: " + error.message);
        }
        
        setIsLoading(false);
        return false;
      }
      
      toast.success("Conta criada com sucesso! Verifique seu email para confirmar.");
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Register error:', error);
      
      // Mesmo no catch, verificar se o erro é relacionado a email duplicado
      if (error.message && (
          error.message.includes("User already registered") || 
          error.message.includes("already registered") || 
          error.message.includes("already exists") ||
          error.message.includes("already in use"))) {
        
        toast.error("Este email já está cadastrado. Use a opção 'Esqueci minha senha' para redefinir seu acesso.");
      } else {
        toast.error("Erro ao criar conta: " + (error.message || "Erro desconhecido"));
      }
      
      setIsLoading(false);
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // Removendo a restrição para emails de administradores
      // para permitir que todos os usuários possam redefinir senha
      
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        // Definir URL de redirecionamento para onde o usuário deve ser enviado após clicar no link
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        console.error("Erro ao redefinir senha:", error);
        
        // Se o usuário não for encontrado, sugerimos que ele se registre
        if (error.message.includes('user not found') || error.message.includes('no account')) {
          toast.error("Usuário não encontrado. Verifique o email ou crie uma nova conta.");
        } else {
          toast.error("Erro ao redefinir senha: " + error.message);
        }
        
        setIsLoading(false);
        return false;
      }
      
      toast.success("Email enviado com instruções para redefinir sua senha");
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error("Erro ao redefinir senha: " + (error.message || "Erro desconhecido"));
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Fazer logout local apenas (sem scope=global)
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Erro ao fazer logout:", error);
        // Continuar mesmo com erro para limpar estado local
      }
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      setCurrentUser(null);
      setIsAdmin(false);
      localStorage.removeItem('extfireUser');
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      isLoading, 
      isAdmin, 
      isClientBlocked,
      login, 
      logout, 
      register, 
      resetPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
