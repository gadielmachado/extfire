import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  addClient: (client: Omit<Client, 'id' | 'documents' | 'isBlocked'>) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  blockClient: (clientId: string) => Promise<void>;
  unblockClient: (clientId: string) => Promise<void>;
  setCurrentClientToEdit: (client: Client | null) => void;
  setEditDialogOpen: (open: boolean) => void;
  addDocument: (clientId: string, document: Document) => Promise<void>;
  removeDocument: (clientId: string, documentId: string) => Promise<void>;
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
  const previousUserIdRef = useRef<string | null>(null);
  const previousClientIdRef = useRef<string | null>(null);

  // Função para salvar clientes no localStorage
  const saveClientsToStorage = (clientsToSave: Client[]) => {
    try {
      localStorage.setItem('extfireClients', JSON.stringify(clientsToSave));
    } catch (error) {
      console.error("Erro ao salvar clientes no localStorage:", error);
    }
  };

  // Função para recarregar documentos de um cliente específico
  const reloadClientDocuments = async (clientId: string): Promise<boolean> => {
    try {
      console.log(`📄 Recarregando documentos do cliente ${clientId}...`);
      
      // Buscar documentos do Supabase
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId);
      
      if (documentsError) {
        console.error("Erro ao recarregar documentos:", documentsError);
        return false;
      }
      
      console.log(`✅ ${documentsData?.length || 0} documento(s) recarregado(s)`);
      
      // Mapear documentos para o formato correto
      const documentsFromSupabase = (documentsData || []).map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        fileUrl: doc.file_url,
        uploadDate: new Date(doc.upload_date)
      }));
      
      // Atualizar estado local
      const updatedClients = clients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            documents: documentsFromSupabase
          };
        }
        return client;
      });
      
      setClients(updatedClients);
      saveClientsToStorage(updatedClients);
      
      // Atualizar currentClient se for o mesmo
      if (currentClient && currentClient.id === clientId) {
        setCurrentClient({
          ...currentClient,
          documents: documentsFromSupabase
        });
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao recarregar documentos:", error);
      return false;
    }
  };

  // Função para sincronizar clientes com o Supabase
  const syncClientsWithSupabase = async (clientsToSync: Client[]) => {
    try {
      console.log(`Iniciando sincronização de ${clientsToSync.length} clientes com o Supabase...`);
      
      // Usamos o supabase para salvar os clientes na tabela 'clients'
      // Nota: documents, user_role e user_email não existem na tabela clients
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
            is_blocked: client.isBlocked
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
      console.log("Carregando clientes do Supabase (fonte primária de dados)...");
      
      // Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false }); // Ordenar por data de criação

      if (clientsError) {
        console.error("Erro ao carregar clientes do Supabase:", clientsError);
        // Se for erro de autenticação ou permissão, mostrar erro mais específico
        if (clientsError.code === 'PGRST301' || clientsError.message?.includes('permission')) {
          console.error("Erro de permissão ao acessar Supabase. Verifique as políticas RLS.");
        }
        return false;
      }

      // Sempre processar os dados, mesmo que a lista esteja vazia
      // Carregar documentos de todos os clientes
      // IMPORTANTE: Se houver clientes, carregar documentos apenas dos clientes existentes
      // para evitar problemas de RLS
      const clientIds = clientsData?.map(c => c.id) || [];
      
      let documentsData = null;
      let documentsError = null;
      
      if (clientIds.length > 0) {
        // Se for admin, carregar documentos de todos os clientes
        // Se for cliente, carregar apenas documentos do seu próprio cliente
        if (isAdmin) {
          console.log('🔍 [ADMIN] Buscando documentos de todos os clientes:', clientIds);
          // Admin pode ver todos os documentos
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .in('client_id', clientIds);
          
          documentsData = data;
          documentsError = error;
          console.log('📄 [ADMIN] Documentos retornados:', documentsData?.length || 0, documentsData);
          if (error) console.error('❌ [ADMIN] Erro ao buscar documentos:', error);
        } else if (currentUser?.clientId) {
          // Cliente só pode ver seus próprios documentos
          console.log('🔍 [CLIENTE] Buscando documentos do cliente:', {
            clientId: currentUser.clientId,
            email: currentUser.email,
            isAdmin: false
          });
          
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('client_id', currentUser.clientId);
          
          documentsData = data;
          documentsError = error;
          
          console.log('📄 [CLIENTE] Documentos retornados:', documentsData?.length || 0);
          console.log('📄 [CLIENTE] Detalhes dos documentos:', documentsData);
          if (error) {
            console.error('❌ [CLIENTE] Erro ao buscar documentos:', error);
            console.error('❌ [CLIENTE] Código do erro:', error.code);
            console.error('❌ [CLIENTE] Mensagem:', error.message);
            console.error('❌ [CLIENTE] Detalhes:', error.details);
          }
          
          // DIAGNÓSTICO ADICIONAL: Tentar buscar sem filtro para debug
          console.log('🔬 [DEBUG] Tentando buscar TODOS os documentos (para diagnóstico)...');
          const { data: allDocs, error: allDocsError } = await supabase
            .from('documents')
            .select('*');
          
          if (allDocsError) {
            console.error('❌ [DEBUG] Erro ao buscar todos os documentos:', allDocsError);
          } else {
            console.log('🔬 [DEBUG] Total de documentos no banco:', allDocs?.length || 0);
            console.log('🔬 [DEBUG] Documentos que pertencem a este cliente:', 
              allDocs?.filter(d => d.client_id === currentUser.clientId) || []
            );
            console.log('🔬 [DEBUG] TODOS os documentos:', allDocs);
          }
        } else if (currentUser?.email) {
          // Tentar encontrar cliente pelo email
          const clientByEmail = clientsData?.find(c => c.email?.toLowerCase() === currentUser.email.toLowerCase());
          console.log('🔍 [EMAIL] Buscando cliente por email:', currentUser.email, 'Encontrado:', clientByEmail?.id);
          
          if (clientByEmail) {
            const { data, error } = await supabase
              .from('documents')
              .select('*')
              .eq('client_id', clientByEmail.id);
            
            documentsData = data;
            documentsError = error;
            console.log('📄 [EMAIL] Documentos retornados:', documentsData?.length || 0, documentsData);
            if (error) console.error('❌ [EMAIL] Erro ao buscar documentos:', error);
          }
        }
      } else {
        // Se não houver clientes, tentar carregar todos (para debug - apenas admin)
        if (isAdmin) {
          console.log('🔍 [ADMIN SEM CLIENTES] Buscando todos os documentos...');
          const { data, error } = await supabase
            .from('documents')
            .select('*');
          
          documentsData = data;
          documentsError = error;
          console.log('📄 [ADMIN SEM CLIENTES] Documentos retornados:', documentsData?.length || 0);
          if (error) console.error('❌ [ADMIN SEM CLIENTES] Erro:', error);
        }
      }

      if (documentsError) {
        console.error("Erro ao carregar documentos do Supabase:", documentsError);
        console.error("Detalhes do erro de documentos:", {
          code: documentsError.code,
          message: documentsError.message,
          details: documentsError.details,
          hint: documentsError.hint
        });
      } else {
        console.log(`📄 Documentos carregados: ${documentsData?.length || 0}`);
        if (documentsData && documentsData.length > 0) {
          console.log("📄 IDs dos clientes com documentos:", [...new Set(documentsData.map(d => d.client_id))]);
        }
      }

      // Criar um mapa de documentos por client_id
      const documentsMap: Record<string, Document[]> = {};
      if (documentsData) {
        documentsData.forEach((doc: any) => {
          if (!documentsMap[doc.client_id]) {
            documentsMap[doc.client_id] = [];
          }
          documentsMap[doc.client_id].push({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            size: doc.size,
            fileUrl: doc.file_url,
            uploadDate: new Date(doc.upload_date)
          });
        });
      }

      // Converter os dados para o formato Client
      const processedClients = (clientsData || []).map((client: any) => ({
        id: client.id,
        cnpj: client.cnpj,
        name: client.name,
        password: client.password,
        email: client.email,
        maintenanceDate: client.maintenance_date ? new Date(client.maintenance_date) : null,
        isBlocked: client.is_blocked,
        documents: documentsMap[client.id] || [],
        userRole: client.user_role || 'client',
        userEmail: client.user_email || client.email
      }));

      // CRÍTICO: Sempre atualizar estado e localStorage com dados do Supabase
      // Isso garante que localStorage seja sobrescrito com dados atualizados
      setClients(processedClients);
      saveClientsToStorage(processedClients); // Atualiza o localStorage com os dados do Supabase

      console.log(`✅ ${processedClients.length} cliente(s) carregado(s) do Supabase`);
      console.log(`✅ ${documentsData?.length || 0} documento(s) carregado(s)`);
      
      // Log detalhado: mostrar quantos documentos cada cliente tem
      processedClients.forEach(client => {
        const docCount = client.documents.length;
        if (docCount > 0) {
          console.log(`  📄 Cliente "${client.name}" (${client.id}): ${docCount} documento(s)`);
        }
      });
      
      // Se havia dados no localStorage que não estão no Supabase, foram sobrescritos
      // Isso é intencional - Supabase é a fonte de verdade
      
      return true;
    } catch (error) {
      console.error("Erro ao carregar clientes do Supabase:", error);
      return false;
    }
  };

  // Recarregar dados quando o usuário mudar (login/logout) OU quando clientId mudar
  useEffect(() => {
    // Resetar initialized quando o usuário muda para forçar recarregamento
    // Usar refs para evitar loops infinitos
    const currentUserId = currentUser?.id || null;
    const currentClientId = currentUser?.clientId || null;
    
    // Criar uma chave única combinando userId e clientId
    const currentUserKey = `${currentUserId}-${currentClientId}`;
    const previousUserKey = `${previousUserIdRef.current}-${previousClientIdRef.current}`;
    
    if (previousUserKey !== currentUserKey) {
      console.log("🔄 Usuário ou clientId mudou, recarregando dados...", {
        anterior: { userId: previousUserIdRef.current, clientId: previousClientIdRef.current },
        atual: { userId: currentUserId, clientId: currentClientId }
      });
      previousUserIdRef.current = currentUserId;
      previousClientIdRef.current = currentClientId;
      setInitialized(false);
    }
  }, [currentUser?.id, currentUser?.clientId, isAdmin]);

  // Load clients from Supabase on component mount ou quando inicializado for resetado
  useEffect(() => {
    if (initialized) return;
    
    const loadClients = async () => {
      console.log("🔄 Iniciando carregamento de dados do Supabase (fonte primária)...");
      
      // SEMPRE tentar carregar do Supabase primeiro (fonte primária de verdade)
      const supabaseLoaded = await loadClientsFromSupabase();
      
      // Se não conseguir carregar do Supabase (offline ou erro), usa o localStorage apenas como fallback temporário
      if (!supabaseLoaded) {
        console.warn("⚠️ Não foi possível carregar do Supabase. Verificando cache local...");
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
            
            console.warn("⚠️ Usando dados do cache local (pode estar desatualizado). Tentando sincronizar...");
            setClients(processedClients);
            
            // Tentar sincronizar novamente em segundo plano várias vezes
            let retryCount = 0;
            const maxRetries = 3;
            const retryInterval = 3000; // 3 segundos
            
            const retrySync = async () => {
              retryCount++;
              console.log(`🔄 Tentativa ${retryCount}/${maxRetries} de sincronizar com Supabase...`);
              const success = await loadClientsFromSupabase();
              if (success) {
                console.log("✅ Sincronização bem-sucedida! Dados atualizados.");
              } else if (retryCount < maxRetries) {
                setTimeout(retrySync, retryInterval);
              } else {
                console.error("❌ Não foi possível sincronizar após várias tentativas.");
                toast.error("Não foi possível sincronizar com o servidor. Os dados podem estar desatualizados.");
              }
            };
            
            setTimeout(retrySync, retryInterval);
          } catch (error) {
            console.error("Erro ao parsear clientes do localStorage:", error);
            // Se não conseguir parsear, limpar localStorage corrompido
            localStorage.removeItem('extfireClients');
            // Initialize with example clients if parsing fails
            initializeWithExampleClients();
          }
        } else {
          console.log("ℹ️ Nenhum dado encontrado localmente. Inicializando com clientes de exemplo...");
          // Add default example clients if no clients exist
          initializeWithExampleClients();
        }
      } else {
        console.log("✅ Dados carregados com sucesso do Supabase!");
      }
      
      setInitialized(true);
    };
    
    loadClients();
  }, [isAdmin, initialized]); // Agora depende de isAdmin e initialized para recarregar quando necessário

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

  // Atualizar cache local e verificar cliente atual quando lista de clientes mudar
  useEffect(() => {
    if (!initialized) return;
    
    // Salvar no localStorage apenas como cache (não é mais a fonte primária)
    saveClientsToStorage(clients);
    
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
  }, [clients, initialized])

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
    
    // CRÍTICO: Sincronizar com Supabase PRIMEIRO antes de atualizar estado local
    // Isso garante que o cliente exista no banco antes de aparecer na interface
    let syncSuccess = false;
    try {
      syncSuccess = await syncClientWithSupabase(newClient);
      if (!syncSuccess) {
        console.error("Falha ao sincronizar cliente com Supabase. Não será adicionado localmente.");
        toast.error(`Erro ao adicionar cliente ${client.name}. Verifique sua conexão e tente novamente.`);
        return; // Não adiciona se não conseguir sincronizar
      }
    } catch (syncError) {
      console.error(`Erro ao sincronizar o cliente ${newClient.name} com o Supabase:`, syncError);
      toast.error(`Erro ao adicionar cliente ${client.name}. Verifique sua conexão e tente novamente.`);
      return; // Não adiciona se houver erro
    }
    
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
          
          // CRÍTICO: Atualizar user_profile com o novo client_id
          // Isso garante que se um cliente foi excluído e recriado, o user_profile seja atualizado
          try {
            console.log(`Atualizando user_profile para ${newClient.email} com novo client_id ${newClient.id}...`);
            
            // Buscar o user_id do auth.users
            const { data: userData, error: userError } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('email', newClient.email)
              .maybeSingle();
            
            if (userData) {
              // Atualizar user_profile existente
              const { error: updateError } = await supabase
                .from('user_profiles')
                .update({
                  client_id: newClient.id,
                  name: newClient.name,
                  cnpj: newClient.cnpj,
                  updated_at: new Date().toISOString()
                })
                .eq('email', newClient.email);
              
              if (updateError) {
                console.error(`Erro ao atualizar user_profile:`, updateError);
              } else {
                console.log(`✅ User_profile atualizado com novo client_id: ${newClient.id}`);
              }
            }
          } catch (profileError) {
            console.error(`Erro ao atualizar user_profile:`, profileError);
          }
        } else {
          console.error(`Erro ao ${result.operation === 'created' ? 'criar' : 'atualizar'} credenciais para o cliente ${newClient.name}`);
        }
      } catch (authError) {
        console.error(`Erro ao gerenciar autenticação para o cliente ${newClient.name}:`, authError);
        // Não bloqueia a adição do cliente se só a autenticação falhar
      }
    }
    
    // Só atualiza estado local e localStorage DEPOIS de sincronizar com sucesso
    const updatedClients = [...clients, newClient];
    setClients(updatedClients);
    saveClientsToStorage(updatedClients);
    
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
          is_blocked: client.isBlocked
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
    
    // CRÍTICO: Sincronizar com Supabase PRIMEIRO antes de atualizar estado local
    try {
      const syncSuccess = await syncClientWithSupabase(updatedClient);
      if (!syncSuccess) {
        console.error("Falha ao sincronizar cliente atualizado com Supabase.");
        toast.error(`Erro ao atualizar cliente ${updatedClient.name}. Verifique sua conexão e tente novamente.`);
        return; // Não atualiza se não conseguir sincronizar
      }
      
      // Se o cliente tiver email, atualizar user_profile também
      if (updatedClient.email && updatedClient.email.trim() !== '') {
        try {
          console.log(`Atualizando user_profile para ${updatedClient.email} após atualização do cliente...`);
          
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              client_id: updatedClient.id,
              name: updatedClient.name,
              cnpj: updatedClient.cnpj,
              updated_at: new Date().toISOString()
            })
            .eq('email', updatedClient.email);
          
          if (updateError) {
            console.warn(`Aviso ao atualizar user_profile:`, updateError);
          } else {
            console.log(`✅ User_profile atualizado para ${updatedClient.email}`);
          }
        } catch (profileError) {
          console.warn(`Aviso ao atualizar user_profile:`, profileError);
        }
      }
    } catch (syncError) {
      console.error(`Erro ao sincronizar cliente atualizado com o Supabase:`, syncError);
      toast.error(`Erro ao atualizar cliente ${updatedClient.name}. Verifique sua conexão e tente novamente.`);
      return; // Não atualiza se houver erro
    }
    
    // Só atualiza estado local e localStorage DEPOIS de sincronizar com sucesso
    const newClients = clients.map(client => 
      client.id === updatedClient.id ? updatedClient : client
    );
    
    setClients(newClients);
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
  };

  // Função para bloquear um cliente
  const blockClient = async (clientId: string) => {
    // Apenas admins podem bloquear clientes
    if (!isAdmin) {
      console.error("Tentativa de bloquear cliente sem permissões administrativas");
      toast.error("Você não tem permissão para bloquear clientes");
      return;
    }
    
    const clientToBlock = clients.find(client => client.id === clientId);
    if (!clientToBlock) {
      toast.error("Cliente não encontrado");
      return;
    }
    
    const updatedClient = { ...clientToBlock, isBlocked: true };
    
    // CRÍTICO: Sincronizar com Supabase PRIMEIRO antes de atualizar estado local
    try {
      const syncSuccess = await syncClientWithSupabase(updatedClient);
      if (!syncSuccess) {
        console.error("Falha ao sincronizar bloqueio do cliente com Supabase.");
        toast.error("Erro ao bloquear cliente. Verifique sua conexão e tente novamente.");
        return;
      }
    } catch (syncError) {
      console.error(`Erro ao sincronizar bloqueio do cliente com o Supabase:`, syncError);
      toast.error("Erro ao bloquear cliente. Verifique sua conexão e tente novamente.");
      return;
    }
    
    // Só atualiza estado local e localStorage DEPOIS de sincronizar com sucesso
    const updatedClients = clients.map(client => 
      client.id === clientId ? updatedClient : client
    );
    
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
  const unblockClient = async (clientId: string) => {
    // Apenas admins podem desbloquear clientes
    if (!isAdmin) {
      console.error("Tentativa de desbloquear cliente sem permissões administrativas");
      toast.error("Você não tem permissão para desbloquear clientes");
      return;
    }
    
    const clientToUnblock = clients.find(client => client.id === clientId);
    if (!clientToUnblock) {
      toast.error("Cliente não encontrado");
      return;
    }
    
    const updatedClient = { ...clientToUnblock, isBlocked: false };
    
    // CRÍTICO: Sincronizar com Supabase PRIMEIRO antes de atualizar estado local
    try {
      const syncSuccess = await syncClientWithSupabase(updatedClient);
      if (!syncSuccess) {
        console.error("Falha ao sincronizar desbloqueio do cliente com Supabase.");
        toast.error("Erro ao desbloquear cliente. Verifique sua conexão e tente novamente.");
        return;
      }
    } catch (syncError) {
      console.error(`Erro ao sincronizar desbloqueio do cliente com o Supabase:`, syncError);
      toast.error("Erro ao desbloquear cliente. Verifique sua conexão e tente novamente.");
      return;
    }
    
    // Só atualiza estado local e localStorage DEPOIS de sincronizar com sucesso
    const updatedClients = clients.map(client => 
      client.id === clientId ? updatedClient : client
    );
    
    setClients(updatedClients);
    saveClientsToStorage(updatedClients);
    toast.success('Cliente desbloqueado com sucesso');
  };

  // Função para "excluir" um cliente e suas credenciais de autenticação
  const deleteClient = async (clientId: string) => {
    // Validar clientId antes de prosseguir
    if (!clientId || clientId.trim() === '') {
      console.error('❌ ClientId inválido ou vazio:', clientId);
      toast.error('Erro: ID do cliente inválido');
      return;
    }
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId)) {
      console.error('❌ ClientId não é um UUID válido:', clientId);
      toast.error('Erro: Formato de ID inválido');
      return;
    }
    
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
      
      // Verificar se o cliente a ser excluído tem o mesmo email que o administrador atual
      // Se for o caso, NÃO deletamos as credenciais de autenticação
      const isAdminOwnEmail = isAdmin && currentUser?.email && 
                              clientToDelete.email === currentUser.email;
      
      // NOTA: Não é possível excluir credenciais de autenticação do frontend
      // por questões de segurança (requer SERVICE_ROLE_KEY).
      // As credenciais permanecerão no Supabase Auth, mas o cliente será
      // removido da tabela clients, o que é suficiente para o sistema.
      
      if (isAdminOwnEmail) {
        console.log(`O cliente a ser excluído tem o mesmo email do administrador atual. Preservando credenciais.`);
      } else if (clientToDelete.email) {
        console.log(`Cliente possui email associado: ${clientToDelete.email}`);
        console.log(`⚠️ Nota: As credenciais de autenticação não serão excluídas (requer backend).`);
        console.log(`O usuário não poderá mais acessar o sistema pois o cliente foi removido da tabela.`);
      }
      
      // Também remover do Supabase se for admin
      if (isAdmin) {
        try {
          console.log(`🔍 DEBUG - Removendo cliente:`, {
            clientId: clientId,
            clientToDeleteId: clientToDelete.id,
            tipoClientId: typeof clientId,
            valorClientId: clientId,
            clientIdLength: clientId?.length
          });
          
          console.log(`Removendo cliente ${clientToDelete.id} da tabela clients no Supabase...`);
          const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', clientId);
            
          if (error) {
            console.error("Erro ao excluir cliente do Supabase:", error);
            console.error("🔍 DEBUG - Detalhes do erro:", {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            });
          } else {
            console.log(`Cliente ${clientToDelete.id} removido com sucesso da tabela clients.`);
            
            // CRÍTICO: Limpar client_id do user_profile para evitar referências órfãs
            if (clientToDelete.email && !isAdminOwnEmail) {
              try {
                console.log(`Limpando client_id do user_profile para ${clientToDelete.email}...`);
                
                const { error: profileError } = await supabase
                  .from('user_profiles')
                  .update({
                    client_id: null,
                    updated_at: new Date().toISOString()
                  })
                  .eq('email', clientToDelete.email);
                
                if (profileError) {
                  console.warn(`Aviso ao limpar user_profile:`, profileError);
                } else {
                  console.log(`✅ Client_id removido do user_profile para ${clientToDelete.email}`);
                }
              } catch (profileError) {
                console.warn(`Aviso ao limpar user_profile:`, profileError);
              }
            }
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
        // Opcionalmente, selecionar outro cliente automaticamente se disponível
        // const activeClients = updatedClients.filter(c => !c.isBlocked);
        // if (activeClients.length > 0) setCurrentClient(activeClients[0]);
      }
      
      // Atualizar o localStorage
      saveClientsToStorage(updatedClients);
      
      // Exibir mensagem de sucesso
      toast.success(`Cliente ${clientToDelete.name} excluído com sucesso`);
      
      // Informar sobre as credenciais se houver email
      if (clientToDelete.email && !isAdminOwnEmail) {
        console.log(`ℹ️ As credenciais de ${clientToDelete.email} foram mantidas no sistema de autenticação.`);
        console.log(`ℹ️ O usuário não poderá mais acessar pois o cliente foi removido.`);
      }
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
    
    // Se for cliente e não tiver clientId, tentar obter pelo email
    let effectiveClientId = clientId;
    if (!isAdmin && !currentUser?.clientId && currentUser?.email) {
      const clientByEmail = clients.find(c => c.email?.toLowerCase() === currentUser.email.toLowerCase());
      if (clientByEmail) {
        effectiveClientId = clientByEmail.id;
        console.log(`📧 Cliente identificado pelo email: ${clientByEmail.name} (${effectiveClientId})`);
      } else {
        toast.error("Não foi possível identificar seu cliente. Entre em contato com o suporte.");
        return;
      }
    }
    
    try {
      console.log(`📤 Tentando adicionar documento para o cliente ${effectiveClientId}...`);
      console.log(`👤 Usuário atual:`, {
        isAdmin,
        clientId: currentUser?.clientId,
        email: currentUser?.email
      });
      
      // Primeiro, salvar o documento no Supabase
      const { data: insertedDoc, error: insertError } = await supabase
        .from('documents')
        .insert({
          id: document.id,
          client_id: effectiveClientId,
          name: document.name,
          type: document.type,
          size: document.size,
          file_url: document.fileUrl,
          upload_date: document.uploadDate.toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Erro ao salvar documento no Supabase:", insertError);
        console.error("Detalhes do erro:", {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        
        // Mostrar erro mais específico ao usuário
        let errorMessage = "Erro ao salvar documento no banco de dados";
        if (insertError.message) {
          errorMessage += `: ${insertError.message}`;
        }
        toast.error(errorMessage);
        return;
      }

      console.log("✅ Documento salvo no Supabase:", insertedDoc);

      // CRÍTICO: Forçar recarregamento COMPLETO do Supabase para garantir consistência
      console.log("🔄 Forçando recarregamento completo dos dados do Supabase...");
      
      // Recarregar os documentos do cliente
      const reloadSuccess = await reloadClientDocuments(effectiveClientId);
      
      if (!reloadSuccess) {
        console.warn("⚠️ Falha ao recarregar documentos, tentando reload completo...");
        await loadClientsFromSupabase();
      }
      
      toast.success(`Documento '${document.name}' adicionado com sucesso!`);
    } catch (error) {
      console.error("❌ Erro ao adicionar documento:", error);
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
      // Primeiro, encontrar o documento para obter a URL do arquivo
      const client = clients.find(c => c.id === clientId);
      const document = client?.documents.find(doc => doc.id === documentId);
      
      if (!document) {
        console.error("Documento não encontrado");
        toast.error("Documento não encontrado");
        return;
      }

      // Deletar o arquivo do Storage
      if (document.fileUrl) {
        const { deleteFileFromStorage } = await import('@/lib/utils');
        const deleted = await deleteFileFromStorage(document.fileUrl);
        if (!deleted) {
          console.warn("Não foi possível deletar o arquivo do storage, mas continuaremos com a remoção do registro");
        }
      }

      // Deletar o registro do documento no Supabase
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        console.error("Erro ao deletar documento do Supabase:", deleteError);
        toast.error("Erro ao remover documento do banco de dados");
        return;
      }

      console.log("Documento deletado do Supabase:", documentId);

      // CRÍTICO: Forçar recarregamento do Supabase para garantir consistência
      // Isso resolve o problema de documentos deletados que reaparecem ao atualizar
      console.log("🔄 Forçando recarregamento após exclusão...");
      
      const reloadSuccess = await reloadClientDocuments(clientId);
      
      if (!reloadSuccess) {
        console.warn("⚠️ Falha ao recarregar documentos, tentando reload completo...");
        await loadClientsFromSupabase();
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
