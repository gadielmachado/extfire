import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ClientDetails from '@/components/ClientDetails';
import AddClientDialog from '@/components/AddClientDialog';
import EditClientDialog from '@/components/EditClientDialog';
import MaintenanceDialog from '@/components/MaintenanceDialog';
import UploadDocumentDialog from '@/components/UploadDocumentDialog';
import { useClientContext } from '@/contexts/ClientContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { 
    currentClient, 
    editDialogOpen, 
    setEditDialogOpen, 
    updateClient, 
    setCurrentClientToEdit, 
    clients,
    blockClient,
    unblockClient,
    refreshClientsFromSupabase,
    currentFolderId
  } = useClientContext();
  
  const { isAdmin, currentUser } = useAuthContext();
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Redirecionar cliente para seu próprio cliente se não estiver definido
  useEffect(() => {
    if (!isAdmin && !currentClient && currentUser?.clientId && clients.length > 0) {
      const userClient = clients.find(client => client.id === currentUser.clientId);
      if (userClient) {
        setCurrentClientToEdit(userClient);
      }
    }
  }, [isAdmin, currentClient, currentUser, clients, setCurrentClientToEdit]);

  const handleEditClient = () => {
    if (!currentClient) return;
    // Apenas admin pode editar qualquer cliente
    // Cliente só pode editar a si mesmo
    if (!isAdmin && currentUser?.clientId !== currentClient.id) {
      toast.error("Você não tem permissão para editar este cliente");
      return;
    }
    setCurrentClientToEdit(currentClient);
    setEditDialogOpen(true);
  };

  const handleScheduleMaintenance = () => {
    if (!currentClient) return;
    // Apenas admin pode agendar manutenção
    if (!isAdmin) {
      toast.error("Apenas administradores podem agendar manutenções");
      return;
    }
    setIsMaintenanceOpen(true);
  };

  const handleSyncClients = async () => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem sincronizar dados");
      return;
    }
    
    setIsSyncing(true);
    try {
      await refreshClientsFromSupabase();
    } catch (error) {
      console.error("Erro ao sincronizar dados:", error);
      toast.error("Erro ao sincronizar dados");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!currentClient) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar onAddClient={() => setIsAddClientOpen(true)} />
        <div className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Nenhum cliente selecionado</h1>
            <p className="text-gray-600 mb-6">
              {isAdmin 
                ? "Selecione um cliente na sidebar ou adicione um novo" 
                : "Nenhum cliente associado à sua conta foi encontrado"}
            </p>
            <div className="flex flex-col gap-4 items-center">
              {isAdmin && (
                <>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    onClick={() => setIsAddClientOpen(true)}
                  >
                    Adicionar Cliente
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={handleSyncClients}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        
        <AddClientDialog 
          isOpen={isAddClientOpen} 
          onClose={() => setIsAddClientOpen(false)} 
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar onAddClient={() => setIsAddClientOpen(true)} />
      
      <div className="flex-1 flex flex-col">
        {isAdmin && (
          <div className="p-2 bg-gray-50 border-b flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleSyncClients}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
            </Button>
          </div>
        )}
        
        <ClientDetails 
          client={currentClient}
          onScheduleMaintenance={handleScheduleMaintenance}
          onEditClient={handleEditClient}
          onUploadDocument={() => setIsUploadOpen(true)}
          isAdmin={isAdmin}
        />
      </div>
      
      {isAdmin && (
        <AddClientDialog 
          isOpen={isAddClientOpen} 
          onClose={() => setIsAddClientOpen(false)} 
        />
      )}
      
      <EditClientDialog 
        isOpen={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
      />
      
      {isAdmin && (
        <MaintenanceDialog 
          isOpen={isMaintenanceOpen} 
          onClose={() => setIsMaintenanceOpen(false)}
        />
      )}
      
      <UploadDocumentDialog 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)}
        currentFolderId={currentFolderId}
      />
    </div>
  );
};

export default Dashboard;
