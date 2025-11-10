import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Client } from '@/types/client';
import { Document } from '@/types/document';
import { Folder } from '@/types/folder';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from './AuthContext';

interface ClientContextType {
  clients: Client[];
  currentClient: Client | null;
  currentClientToEdit: Client | null;
  editDialogOpen: boolean;
  folders: Folder[];
  currentFolderId: string | null;
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
  setCurrentFolderId: (folderId: string | null) => void;
  createFolder: (clientId: string, folderName: string, parentFolderId?: string | null) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  deleteFolder: (folderId: string, deleteContents: boolean) => Promise<void>;
  getFolderContents: (clientId: string, folderId: string | null) => { folders: Folder[], documents: Document[] };
  moveFolderOrDocument: (itemId: string, targetFolderId: string | null, isFolder: boolean) => Promise<void>;
  getFolderPath: (folderId: string | null) => Folder[];
}

const ClientContext = createContext<ClientContextType>({} as ClientContextType);

export const useClientContext = () => useContext(ClientContext);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentClientToEdit, setCurrentClientToEdit] = useState<Client | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const isLoadingClientsRef = useRef(false); // Flag para evitar carregamentos simultâneos
  const { isAdmin, currentUser, isLoading: authLoading } = useAuthContext?.() || { isAdmin: false, currentUser: null, isLoading: true };
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
        uploadDate: new Date(doc.upload_date),
        folderId: doc.folder_id
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

  // Função para carregar pastas de um cliente específico
  const loadFoldersFromSupabase = async (clientId?: string): Promise<Folder[]> => {
    try {
      console.log(`📁 Carregando pastas${clientId ? ` do cliente ${clientId}` : ''}...`);
      
      let query = supabase.from('folders').select('*');
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      } else if (!isAdmin && currentUser?.clientId) {
        // Se não for admin, carregar apenas pastas do seu cliente
        query = query.eq('client_id', currentUser.clientId);
      }
      
      const { data: foldersData, error: foldersError } = await query;
      
      if (foldersError) {
        console.error("Erro ao carregar pastas do Supabase:", foldersError);
        return [];
      }
      
      console.log(`✅ ${foldersData?.length || 0} pasta(s) carregada(s)`);
      
      // Mapear pastas para o formato correto
      const foldersFromSupabase = (foldersData || []).map((folder: any) => ({
        id: folder.id,
        clientId: folder.client_id,
        name: folder.name,
        parentFolderId: folder.parent_folder_id,
        createdAt: new Date(folder.created_at),
        updatedAt: new Date(folder.updated_at)
      }));
      
      return foldersFromSupabase;
    } catch (error) {
      console.error("Erro ao carregar pastas:", error);
      return [];
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
  const loadClientsFromSupabase = async (user = currentUser) => {
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
        } else if (user?.clientId) {
          // Cliente só pode ver seus próprios documentos
          console.log('🔍 [CLIENTE] Buscando documentos do cliente:', {
            clientId: user.clientId,
            email: user.email,
            isAdmin: false
          });
          
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('client_id', user.clientId);
          
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
              allDocs?.filter(d => d.client_id === user.clientId) || []
            );
            console.log('🔬 [DEBUG] TODOS os documentos:', allDocs);
          }
        } else if (user?.email) {
          // Tentar encontrar cliente pelo email
          const clientByEmail = clientsData?.find(c => c.email?.toLowerCase() === user.email.toLowerCase());
          console.log('🔍 [EMAIL] Buscando cliente por email:', user.email, 'Encontrado:', clientByEmail?.id);
          
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
            uploadDate: new Date(doc.upload_date),
            folderId: doc.folder_id
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

      // Carregar pastas também
      const loadedFolders = await loadFoldersFromSupabase();
      setFolders(loadedFolders);
      
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

  // Recarregar dados quando o usuário mudar (login/logout) OU quando clientId mudar SIGNIFICATIVAMENTE
  useEffect(() => {
    // Resetar initialized quando o usuário muda para forçar recarregamento
    // Usar refs para evitar loops infinitos
    const currentUserId = currentUser?.id || null;
    const currentClientId = currentUser?.clientId || null;
    
    // Criar uma chave única combinando userId e clientId
    const currentUserKey = `${currentUserId}-${currentClientId}`;
    const previousUserKey = `${previousUserIdRef.current}-${previousClientIdRef.current}`;
    
    // Verificar se é uma mudança significativa que requer recarregamento
    const isSignificantChange = previousUserKey !== currentUserKey && (
      // Mudança de userId (login/logout)
      previousUserIdRef.current !== currentUserId ||
      // Mudança de um clientId VÁLIDO para outro VÁLIDO diferente (não null -> válido)
      (previousClientIdRef.current && currentClientId && previousClientIdRef.current !== currentClientId)
    );
    
    if (isSignificantChange) {
      console.log("🔄 Mudança significativa detectada, recarregando dados...", {
        anterior: { userId: previousUserIdRef.current, clientId: previousClientIdRef.current },
        atual: { userId: currentUserId, clientId: currentClientId }
      });
      setInitialized(false);
      isLoadingClientsRef.current = false; // Liberar flag para permitir recarregamento
    } else if (previousUserKey !== currentUserKey) {
      console.log("ℹ️ ClientId atualizado (null -> válido), mantendo dados carregados:", {
        anterior: { userId: previousUserIdRef.current, clientId: previousClientIdRef.current },
        atual: { userId: currentUserId, clientId: currentClientId }
      });
    }
    
    // SEMPRE atualizar as refs para rastrear o estado atual
    previousUserIdRef.current = currentUserId;
    previousClientIdRef.current = currentClientId;
  }, [currentUser, isAdmin]);

  // Load clients from Supabase on component mount ou quando inicializado for resetado
  useEffect(() => {
    console.log("🔄 ClientContext useEffect disparado:", {
      initialized,
      authLoading,
      isAdmin,
      currentUserId: currentUser?.id,
      currentUserEmail: currentUser?.email,
      currentUserClientId: currentUser?.clientId,
      isLoadingClients: isLoadingClientsRef.current
    });
    
    // CRÍTICO: NÃO carregar enquanto Auth ainda está carregando
    // Isso previne race condition onde documentos são buscados com clientId errado
    if (initialized) {
      console.log("⏭️ Já inicializado, ignorando");
      return;
    }
    
    if (authLoading) {
      console.log("⏳ Aguardando AuthContext terminar de carregar...");
      return;
    }
    
    // Evitar múltiplas execuções simultâneas
    if (isLoadingClientsRef.current) {
      console.log("⏳ Já está carregando clientes, aguardando...");
      return;
    }
    
    console.log("✅ AuthContext pronto, iniciando carregamento...");
    
    // Marcar como carregando para evitar múltiplas execuções simultâneas
    isLoadingClientsRef.current = true;
    
    // Carregar dados imediatamente após AuthContext estar pronto
    const loadClients = async () => {
      console.log("🔄 Iniciando carregamento de dados do Supabase (fonte primária)...");
      console.log("👤 Usuário atual:", currentUser?.email, "clientId:", currentUser?.clientId);
      
      // SEMPRE tentar carregar do Supabase primeiro (fonte primária de verdade)
      const supabaseLoaded = await loadClientsFromSupabase(currentUser);
      
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
            const maxRetries = 5; // Aumentado para 5 tentativas
            const retryInterval = 2000; // Reduzido para 2 segundos
            
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
      
      // CRÍTICO: Marcar como inicializado APÓS carregar os dados
      setInitialized(true);
      isLoadingClientsRef.current = false;
      console.log("✅ ClientContext inicializado com sucesso");
    };
    
    loadClients();
  }, [isAdmin, initialized, authLoading, currentUser]); // CRÍTICO: Agora também depende de authLoading

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
      // Passar o cliente dentro de um array para o syncClientsWithSupabase
      syncSuccess = await syncClientsWithSupabase([newClient]);
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
          
          // CRÍTICO: Aguardar e GARANTIR que user_profile seja criado/atualizado
          // Retry logic para esperar o trigger criar o user_profile
          try {
            console.log(`⏳ Aguardando user_profile ser criado para ${newClient.email}...`);
            
            let attempts = 0;
            const maxAttempts = 5;
            let profileUpdated = false;
            
            while (attempts < maxAttempts && !profileUpdated) {
              attempts++;
              
              // Aguardar um pouco antes de tentar (mais tempo na primeira tentativa)
              await new Promise(resolve => setTimeout(resolve, attempts === 1 ? 1500 : 500));
              
              console.log(`Tentativa ${attempts}/${maxAttempts} de atualizar user_profile...`);
              
              // Buscar user_profile
              const { data: userData, error: userError } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('email', newClient.email)
                .maybeSingle();
              
              if (userData) {
                // Atualizar user_profile
                const { error: updateError } = await supabase
                  .from('user_profiles')
                  .update({
                    client_id: newClient.id,
                    name: newClient.name,
                    cnpj: newClient.cnpj,
                    updated_at: new Date().toISOString()
                  })
                  .eq('email', newClient.email);
                
                if (!updateError) {
                  console.log(`✅ User_profile atualizado com client_id: ${newClient.id}`);
                  profileUpdated = true;
                } else {
                  console.warn(`Tentativa ${attempts} falhou:`, updateError);
                }
              } else {
                console.log(`User_profile ainda não existe, aguardando trigger...`);
              }
            }
            
            if (!profileUpdated) {
              console.warn(`⚠️ Não foi possível atualizar user_profile após ${maxAttempts} tentativas`);
            }
          } catch (profileError) {
            console.error(`Erro ao atualizar user_profile:`, profileError);
          }
        } else {
          console.error(`Erro ao ${result.operation === 'created' ? 'criar' : 'atualizar'} credenciais para o cliente ${newClient.name}`);
          // Se a criação do usuário falhar (ex: email já existe), mostrar erro específico
          if (result.error) {
            toast.error(`Erro ao criar usuário: ${result.error.message}`);
          }
        }
      } catch (authError) {
        console.error(`Erro ao gerenciar autenticação para o cliente ${newClient.name}:`, authError);
        // Não bloqueia a adição do cliente se só a autenticação falhar
        toast.error(`Erro inesperado ao criar usuário. Tente novamente.`);
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
    // Apenas admins podem excluir clientes
    if (!isAdmin) {
      console.error("Tentativa de excluir cliente sem permissões administrativas");
      toast.error("Você não tem permissão para excluir clientes");
      return;
    }
    
    // Encontrar o cliente que será excluído
    const clientToDelete = clients.find(client => client.id === clientId);
    
    if (!clientToDelete) {
      console.error('Cliente não encontrado para exclusão');
      toast.error('Erro ao excluir cliente: Cliente não encontrado');
      return;
    }
    
    console.log(`Iniciando exclusão do cliente: ${clientToDelete.name} (ID: ${clientToDelete.id})`);
    
    // NOTA: A exclusão do usuário de autenticação (auth.users) deve ser feita
    // através de uma função de borda (Edge Function) por razões de segurança,
    // pois requer a service_role_key.
    // O código abaixo assume que a exclusão na tabela 'clients' é suficiente
    // para remover o acesso do cliente ao sistema.
    
    try {
      // Remover da tabela 'clients' no Supabase
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        console.error("Erro ao excluir cliente do Supabase:", error);
        toast.error(`Erro ao excluir cliente ${clientToDelete.name} do banco de dados.`);
        return;
      }

      console.log(`Cliente ${clientToDelete.id} removido com sucesso da tabela clients.`);

      // Limpar o client_id do user_profile para evitar referências órfãs
      if (clientToDelete.email) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ client_id: null, updated_at: new Date().toISOString() })
          .eq('client_id', clientId);
          
        if (profileError) {
          console.warn(`Aviso ao limpar user_profile:`, profileError);
        } else {
          console.log(`✅ Client_id removido do user_profile para ${clientToDelete.email}`);
        }
      }

      // Remover o cliente da lista local
      const updatedClients = clients.filter(c => c.id !== clientId);
      setClients(updatedClients);
      saveClientsToStorage(updatedClients);

      // Limpar cliente atual se ele foi o excluído
      if (currentClient && currentClient.id === clientId) {
        setCurrentClient(null);
      }

      toast.success(`Cliente ${clientToDelete.name} excluído com sucesso`);
      
    } catch (err) {
      console.error("Erro durante o processo de exclusão do cliente:", err);
      toast.error('Ocorreu um erro inesperado ao excluir o cliente.');
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
          upload_date: document.uploadDate.toISOString(),
          folder_id: document.folderId // Correção: usar 'folder_id' com underscore
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

      // CORREÇÃO: Atualizar o estado localmente em vez de recarregar tudo
      // Isso evita race conditions e garante que o folderId correto seja exibido
      const newDocumentFromDB: Document = {
        id: insertedDoc.id,
        name: insertedDoc.name,
        type: insertedDoc.type,
        size: insertedDoc.size,
        fileUrl: insertedDoc.file_url,
        uploadDate: new Date(insertedDoc.upload_date),
        folderId: insertedDoc.folder_id
      };

      setClients(prevClients => {
        const updatedClients = prevClients.map(client => {
          if (client.id === effectiveClientId) {
            // Adicionar o novo documento à lista do cliente
            return {
              ...client,
              documents: [...client.documents, newDocumentFromDB]
            };
          }
          return client;
        });
        // Salvar no cache local também
        saveClientsToStorage(updatedClients);
        return updatedClients;
      });

      // Atualizar o cliente atual se for o mesmo que foi modificado
      if (currentClient && currentClient.id === effectiveClientId) {
        setCurrentClient(prev => prev ? ({ 
          ...prev, 
          documents: [...prev.documents, newDocumentFromDB] 
        }) : null);
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

  // ====================================================
  // FUNÇÕES DE GERENCIAMENTO DE PASTAS
  // ====================================================

  // Função para criar uma nova pasta
  const createFolder = async (clientId: string, folderName: string, parentFolderId?: string | null) => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem criar pastas");
      return;
    }

    // Validar nome da pasta
    if (!folderName || folderName.trim() === '') {
      toast.error("Nome da pasta não pode ser vazio");
      return;
    }

    // Verificar nomes duplicados no mesmo nível
    const existingFolder = folders.find(f => 
      f.clientId === clientId && 
      f.parentFolderId === (parentFolderId || null) && 
      f.name.toLowerCase() === folderName.trim().toLowerCase()
    );

    if (existingFolder) {
      toast.error("Já existe uma pasta com este nome neste local");
      return;
    }

    try {
      const newFolder = {
        id: crypto.randomUUID(),
        client_id: clientId,
        name: folderName.trim(),
        parent_folder_id: parentFolderId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('folders')
        .insert(newFolder)
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar pasta:", error);
        
        // Verificar se é erro de profundidade
        if (error.message && error.message.includes('Profundidade máxima')) {
          toast.error("Profundidade máxima de pastas atingida (máximo: 5 níveis)");
        } else {
          toast.error("Erro ao criar pasta");
        }
        return;
      }

      // Atualizar estado local
      const folderMapped: Folder = {
        id: data.id,
        clientId: data.client_id,
        name: data.name,
        parentFolderId: data.parent_folder_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      setFolders([...folders, folderMapped]);
      toast.success(`Pasta "${folderName}" criada com sucesso`);
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
      toast.error("Erro ao criar pasta");
    }
  };

  // Função para renomear uma pasta
  const renameFolder = async (folderId: string, newName: string) => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem renomear pastas");
      return;
    }

    if (!newName || newName.trim() === '') {
      toast.error("Nome da pasta não pode ser vazio");
      return;
    }

    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      toast.error("Pasta não encontrada");
      return;
    }

    // Verificar nomes duplicados no mesmo nível
    const existingFolder = folders.find(f => 
      f.id !== folderId &&
      f.clientId === folder.clientId && 
      f.parentFolderId === folder.parentFolderId && 
      f.name.toLowerCase() === newName.trim().toLowerCase()
    );

    if (existingFolder) {
      toast.error("Já existe uma pasta com este nome neste local");
      return;
    }

    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: newName.trim(), updated_at: new Date().toISOString() })
        .eq('id', folderId);

      if (error) {
        console.error("Erro ao renomear pasta:", error);
        toast.error("Erro ao renomear pasta");
        return;
      }

      // Atualizar estado local
      setFolders(folders.map(f => 
        f.id === folderId ? { ...f, name: newName.trim(), updatedAt: new Date() } : f
      ));

      toast.success("Pasta renomeada com sucesso");
    } catch (error) {
      console.error("Erro ao renomear pasta:", error);
      toast.error("Erro ao renomear pasta");
    }
  };

  // Função para deletar uma pasta
  const deleteFolder = async (folderId: string, deleteContents: boolean) => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem deletar pastas");
      return;
    }

    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      toast.error("Pasta não encontrada");
      return;
    }

    try {
      if (deleteContents) {
        // Deletar tudo em cascata (o banco já faz isso via ON DELETE CASCADE)
        const { error } = await supabase
          .from('folders')
          .delete()
          .eq('id', folderId);

        if (error) {
          console.error("Erro ao deletar pasta:", error);
          toast.error("Erro ao deletar pasta");
          return;
        }

        // Atualizar estado local: remover pasta e suas subpastas
        const foldersToRemove = new Set<string>();
        const findDescendants = (parentId: string) => {
          foldersToRemove.add(parentId);
          folders.filter(f => f.parentFolderId === parentId).forEach(f => findDescendants(f.id));
        };
        findDescendants(folderId);

        setFolders(folders.filter(f => !foldersToRemove.has(f.id)));

        // Remover documentos da pasta deletada
        const client = clients.find(c => c.id === folder.clientId);
        if (client) {
          const updatedDocuments = client.documents.filter(d => d.folderId !== folderId);
          const updatedClient = { ...client, documents: updatedDocuments };
          setClients(clients.map(c => c.id === client.id ? updatedClient : c));
        }

        toast.success("Pasta e conteúdo deletados com sucesso");
      } else {
        // Mover conteúdo para a raiz antes de deletar
        // 1. Mover subpastas para o pai da pasta deletada
        const { error: moveFoldersError } = await supabase
          .from('folders')
          .update({ parent_folder_id: folder.parentFolderId })
          .eq('parent_folder_id', folderId);

        if (moveFoldersError) {
          console.error("Erro ao mover subpastas:", moveFoldersError);
          toast.error("Erro ao mover subpastas");
          return;
        }

        // 2. Mover documentos para a raiz
        const { error: moveDocsError } = await supabase
          .from('documents')
          .update({ folder_id: folder.parentFolderId })
          .eq('folder_id', folderId);

        if (moveDocsError) {
          console.error("Erro ao mover documentos:", moveDocsError);
          toast.error("Erro ao mover documentos");
          return;
        }

        // 3. Deletar a pasta vazia
        const { error: deleteFolderError } = await supabase
          .from('folders')
          .delete()
          .eq('id', folderId);

        if (deleteFolderError) {
          console.error("Erro ao deletar pasta:", deleteFolderError);
          toast.error("Erro ao deletar pasta");
          return;
        }

        // Atualizar estado local
        setFolders(folders.filter(f => f.id !== folderId).map(f => 
          f.parentFolderId === folderId ? { ...f, parentFolderId: folder.parentFolderId } : f
        ));

        // Recarregar documentos do cliente
        await reloadClientDocuments(folder.clientId);

        toast.success("Pasta deletada e conteúdo movido para a raiz");
      }

      // Se a pasta atual foi deletada, voltar para a raiz
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
    } catch (error) {
      console.error("Erro ao deletar pasta:", error);
      toast.error("Erro ao deletar pasta");
    }
  };

  // Função para obter conteúdo de uma pasta (subpastas e documentos)
  const getFolderContents = (clientId: string, folderId: string | null): { folders: Folder[], documents: Document[] } => {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      return { folders: [], documents: [] };
    }

    // Filtrar pastas do nível atual
    const foldersList = folders.filter(f => 
      f.clientId === clientId && f.parentFolderId === folderId
    );

    // Filtrar documentos do nível atual
    const documentsList = client.documents.filter(d => 
      (folderId === null && !d.folderId) || d.folderId === folderId
    );

    return { folders: foldersList, documents: documentsList };
  };

  // Função para mover pasta ou documento
  const moveFolderOrDocument = async (itemId: string, targetFolderId: string | null, isFolder: boolean) => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem mover itens");
      return;
    }

    try {
      if (isFolder) {
        // Verificar se não está tentando mover para dentro de si mesma
        if (itemId === targetFolderId) {
          toast.error("Não é possível mover uma pasta para dentro de si mesma");
          return;
        }

        // Verificar se targetFolderId não é descendente de itemId
        let currentParent = targetFolderId;
        while (currentParent) {
          if (currentParent === itemId) {
            toast.error("Não é possível mover uma pasta para dentro de suas subpastas");
            return;
          }
          const parentFolder = folders.find(f => f.id === currentParent);
          currentParent = parentFolder?.parentFolderId || null;
        }

        const { error } = await supabase
          .from('folders')
          .update({ parent_folder_id: targetFolderId })
          .eq('id', itemId);

        if (error) {
          console.error("Erro ao mover pasta:", error);
          
          if (error.message && error.message.includes('Profundidade máxima')) {
            toast.error("Operação resultaria em profundidade máxima excedida");
          } else {
            toast.error("Erro ao mover pasta");
          }
          return;
        }

        // Atualizar estado local
        setFolders(folders.map(f => 
          f.id === itemId ? { ...f, parentFolderId: targetFolderId } : f
        ));

        toast.success("Pasta movida com sucesso");
      } else {
        // Mover documento
        const { error } = await supabase
          .from('documents')
          .update({ folder_id: targetFolderId })
          .eq('id', itemId);

        if (error) {
          console.error("Erro ao mover documento:", error);
          toast.error("Erro ao mover documento");
          return;
        }

        // Atualizar estado local
        const document = clients.flatMap(c => c.documents).find(d => d.id === itemId);
        if (document) {
          await reloadClientDocuments(document.folderId || '');
        }

        toast.success("Documento movido com sucesso");
      }
    } catch (error) {
      console.error("Erro ao mover item:", error);
      toast.error("Erro ao mover item");
    }
  };

  // Função para obter caminho completo de uma pasta (breadcrumb)
  const getFolderPath = (folderId: string | null): Folder[] => {
    if (!folderId) return [];

    const path: Folder[] = [];
    let currentId: string | null = folderId;
    let iterations = 0;
    const maxIterations = 10;

    while (currentId && iterations < maxIterations) {
      const folder = folders.find(f => f.id === currentId);
      if (!folder) break;

      path.unshift(folder);
      currentId = folder.parentFolderId;
      iterations++;
    }

    return path;
  };

  // Resetar currentFolderId quando mudar de cliente
  useEffect(() => {
    setCurrentFolderId(null);
  }, [currentClient?.id]);

  return (
    <ClientContext.Provider 
      value={{ 
        clients, 
        currentClient, 
        currentClientToEdit,
        editDialogOpen,
        folders,
        currentFolderId,
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
        refreshClientsFromSupabase,
        setCurrentFolderId,
        createFolder,
        renameFolder,
        deleteFolder,
        getFolderContents,
        moveFolderOrDocument,
        getFolderPath
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};
