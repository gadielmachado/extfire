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

  // Função auxiliar para buscar e sincronizar dados do user_profile
  const syncUserDataFromProfile = async (userId: string, userEmail: string) => {
    try {
      console.log(`🔍 Buscando user_profile para: ${userEmail}`);
      
      // Tentativa 1: Buscar do user_profile com retry limitado para não travar
      const maxRetries = 2; // Reduzido de 5 para 2 para não travar o login
      let attempt = 0;
      let profileData = null;
      
      while (attempt < maxRetries && !profileData) {
        attempt++;
        
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('client_id, role, name, cnpj')
            .eq('id', userId)
            .maybeSingle();
          
          if (!error && data) {
            console.log(`✅ User_profile encontrado:`, {
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
          
          if (error) {
            console.warn(`⚠️ Erro ao buscar user_profile:`, error.message);
          }
          
          // Aguardar apenas 300ms antes de tentar novamente (mais rápido)
          if (attempt < maxRetries && !profileData) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err: any) {
          console.warn(`⚠️ Exceção ao buscar user_profile:`, err.message);
          
          // Aguardar apenas 300ms antes de tentar novamente
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
      
      // Se encontrou no user_profile, retornar
      if (profileData) {
        return profileData;
      }
      
      // Tentativa 2: Se user_profile falhou após todas as tentativas, buscar direto da tabela clients
      console.log(`🔄 Buscando client_id direto da tabela clients para: ${userEmail}`);
      
      try {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, name, cnpj')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (!clientError && clientData) {
          console.log(`✅ Cliente encontrado na tabela clients:`, {
            clientId: clientData.id,
            name: clientData.name
          });
          
          return {
            clientId: clientData.id,
            role: 'client',
            name: clientData.name,
            cnpj: clientData.cnpj
          };
        }
        
        if (clientError) {
          console.warn('⚠️ Erro ao buscar da tabela clients:', clientError.message);
        }
      } catch (err: any) {
        console.warn('⚠️ Exceção ao buscar da tabela clients:', err.message);
      }
      
      // Se nada funcionou, retornar null
      console.warn(`⚠️ Não foi possível obter dados do perfil para ${userEmail} após ${maxRetries} tentativas`);
      return null;
    } catch (error: any) {
      console.error('❌ Erro crítico ao buscar dados do perfil:', error?.message || error);
      return null;
    }
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
      async (event, session) => {
        console.log('🔐 Auth state change:', event, 'Session user:', session?.user?.email);
        
        try {
          setSession(session);
          
          if (session?.user) {
            console.log('📝 Processando usuário do evento SIGNED_IN...');
            
            // Verificar se o usuário é admin baseado na lista de emails
            const userIsAdmin = isAdminEmail(session.user.email);
            setIsAdmin(userIsAdmin);
            
            // CRÍTICO: Definir currentUser IMEDIATAMENTE com dados básicos
            // para garantir que nunca fique undefined
            const basicUser: User = {
              id: session.user.id,
              cnpj: session.user.user_metadata?.cnpj || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
              email: session.user.email || '',
              role: userIsAdmin ? 'admin' : 'client',
              clientId: session.user.user_metadata?.clientId || null
            };
            
            console.log('🚀 Definindo currentUser básico imediatamente:', basicUser.email);
            setCurrentUser(basicUser);
            localStorage.setItem('extfireUser', JSON.stringify(basicUser));
            
            // Agora, tentar buscar dados adicionais do perfil em background (sem bloquear)
            console.log('🔍 Buscando dados adicionais do perfil para:', session.user.email);
            
            // Promise.race para garantir que não demore mais de 2 segundos
            Promise.race([
              (async () => {
                let profileData = null;
                
                try {
                  const { data, error } = await supabase
                    .from('user_profiles')
                    .select('client_id, role, name, cnpj')
                    .eq('id', session.user.id)
                    .maybeSingle();
                  
                  if (!error && data) {
                    console.log('✅ User_profile encontrado:', data);
                    profileData = {
                      clientId: data.client_id,
                      role: data.role,
                      name: data.name,
                      cnpj: data.cnpj
                    };
                  }
                } catch (err) {
                  console.warn('⚠️ Falha ao buscar user_profile', err);
                }
                
                // Se não conseguiu do user_profile, tentar da tabela clients
                if (!profileData?.clientId && !userIsAdmin) {
                  try {
                    const { data: clientData } = await supabase
                      .from('clients')
                      .select('id, name, cnpj')
                      .eq('email', session.user.email)
                      .maybeSingle();
                    
                    if (clientData) {
                      console.log('✅ Cliente encontrado:', clientData);
                      profileData = {
                        clientId: clientData.id,
                        role: 'client',
                        name: clientData.name,
                        cnpj: clientData.cnpj
                      };
                    }
                  } catch (err) {
                    console.warn('⚠️ Falha ao buscar client', err);
                  }
                }
                
                return profileData;
              })(),
              new Promise((resolve) => setTimeout(() => resolve(null), 2000)) // Timeout de 2s
            ]).then((profileData: any) => {
              // Atualizar currentUser com dados do perfil se encontrou
              if (profileData?.clientId) {
                const updatedUser: User = {
                  ...basicUser,
                  cnpj: profileData.cnpj || basicUser.cnpj,
                  name: profileData.name || basicUser.name,
                  clientId: profileData.clientId
                };
                
                console.log('✅ Atualizando currentUser com dados do perfil:', updatedUser.clientId);
                setCurrentUser(updatedUser);
                localStorage.setItem('extfireUser', JSON.stringify(updatedUser));
              } else {
                console.log('ℹ️ Usando dados básicos do usuário (sem perfil adicional)');
              }
            }).catch((err) => {
              console.warn('⚠️ Erro ao buscar dados adicionais:', err);
            });
          } else {
            console.log('❌ Sem sessão, limpando currentUser');
            setCurrentUser(null);
            setIsAdmin(false);
            localStorage.removeItem('extfireUser');
          }
        } catch (error) {
          console.error('❌ Erro no auth state change:', error);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 [getSession] Verificando sessão existente...', session?.user?.email);
      if (session?.user) {
        console.log('📝 [getSession] Processando usuário da sessão existente...');
        
        // Verificar se o usuário é admin baseado na lista de emails
        const userIsAdmin = isAdminEmail(session.user.email);
        setIsAdmin(userIsAdmin);
        
        // CRÍTICO: Definir currentUser IMEDIATAMENTE com dados básicos
        const basicUser: User = {
          id: session.user.id,
          cnpj: session.user.user_metadata?.cnpj || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          role: userIsAdmin ? 'admin' : 'client',
          clientId: session.user.user_metadata?.clientId || null
        };
        
        console.log('🚀 [getSession] Definindo currentUser básico:', basicUser.email);
        setCurrentUser(basicUser);
        localStorage.setItem('extfireUser', JSON.stringify(basicUser));
        
        console.log('✅ [getSession] CurrentUser básico definido!');
        
        // Buscar dados adicionais em background
        console.log('🔍 [getSession] Buscando dados adicionais do perfil...');
        
        Promise.race([
          (async () => {
            let profileData = null;
            
            try {
              const { data, error } = await supabase
                .from('user_profiles')
                .select('client_id, role, name, cnpj')
                .eq('id', session.user.id)
                .maybeSingle();
              
              if (!error && data) {
                console.log('✅ [getSession] User_profile encontrado:', data);
                profileData = {
                  clientId: data.client_id,
                  role: data.role,
                  name: data.name,
                  cnpj: data.cnpj
                };
              }
            } catch (err) {
              console.warn('⚠️ [getSession] Falha ao buscar user_profile', err);
            }
            
            if (!profileData?.clientId && !userIsAdmin) {
              try {
                const { data: clientData } = await supabase
                  .from('clients')
                  .select('id, name, cnpj')
                  .eq('email', session.user.email)
                  .maybeSingle();
                
                if (clientData) {
                  console.log('✅ [getSession] Cliente encontrado:', clientData);
                  profileData = {
                    clientId: clientData.id,
                    role: 'client',
                    name: clientData.name,
                    cnpj: clientData.cnpj
                  };
                }
              } catch (err) {
                console.warn('⚠️ [getSession] Falha ao buscar client', err);
              }
            }
            
            return profileData;
          })(),
          new Promise((resolve) => setTimeout(() => resolve(null), 2000))
        ]).then((profileData: any) => {
          if (profileData?.clientId) {
            const updatedUser: User = {
              ...basicUser,
              cnpj: profileData.cnpj || basicUser.cnpj,
              name: profileData.name || basicUser.name,
              clientId: profileData.clientId
            };
            
            console.log('✅ [getSession] Atualizando com dados do perfil:', updatedUser.clientId);
            setCurrentUser(updatedUser);
            localStorage.setItem('extfireUser', JSON.stringify(updatedUser));
          }
        }).catch((err) => {
          console.warn('⚠️ [getSession] Erro ao buscar dados adicionais:', err);
        });
      } else {
        console.log('ℹ️ [getSession] Nenhuma sessão existente encontrada');
      }
      setIsLoading(false);
      console.log('✅ [getSession] Finalizado, isLoading = false');
    }).catch((error) => {
      console.error('❌ [getSession] Erro ao verificar sessão:', error);
      setIsLoading(false);
      console.log('✅ [getSession] Finalizado com erro, isLoading = false');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // CRÍTICO: Garantir que isLoading seja sempre false após o carregamento inicial
  // Este effect é a rede de segurança final para evitar loops infinitos
  useEffect(() => {
    // Após 3 segundos do mount, se ainda estiver loading, forçar false
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ SAFETY: Forçando isLoading = false após timeout');
        setIsLoading(false);
      }
    }, 3000);

    return () => clearTimeout(safetyTimeout);
  }, []); // Executar apenas uma vez no mount

  // CRÍTICO: Após processar currentUser, garantir que isLoading seja false
  // IMPORTANTE: Só definir false quando currentUser estiver definido OU quando não houver sessão
  useEffect(() => {
    // Aguardar um pouco para dar tempo do onAuthStateChange processar
    const checkTimeout = setTimeout(() => {
      // Se não há sessão, o loading deve ser false (usuário não logado)
      if (session === null && isLoading) {
        console.log('✅ Sem sessão, definindo isLoading = false');
        setIsLoading(false);
        return;
      }
      
      // Se há sessão E currentUser já foi definido, pode definir loading como false
      if (session !== null && currentUser !== null && isLoading) {
        console.log('✅ Usuário processado, definindo isLoading = false');
        setIsLoading(false);
      }
    }, 100); // Aguardar 100ms para dar tempo do onAuthStateChange processar

    return () => clearTimeout(checkTimeout);
  }, [session, currentUser, isLoading]); // Executar quando mudar

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
        
        // CRÍTICO: Definir currentUser para o atalho "admin"
        if (data?.user) {
          const user: User = {
            id: data.user.id,
            cnpj: '',
            name: data.user.user_metadata?.name || 'Usuário Master',
            email: 'gadielmachado.bm@gmail.com',
            role: 'admin',
            clientId: null
          };
          
          setCurrentUser(user);
          localStorage.setItem('extfireUser', JSON.stringify(user));
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
        
        // CRÍTICO: Definir currentUser para o atalho "gadyel"
        if (data?.user) {
          const user: User = {
            id: data.user.id,
            cnpj: '',
            name: data.user.user_metadata?.name || 'Gadiel (Admin)',
            email: 'gadyel.bm@gmail.com',
            role: 'admin',
            clientId: null
          };
          
          setCurrentUser(user);
          localStorage.setItem('extfireUser', JSON.stringify(user));
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
            
            // CRÍTICO: Definir currentUser para o atalho "cristiano"
            if (data?.user) {
              const user: User = {
                id: data.user.id,
                cnpj: '',
                name: data.user.user_metadata?.name || 'Cristiano (Admin)',
                email: 'paoliellocristiano@gmail.com',
                role: 'admin',
                clientId: null
              };
              
              setCurrentUser(user);
              localStorage.setItem('extfireUser', JSON.stringify(user));
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
        
        // Se o login for bem-sucedido, definir usuário antes de retornar
        if (!adminError && adminData?.user) {
          console.log("Login admin bem-sucedido com a senha padrão");
          setIsAdmin(true);
          
          // CRÍTICO: Definir currentUser imediatamente para evitar undefined
          const user: User = {
            id: adminData.user.id,
            cnpj: adminData.user.user_metadata?.cnpj || '',
            name: adminData.user.user_metadata?.name || cleanEmail,
            email: cleanEmail,
            role: 'admin',
            clientId: null // Admins não têm clientId
          };
          
          setCurrentUser(user);
          localStorage.setItem('extfireUser', JSON.stringify(user));
          setIsLoading(false);
          
          // Aguardar um pouco para garantir que o estado foi atualizado
          await new Promise(resolve => setTimeout(resolve, 100));
          
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
          // Tentar buscar diretamente do banco de dados
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('id, cnpj')
            .eq('email', cleanEmail)
            .single();
          
          if (!clientError && clientData) {
            console.log(`✅ Cliente encontrado no banco: ${clientData.id}`);
            userClientId = clientData.id;
            userCnpj = clientData.cnpj;
          } else {
            // Fallback: Tentar obter a lista de clientes do localStorage
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
              }
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
        
        // NOVO: Buscar dados atualizados do user_profile após sincronização
        const profileData = await syncUserDataFromProfile(data.user.id, cleanEmail);
        
        if (profileData && profileData.clientId) {
          console.log(`✅ ClientId atualizado do user_profile: ${profileData.clientId}`);
          
          // Atualizar currentUser com dados do user_profile
          const updatedUser: User = {
            id: data.user.id,
            cnpj: profileData.cnpj || userCnpj || '',
            name: profileData.name || data.user.user_metadata?.name || cleanEmail,
            email: cleanEmail,
            role: userRole,
            clientId: profileData.clientId // Usar clientId do user_profile
          };
          
          setCurrentUser(updatedUser);
          localStorage.setItem('extfireUser', JSON.stringify(updatedUser));
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
    console.log('🚪 Iniciando logout...');
    setIsLoading(true); // Ativar loading durante logout
    
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
      // SEMPRE limpar estado local, mesmo se houver erro no signOut
      setCurrentUser(null);
      setIsAdmin(false);
      setSession(null);
      setIsLoading(false); // CRÍTICO: Desativar loading
      localStorage.removeItem('extfireUser');
      console.log('✅ Logout completo, redirecionando para login...');
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
