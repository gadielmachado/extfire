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
  refreshClientsFromSupabase: (showNotifications?: boolean) => Promise<boolean>;
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

  // Função para salvar clientes no localStorage (apenas como cache)
  const saveClientsToStorage = (clientsToSave: Client[]) => {
    try {
      localStorage.setItem('extfireClients', JSON.stringify(clientsToSave));
    } catch (error) {
      console.error("Erro ao salvar clientes no localStorage:", error);
    }
  };

  // Função para carregar clientes do Supabase - fonte primária de dados
  const loadClientsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*');

      if (error) {
        console.error("Erro ao carregar clientes do Supabase:", error);
        toast.error("Erro ao carregar dados. Tentando usar cache local.");
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
        saveClientsToStorage(processedClients); // Atualiza o cache local

        console.log("Clientes carregados do Supabase:", processedClients.length);
        return true;
      } else if (data && data.length === 0) {
        // Se não houver clientes no Supabase, inicialize com dados de exemplo
        if (isAdmin) {
          initializeWithExampleClients();
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error("Erro ao carregar clientes do Supabase:", error);
      toast.error("Erro ao conectar com o servidor. Usando dados do cache local.");
      return false;
    }
  };

  // Configurar assinatura em tempo real para atualizações na tabela 'clients'
  useEffect(() => {
    // Somente configura a assinatura se já estiver inicializado
    if (!initialized) return;
    
    const subscription = supabase
      .channel('public:clients')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'clients' 
      }, (payload) => {
        console.log("Mudança detectada na tabela clients:", payload);
        
        // Recarregar todos os clientes do Supabase
        loadClientsFromSupabase();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [initialized]);

  // Carregar clientes do Supabase ao inicializar o componente
  useEffect(() => {
    if (initialized) return;
    
    const initializeData = async () => {
      const supabaseLoaded = await loadClientsFromSupabase();
      
      // Se não conseguir carregar do Supabase, usa o localStorage como fallback
      if (!supabaseLoaded) {
        const storedClients = localStorage.getItem('extfireClients');
        
        if (storedClients) {
          try {
            const parsedClients = JSON.parse(storedClients);
            
            // Convert string dates back to Date objects
            const processedClients = parsedClients.map((client: any) => ({
              ...client,
              maintenanceDate: client.maintenanceDate ? new Date(client.maintenanceDate) : null,
              documents: client.documents || [], 
              isBlocked: client.isBlocked || false
            }));
            
            setClients(processedClients);
            
            // Já que carregamos do localStorage, vamos tentar sincronizar com o Supabase
            if (isAdmin) {
              syncClientsWithSupabase(processedClients);
            }
          } catch (error) {
            console.error("Erro ao analisar clientes do localStorage:", error);
            if (isAdmin) {
              // Initialize with example clients if parsing fails
              initializeWithExampleClients();
            }
          }
        } else if (isAdmin) {
          // Add default example clients if no clients exist
          initializeWithExampleClients();
        }
      }
      
      setInitialized(true);
    };
    
    initializeData();
  }, [isAdmin]);

  // Função para sincronizar clientes com o Supabase
  const syncClientsWithSupabase = async (clientsToSync: Client[]) => {
    try {
      // Apenas administradores podem sincronizar clientes
      if (!isAdmin) return;

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
          })) as any,
          { onConflict: 'id' }
        );

      if (error) {
        console.error("Erro ao sincronizar clientes com o Supabase:", error);
        toast.error("Erro ao salvar dados no servidor");
      } else {
        console.log("Clientes sincronizados com sucesso com o Supabase");
      }
    } catch (error) {
      console.error("Erro ao sincronizar clientes:", error);
      toast.error("Erro ao sincronizar dados com o servidor");
    }
  };

  const initializeWithExampleClients = async () => {
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
      await syncClientsWithSupabase(initialClients);
    }
  };

  // Update localStorage whenever clients change
  useEffect(() => {
    if (!initialized) return;
    
    // Salvar no localStorage como cache
    saveClientsToStorage(clients);
    
    // Verificar client atual
    if (currentClient) {
      // Se o cliente atual foi excluído
      if (!clients.some(c => c.id === currentClient.id)) {
        // Selecionar outro cliente
        if (clients.length > 0) {
          const activeClients = getActiveClients();
          setCurrentClient(activeClients.length > 0 ? activeClients[0] : clients[0]);
        } else {
          setCurrentClient(null);
        }
      } else {
        // Atualizar dados do cliente atual se ele foi modificado
        const updatedCurrentClient = clients.find(c => c.id === currentClient.id);
        if (updatedCurrentClient && JSON.stringify(updatedCurrentClient) !== JSON.stringify(currentClient)) {
          setCurrentClient(updatedCurrentClient);
        }
      }
    }
  }, [clients, initialized]);

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
    
    try {
      // Primeiro salvar no Supabase
      const { error } = await supabase
        .from('clients')
        .insert([{
          id: newClient.id,
          cnpj: newClient.cnpj,
          name: newClient.name,
          password: newClient.password,
          email: newClient.email,
          maintenance_date: newClient.maintenanceDate ? newClient.maintenanceDate.toISOString() : null,
          is_blocked: newClient.isBlocked,
          documents: newClient.documents,
          user_role: 'client',
          user_email: newClient.email
        }] as any);
      
      if (error) {
        console.error("Erro ao adicionar cliente no Supabase:", error);
        toast.error(`Erro ao adicionar cliente: ${error.message}`);
        return;
      }
      
      // Atualizar o estado local
      const updatedClients = [...clients, newClient];
      setClients(updatedClients);
      
      // Atualizar o localStorage como cache
      saveClientsToStorage(updatedClients);
      
      toast.success(`Cliente ${client.name} adicionado com sucesso!`);
      setCurrentClient(newClient);
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      toast.error("Erro ao adicionar cliente. Tente novamente.");
    }
  };

  const updateClient = async (updatedClient: Client) => {
    // Verificar permissão para atualizar este cliente
    if (!hasAccessToClient(updatedClient.id)) {
      console.error("Tentativa de atualizar um cliente sem permissão");
      toast.error("Você não tem permissão para atualizar este cliente");
      return;
    }
    
    try {
      // Primeiro atualizar no Supabase
      const { error } = await supabase
        .from('clients')
        .update({
          cnpj: updatedClient.cnpj,
          name: updatedClient.name,
          password: updatedClient.password,
          email: updatedClient.email,
          maintenance_date: updatedClient.maintenanceDate ? updatedClient.maintenanceDate.toISOString() : null,
          is_blocked: updatedClient.isBlocked,
          documents: updatedClient.documents,
          user_role: updatedClient.userRole || 'client',
          user_email: updatedClient.userEmail || updatedClient.email
        } as any)
        .eq('id', updatedClient.id);
      
      if (error) {
        console.error("Erro ao atualizar cliente no Supabase:", error);
        toast.error(`Erro ao atualizar cliente: ${error.message}`);
        return;
      }
      
      // Atualizar o estado local
      const newClients = clients.map(client => 
        client.id === updatedClient.id ? updatedClient : client
      );
      
      setClients(newClients);
      
      // Atualizar o localStorage como cache
      saveClientsToStorage(newClients);
      
      // Atualizar current client se necessário
      if (currentClient && currentClient.id === updatedClient.id) {
        setCurrentClient(updatedClient);
      }
      
      // Atualizar current client to edit se necessário
      if (currentClientToEdit && currentClientToEdit.id === updatedClient.id) {
        setCurrentClientToEdit(updatedClient);
      }
      
      toast.success(`Cliente ${updatedClient.name} atualizado com sucesso!`);
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      toast.error("Erro ao atualizar cliente. Tente novamente.");
    }
  };

  // Função para bloquear um cliente
  const blockClient = async (clientId: string) => {
    // Apenas admins podem bloquear clientes
    if (!isAdmin) {
      console.error("Tentativa de bloquear cliente sem permissões administrativas");
      toast.error("Você não tem permissão para bloquear clientes");
      return;
    }
    
    try {
      // Primeiro bloquear no Supabase
      const { error } = await supabase
        .from('clients')
        .update({ is_blocked: true } as any)
        .eq('id', clientId);
      
      if (error) {
        console.error("Erro ao bloquear cliente no Supabase:", error);
        toast.error(`Erro ao bloquear cliente: ${error.message}`);
        return;
      }
      
      // Atualizar o estado local
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
    } catch (error) {
      console.error("Erro ao bloquear cliente:", error);
      toast.error("Erro ao bloquear cliente. Tente novamente.");
    }
  };

  // Função para desbloquear um cliente
  const unblockClient = async (clientId: string) => {
    // Apenas admins podem desbloquear clientes
    if (!isAdmin) {
      console.error("Tentativa de desbloquear cliente sem permissões administrativas");
      toast.error("Você não tem permissão para desbloquear clientes");
      return;
    }
    
    try {
      // Primeiro desbloquear no Supabase
      const { error } = await supabase
        .from('clients')
        .update({ is_blocked: false } as any)
        .eq('id', clientId);
      
      if (error) {
        console.error("Erro ao desbloquear cliente no Supabase:", error);
        toast.error(`Erro ao desbloquear cliente: ${error.message}`);
        return;
      }
      
      // Atualizar o estado local
      const updatedClients = clients.map(client => {
        if (client.id === clientId) {
          return { ...client, isBlocked: false };
        }
        return client;
      });
      
      setClients(updatedClients);
      saveClientsToStorage(updatedClients);
      toast.success('Cliente desbloqueado com sucesso');
    } catch (error) {
      console.error("Erro ao desbloquear cliente:", error);
      toast.error("Erro ao desbloquear cliente. Tente novamente.");
    }
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
      
      // Importar de forma dinâmica para evitar problemas de SSR
      const { deleteClientWithAuth } = await import('@/lib/clientService');
      
      // Deletar as credenciais de autenticação se existirem
      if (clientToDelete.email) {
        const result = await deleteClientWithAuth(clientToDelete);
        if (!result) {
          console.warn('Não foi possível excluir completamente as credenciais, mas continuando a exclusão do cliente.');
        }
      }
      
      // Excluir do Supabase
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
        
      if (error) {
        console.error("Erro ao excluir cliente do Supabase:", error);
        toast.error(`Erro ao excluir cliente: ${error.message}`);
        return;
      }
      
      // Remover o cliente da lista local
      const updatedClients = clients.filter(c => c.id !== clientId);
      setClients(updatedClients);
      
      // Atualizar o localStorage
      saveClientsToStorage(updatedClients);
      
      toast.success(`Cliente ${clientToDelete.name} excluído com sucesso`);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente. Tente novamente mais tarde.');
    }
  };

  const addDocument = async (clientId: string, document: Document) => {
    // Verificar se o usuário atual tem permissão para adicionar documentos a este cliente
    if (!isAdmin && currentUser?.clientId && currentUser.clientId !== clientId) {
      console.error("Tentativa de adicionar documento a um cliente não associado ao usuário atual");
      toast.error("Você não tem permissão para adicionar documentos a este cliente");
      return;
    }
    
    try {
      // Encontrar o cliente atual
      const client = clients.find(c => c.id === clientId);
      if (!client) {
        console.error("Cliente não encontrado");
        toast.error("Cliente não encontrado");
        return;
      }
      
      // Adicionar documento ao cliente
      const updatedClient = {
        ...client,
        documents: [...client.documents, document]
      };
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('clients')
        .update({
          documents: updatedClient.documents
        } as any)
        .eq('id', clientId);
      
      if (error) {
        console.error("Erro ao adicionar documento no Supabase:", error);
        toast.error(`Erro ao adicionar documento: ${error.message}`);
        return;
      }
      
      // Atualizar o estado local
      const updatedClients = clients.map(c => 
        c.id === clientId ? updatedClient : c
      );
      
      setClients(updatedClients);
      saveClientsToStorage(updatedClients);
      
      // Atualizar current client se necessário
      if (currentClient && currentClient.id === clientId) {
        setCurrentClient(updatedClient);
      }
      
      toast.success(`Documento '${document.title}' adicionado com sucesso!`);
    } catch (error) {
      console.error("Erro ao adicionar documento:", error);
      toast.error("Erro ao adicionar documento. Tente novamente.");
    }
  };

  const removeDocument = async (clientId: string, documentId: string) => {
    // Verificar se o usuário atual tem permissão para remover documentos deste cliente
    if (!isAdmin && currentUser?.clientId && currentUser.clientId !== clientId) {
      console.error("Tentativa de remover documento de um cliente não associado ao usuário atual");
      toast.error("Você não tem permissão para remover documentos deste cliente");
      return;
    }
    
    try {
      // Encontrar o cliente atual
      const client = clients.find(c => c.id === clientId);
      if (!client) {
        console.error("Cliente não encontrado");
        toast.error("Cliente não encontrado");
        return;
      }
      
      // Remover documento do cliente
      const updatedClient = {
        ...client,
        documents: client.documents.filter(doc => doc.id !== documentId)
      };
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('clients')
        .update({
          documents: updatedClient.documents
        } as any)
        .eq('id', clientId);
      
      if (error) {
        console.error("Erro ao remover documento no Supabase:", error);
        toast.error(`Erro ao remover documento: ${error.message}`);
        return;
      }
      
      // Atualizar o estado local
      const updatedClients = clients.map(c => 
        c.id === clientId ? updatedClient : c
      );
      
      setClients(updatedClients);
      saveClientsToStorage(updatedClients);
      
      // Atualizar current client se necessário
      if (currentClient && currentClient.id === clientId) {
        setCurrentClient(updatedClient);
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
  const refreshClientsFromSupabase = async (showNotifications = true): Promise<boolean> => {
    const success = await loadClientsFromSupabase();
    if (success) {
      if (showNotifications) {
        toast.success("Dados sincronizados com sucesso");
      }
    } else {
      if (showNotifications) {
        toast.error("Não foi possível sincronizar os dados. Usando dados locais.");
      }
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
