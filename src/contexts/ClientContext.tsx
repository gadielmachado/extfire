import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client } from '@/types/client';
import { Document } from '@/types/document';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from './AuthContext';

interface ClientContextType {
  clients: Client[];
  currentClient: Client | null;
  currentClientToEdit: Client | null;
  editDialogOpen: boolean;
  setCurrentClient: (client: Client | null) => void;
  addClient: (client: Omit<Client, 'id' | 'documents' | 'isBlocked'>) => void;
  updateClient: (client: Client) => void;
  deleteClient: (clientId: string) => void;
  blockClient: (clientId: string) => void;
  unblockClient: (clientId: string) => void;
  setCurrentClientToEdit: (client: Client | null) => void;
  setEditDialogOpen: (open: boolean) => void;
  addDocument: (clientId: string, document: Document) => void;
  removeDocument: (clientId: string, documentId: string) => void;
  getActiveClients: () => Client[];
  hasAccessToClient: (clientId: string) => boolean;
  refreshClientsFromSupabase: () => Promise<boolean>;
}

const ClientContext = createContext<ClientContextType>({} as ClientContextType);

export const useClientContext = () => useContext(ClientContext);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentClientToEdit, setCurrentClientToEdit] = useState<Client | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { isAdmin, currentUser } = useAuthContext?.() || { isAdmin: false, currentUser: null };

  // Função para salvar clientes no localStorage
  const saveClientsToStorage = (clientsToSave: Client[]) => {
    try {
      localStorage.setItem('extfireClients', JSON.stringify(clientsToSave));
    } catch (error) {
      console.error("Erro ao salvar clientes no localStorage:", error);
    }
  };

  // Função para sincronizar clientes com o Supabase
  const syncClientsWithSupabase = async (clientsToSync: Client[]) => {
    try {
      console.log(`Iniciando sincronização de ${clientsToSync.length} clientes com o Supabase...`);
      
      // Usamos o supabase para salvar os clientes na tabela 'clients'
      const { error } = await supabase
        .from('clients')
        .upsert(
          clientsToSync.map(client => ({
            id: client.id,
            cnpj: client.cnpj,
            name: client.name,
            password: client.password,
            email: client.email,
            maintenance_date: client.maintenanceDate ? client.maintenanceDate.toISOString() : null,
            is_blocked: client.isBlocked,
            documents: client.documents,
            user_role: client.userRole || 'client',
            user_email: client.userEmail || client.email
          })),
          { onConflict: 'id' }
        );

      if (error) {
        console.error("Erro ao sincronizar clientes com o Supabase:", error);
        return false;
      } else {
        console.log("Clientes sincronizados com sucesso com o Supabase");
        
        // Também atualizar contas de autenticação para cada cliente com email
        const clientsWithEmail = clientsToSync.filter(client => client.email && client.email.trim() !== '');
        
        if (clientsWithEmail.length > 0) {
          console.log(`Atualizando credenciais de autenticação para ${clientsWithEmail.length} clientes...`);
          
          // Importar dinamicamente para evitar dependência circular
          const { signUpOrUpdateUser } = await import('@/lib/clientService');
          
          // Processar cada cliente sequencialmente
          for (const client of clientsWithEmail) {
            try {
              await signUpOrUpdateUser(
                client.email as string, 
                client.password || '123456', 
                {
                  name: client.name,
                  cnpj: client.cnpj,
                  clientId: client.id
                }
              );
            } catch (authError) {
              console.error(`Erro ao atualizar autenticação para cliente ${client.name}:`, authError);
            }
          }
          
          console.log(`Finalizada atualização de credenciais para ${clientsWithEmail.length} clientes.`);
        }
        
        return true;
      }
    } catch (error) {
      console.error("Erro ao sincronizar clientes:", error);
      return false;
    }
  };

  // Função para carregar clientes do Supabase
  const loadClientsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*');

      if (error) {
        console.error("Erro ao carregar clientes do Supabase:", error);
        // Se houver erro, usamos os dados do localStorage como fallback
        return false;
      }

      if (data && data.length > 0) {
        // Converter os dados para o formato Client
        const processedClients = data.map((client: any) => ({
          id: client.id,
          cnpj: client.cnpj,
          name: client.name,
          password: client.password,
          email: client.email,
          maintenanceDate: client.maintenance_date ? new Date(client.maintenance_date) : null,
          isBlocked: client.is_blocked,
          documents: client.documents || [],
          userRole: client.user_role || 'client',
          userEmail: client.user_email || client.email
        }));

        setClients(processedClients);
        saveClientsToStorage(processedClients); // Atualiza o localStorage com os dados do Supabase

        console.log("Clientes carregados do Supabase:", processedClients.length);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Erro ao carregar clientes do Supabase:", error);
      return false;
    }
  };

  // Load clients from localStorage on component mount - apenas uma vez
  useEffect(() => {
    if (initialized) return;
    
    const loadClients = async () => {
      // Primeiro tentar carregar do Supabase para garantir dados consistentes
      const supabaseLoaded = await loadClientsFromSupabase();
      
      // Se não conseguir carregar do Supabase, usa o localStorage
      if (!supabaseLoaded) {
        const storedClients = localStorage.getItem('extfireClients');
        
        if (storedClients) {
          try {
            const parsedClients = JSON.parse(storedClients);
            
            // Convert string dates back to Date objects
            const processedClients = parsedClients.map((client: any) => ({
              ...client,
              maintenanceDate: client.maintenanceDate ? new Date(client.maintenanceDate) : null,
              documents: client.documents || [], // Garantir que documents existe
              isBlocked: client.isBlocked || false // Garantir que isBlocked existe
            }));
            
            setClients(processedClients);
            
            // Já que carregamos do localStorage, vamos tentar sincronizar com o Supabase
            if (isAdmin) {
              syncClientsWithSupabase(processedClients);
            }
          } catch (error) {
            console.error("Error parsing clients from localStorage:", error);
            // Initialize with example clients if parsing fails
            initializeWithExampleClients();
          }
        } else {
          // Add default example clients if no clients exist
          initializeWithExampleClients();
        }
      }
      
      setInitialized(true);
    };
    
    loadClients();
  }, [isAdmin]); // Agora depende de isAdmin para garantir que possa sincronizar corretamente

  const initializeWithExampleClients = () => {
    const exampleClient: Client = {
      id: '1',
      cnpj: '43779205000120',
      name: 'Empresa Exemplo',
      password: 'senha123',
      email: 'gadielmachado.bm@gmail.com',
      maintenanceDate: new Date('2025-05-20'),
      isBlocked: false,
      documents: []
    };
    
    const exampleClient2: Client = {
      id: '2',
      cnpj: '61148052000716',
      name: 'COATS CORRENTE TINS',
      password: 'senha123',
      email: null,
      maintenanceDate: null,
      isBlocked: false,
      documents: []
    };
    
    const initialClients = [exampleClient, exampleClient2];
    setClients(initialClients);
    
    // Set the first active client as current
    if (initialClients.length > 0) {
      const activeClients = initialClients.filter(client => !client.isBlocked);
      if (activeClients.length > 0) {
        setCurrentClient(activeClients[0]);
      } else if (isAdmin) {
        setCurrentClient(initialClients[0]);
      }
    }
    
    // Salvar localmente e no Supabase
    saveClientsToStorage(initialClients);
    if (isAdmin) {
      syncClientsWithSupabase(initialClients);
    }
  };

  // Update localStorage and Supabase whenever clients change
  useEffect(() => {
    if (!initialized) return;
    
    // Salvar no localStorage
    saveClientsToStorage(clients);
    
    // Sincronizar com o Supabase para manter consistência entre dispositivos
    if (isAdmin) {
      syncClientsWithSupabase(clients);
    }
    
    // Verificar client atual
    if (currentClient) {
      // Se o cliente atual foi excluído
      if (!clients.some(c => c.id === currentClient.id)) {
        // Quando um cliente é excluído, sempre definir como null
        // para garantir que ele desapareça do dashboard
        setCurrentClient(null);
      } else {
        // Atualizar dados do cliente atual se ele foi modificado
        const updatedCurrentClient = clients.find(c => c.id === currentClient.id);
        if (updatedCurrentClient && JSON.stringify(updatedCurrentClient) !== JSON.stringify(currentClient)) {
          setCurrentClient(updatedCurrentClient);
        }
      }
    }
  }, [clients, initialized, isAdmin]); // Adicionado isAdmin como dependência

  // Função para obter apenas clientes ativos (não bloqueados)
  const getActiveClients = () => {
    return clients.filter(client => !client.isBlocked);
  };

  // Efeito para ajustar o cliente atual com base no status de bloqueio
  useEffect(() => {
    if (currentClient && currentClient.isBlocked && !isAdmin) {
      // Se o cliente atual estiver bloqueado e o usuário não for admin,
      // remover a seleção do cliente atual
      setCurrentClient(null);
    }
  }, [currentClient, isAdmin]);

  // Função para verificar se o usuário atual tem acesso a um cliente específico
  const hasAccessToClient = (clientId: string): boolean => {
    // Administradores têm acesso a todos os clientes
    if (isAdmin) return true;
    
    // Para usuários regulares, verificar se o cliente corresponde
    return currentUser?.clientId === clientId || 
           (currentUser?.email && clients.find(c => c.id === clientId)?.email === currentUser.email);
  };

  const addClient = async (client: Omit<Client, 'id' | 'documents' | 'isBlocked'>) => {
    const newClient: Client = {
      ...client,
      id: crypto.randomUUID(),
      documents: [],
      isBlocked: false, // Garantir que novos clientes nunca comecem bloqueados
    };
    
    // Apenas adiciona o cliente à lista local se não for através de webhook
    const updatedClients = [...clients, newClient];
    setClients(updatedClients);
    
    // Atualizar o localStorage
    saveClientsToStorage(updatedClients);
    
    // Criar/atualizar credenciais de autenticação se o cliente tiver email
    if (newClient.email && newClient.email.trim() !== '') {
      try {
        console.log(`Criando/atualizando credenciais para o cliente ${newClient.name} (${newClient.email})`);
        
        // Importar de forma dinâmica para evitar problemas de dependência circular
        const { signUpOrUpdateUser } = await import('@/lib/clientService');
        
        const result = await signUpOrUpdateUser(
          newClient.email, 
          newClient.password || '123456', // Usar senha do cliente ou valor padrão
          {
            name: newClient.name,
            cnpj: newClient.cnpj,
            clientId: newClient.id
          }
        );
        
        if (result.success) {
          console.log(`Credenciais para o cliente ${newClient.name} ${result.operation === 'created' ? 'criadas' : 'atualizadas'} com sucesso!`);
        } else {
          console.error(`Erro ao ${result.operation === 'created' ? 'criar' : 'atualizar'} credenciais para o cliente ${newClient.name}`);
        }
      } catch (authError) {
        console.error(`Erro ao gerenciar autenticação para o cliente ${newClient.name}:`, authError);
      }
    }
    
    // Sincronizar com o Supabase mesmo que não seja admin
    // Isso garante que todos os clientes existam na tabela clients
    try {
      await syncClientWithSupabase(newClient);
    } catch (syncError) {
      console.error(`Erro ao sincronizar o cliente ${newClient.name} com o Supabase:`, syncError);
    }
    
    toast.success(`Cliente ${client.name} adicionado com sucesso!`);
    setCurrentClient(newClient);
  };

  // Função para sincronizar um único cliente com o Supabase
  const syncClientWithSupabase = async (client: Client) => {
    try {
      console.log(`Sincronizando cliente ${client.name} (ID: ${client.id}) com o Supabase...`);
      
      const { error } = await supabase
        .from('clients')
        .upsert({
          id: client.id,
          cnpj: client.cnpj,
          name: client.name,
          password: client.password,
          email: client.email,
          maintenance_date: client.maintenanceDate ? client.maintenanceDate.toISOString() : null,
          is_blocked: client.isBlocked,
          documents: client.documents,
          user_role: client.userRole || 'client',
          user_email: client.userEmail || client.email
        }, { onConflict: 'id' });

      if (error) {
        console.error(`Erro ao sincronizar cliente ${client.name} com o Supabase:`, error);
        return false;
      } else {
        console.log(`Cliente ${client.name} sincronizado com sucesso com o Supabase`);
        return true;
      }
    } catch (error) {
      console.error(`Erro geral ao sincronizar cliente ${client.name}:`, error);
      return false;
    }
  };

  const updateClient = async (updatedClient: Client) => {
    // Verificar permissão para atualizar este cliente
    if (!hasAccessToClient(updatedClient.id)) {
      console.error("Tentativa de atualizar um cliente sem permissão");
      toast.error("Você não tem permissão para atualizar este cliente");
      return;
    }
    
    const newClients = clients.map(client => 
      client.id === updatedClient.id ? updatedClient : client
    );
    
    setClients(newClients);
    
    // Atualizar o localStorage
    saveClientsToStorage(newClients);
    
    // Sincronizar com o Supabase se for admin
    if (isAdmin) {
      await syncClientsWithSupabase(newClients);
    }
    
    // Atualizar current client se necessário
    if (currentClient && currentClient.id === updatedClient.id) {
      setCurrentClient(updatedClient);
    }
    
    // Atualizar current client to edit se necessário
    if (currentClientToEdit && currentClientToEdit.id === updatedClient.id) {
      setCurrentClientToEdit(updatedClient);
    }
    
    toast.success(`Cliente ${updatedClient.name} atualizado com sucesso!`);
  };

  // Função para bloquear um cliente
  const blockClient = (clientId: string) => {
    // Apenas admins podem bloquear clientes
    if (!isAdmin) {
      console.error("Tentativa de bloquear cliente sem permissões administrativas");
      toast.error("Você não tem permissão para bloquear clientes");
      return;
    }
    
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        return { ...client, isBlocked: true };
      }
      return client;
    });
    
    setClients(updatedClients);
    saveClientsToStorage(updatedClients);
    
    // Se o cliente bloqueado for o atual, selecionar outro se o usuário não for admin
    if (currentClient && currentClient.id === clientId && !isAdmin) {
      const activeClients = updatedClients.filter(c => !c.isBlocked);
      setCurrentClient(activeClients.length > 0 ? activeClients[0] : null);
    }
    
    toast.success('Cliente bloqueado com sucesso');
  };

  // Função para desbloquear um cliente
  const unblockClient = (clientId: string) => {
    // Apenas admins podem desbloquear clientes
    if (!isAdmin) {
      console.error("Tentativa de desbloquear cliente sem permissões administrativas");
      toast.error("Você não tem permissão para desbloquear clientes");
      return;
    }
    
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        return { ...client, isBlocked: false };
      }
      return client;
    });
    
    setClients(updatedClients);
    saveClientsToStorage(updatedClients);
    toast.success('Cliente desbloqueado com sucesso');
  };

  // Função para "excluir" um cliente e suas credenciais de autenticação
  const deleteClient = async (clientId: string) => {
    // Apenas admins podem excluir clientes
    if (!isAdmin) {
      console.error("Tentativa de excluir cliente sem permissões administrativas");
      toast.error("Você não tem permissão para excluir clientes");
      return;
    }
    
    try {
      // Encontrar o cliente que será excluído
      const clientToDelete = clients.find(client => client.id === clientId);
      
      if (!clientToDelete) {
        console.error('Cliente não encontrado para exclusão');
        toast.error('Erro ao excluir cliente: Cliente não encontrado');
        return;
      }
      
      console.log(`Iniciando exclusão do cliente: ${clientToDelete.name} (ID: ${clientToDelete.id})`);
      
      // Verificar se tem email associado e registrar para debugging
      if (clientToDelete.email) {
        console.log(`O cliente a ser excluído possui email associado: ${clientToDelete.email}`);
      } else {
        console.log(`O cliente a ser excluído NÃO possui email associado.`);
      }
      
      // Verificar se o cliente sendo excluído é o cliente do usuário atual
      // Administradores nunca serão deslogados ao excluir clientes
      const isCurrentUserClient = currentUser && !isAdmin && 
         (currentUser.clientId === clientToDelete.id || 
          (currentUser.email && currentUser.email === clientToDelete.email));
      
      // Importar de forma dinâmica para evitar problemas de SSR
      const { deleteClientWithAuth } = await import('@/lib/clientService');
      
      // Deletar as credenciais de autenticação se existirem
      if (clientToDelete.email) {
        console.log(`Solicitando exclusão das credenciais para o email: ${clientToDelete.email}`);
        const result = await deleteClientWithAuth(clientToDelete);
        
        if (!result) {
          console.warn('Não foi possível excluir completamente as credenciais, mas continuando a exclusão do cliente.');
        } else {
          console.log(`Credenciais do cliente ${clientToDelete.name} excluídas com sucesso.`);
        }
      }
      
      // Também remover do Supabase se for admin
      if (isAdmin) {
        try {
          console.log(`Removendo cliente ${clientToDelete.id} da tabela clients no Supabase...`);
          const { error } = await supabase
            .from('clients')
            .delete()
            .match({ id: clientId });
            
          if (error) {
            console.error("Erro ao excluir cliente do Supabase:", error);
          } else {
            console.log(`Cliente ${clientToDelete.id} removido com sucesso da tabela clients.`);
          }
        } catch (err) {
          console.error("Erro ao excluir cliente do Supabase:", err);
        }
      }
      
      // Remover o cliente da lista local
      const updatedClients = clients.filter(c => c.id !== clientId);
      setClients(updatedClients);
      
      // Definir o cliente atual como null para garantir que desapareça do dashboard
      if (currentClient && currentClient.id === clientId) {
        setCurrentClient(null);
      }
      
      // Atualizar o localStorage
      saveClientsToStorage(updatedClients);
      
      // Se o usuário excluiu seu próprio cliente e NÃO é admin, deslogá-lo automaticamente
      if (isCurrentUserClient && !isAdmin) {
        console.log("Usuário excluiu seu próprio cliente. Realizando logout automático...");
        toast.info("Sua conta de cliente foi excluída. Você será redirecionado para a tela de login.");
        
        try {
          // Adicionar um pequeno delay para permitir que o toast seja exibido
          setTimeout(async () => {
            try {
              await supabase.auth.signOut();
              window.location.href = '/login'; // Forçar redirecionamento completo
            } catch (logoutErr) {
              console.error("Erro ao fazer logout após exclusão de cliente:", logoutErr);
              window.location.href = '/login'; // Redirecionamento forçado mesmo se o logout falhar
            }
          }, 2000);
        } catch (logoutErr) {
          console.error("Erro ao agendar logout após exclusão de cliente:", logoutErr);
        }
      } else {
        toast.success(`Cliente ${clientToDelete.name} excluído com sucesso`);
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente. Tente novamente mais tarde.');
    }
  };

  const addDocument = (clientId: string, document: Document) => {
    // Verificar se o usuário atual tem permissão para adicionar documentos a este cliente
    if (!isAdmin && currentUser?.clientId && currentUser.clientId !== clientId) {
      console.error("Tentativa de adicionar documento a um cliente não associado ao usuário atual");
      toast.error("Você não tem permissão para adicionar documentos a este cliente");
      return;
    }
    
    try {
      const updatedClients = clients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            documents: [...client.documents, document]
          };
        }
        return client;
      });
      
      setClients(updatedClients);
      saveClientsToStorage(updatedClients);
      
      // Atualizar current client se necessário
      if (currentClient && currentClient.id === clientId) {
        setCurrentClient({
          ...currentClient,
          documents: [...currentClient.documents, document]
        });
      }
      
      toast.success(`Documento '${document.title}' adicionado com sucesso!`);
    } catch (error) {
      console.error("Erro ao adicionar documento:", error);
      toast.error("Erro ao adicionar documento. Tente novamente.");
    }
  };

  const removeDocument = (clientId: string, documentId: string) => {
    // Verificar se o usuário atual tem permissão para remover documentos deste cliente
    if (!isAdmin && currentUser?.clientId && currentUser.clientId !== clientId) {
      console.error("Tentativa de remover documento de um cliente não associado ao usuário atual");
      toast.error("Você não tem permissão para remover documentos deste cliente");
      return;
    }
    
    try {
      const updatedClients = clients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            documents: client.documents.filter(doc => doc.id !== documentId)
          };
        }
        return client;
      });
      
      setClients(updatedClients);
      saveClientsToStorage(updatedClients);
      
      // Atualizar current client se necessário
      if (currentClient && currentClient.id === clientId) {
        setCurrentClient({
          ...currentClient,
          documents: currentClient.documents.filter(doc => doc.id !== documentId)
        });
      }
      
      toast.success("Documento removido com sucesso!");
    } catch (error) {
      console.error("Erro ao remover documento:", error);
      toast.error("Erro ao remover documento. Tente novamente.");
    }
  };

  // Função para definir o cliente atual, com verificação de permissão
  const setCurrentClientWithPermissionCheck = (client: Client | null) => {
    // Se estiver removendo a seleção ou é admin, permitir
    if (!client || isAdmin) {
      setCurrentClient(client);
      return;
    }
    
    // Verificar se o usuário tem acesso a este cliente
    if (hasAccessToClient(client.id)) {
      setCurrentClient(client);
    } else {
      console.error("Tentativa de selecionar cliente sem permissão");
      toast.error("Você não tem permissão para acessar este cliente");
    }
  };

  // Função para recarregar manualmente os clientes do Supabase
  const refreshClientsFromSupabase = async (): Promise<boolean> => {
    const success = await loadClientsFromSupabase();
    if (success) {
      toast.success("Dados sincronizados com sucesso");
    } else {
      toast.error("Não foi possível sincronizar os dados. Usando dados locais.");
    }
    return success;
  };

  return (
    <ClientContext.Provider 
      value={{ 
        clients, 
        currentClient, 
        currentClientToEdit,
        editDialogOpen,
        setCurrentClient: setCurrentClientWithPermissionCheck,
        addClient, 
        updateClient, 
        deleteClient,
        blockClient,
        unblockClient,
        setCurrentClientToEdit,
        setEditDialogOpen,
        addDocument,
        removeDocument,
        getActiveClients,
        hasAccessToClient,
        refreshClientsFromSupabase
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};
