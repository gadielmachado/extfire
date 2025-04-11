import React, { useState, useEffect } from 'react';
import { Calendar, Download, Trash2, Lock, Edit, Upload, Unlock } from 'lucide-react';
import { Client } from '@/types/client';
import { Document } from '@/types/document';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useClientContext } from '@/contexts/ClientContext';
import { toast } from 'sonner';
import { deleteFileFromStorage, getSignedUrl, downloadFile, downloadFileDirectly } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNotificationContext } from '@/contexts/NotificationContext';

interface ClientDetailsProps {
  client: Client;
  onScheduleMaintenance: () => void;
  onBlockClient?: () => void; // Tornamos opcional já que vamos implementar diretamente
  onEditClient: () => void;
  onUploadDocument: () => void;
  isAdmin: boolean;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ 
  client, 
  onScheduleMaintenance,
  onBlockClient,
  onEditClient,
  onUploadDocument,
  isAdmin
}) => {
  const { updateClient, blockClient, unblockClient, refreshClientsFromSupabase } = useClientContext();
  const { getNotificationColor } = useNotificationContext();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{id: string, fileUrl: string, name: string} | null>(null);
  const [isBlocked, setIsBlocked] = useState(client.isBlocked);
  const [localClient, setLocalClient] = useState<Client>(client);

  // Atualizar o estado local quando o client prop mudar
  useEffect(() => {
    setIsBlocked(client.isBlocked);
    setLocalClient(client);
  }, [client]);

  const handleToggleBlock = () => {
    if (isBlocked) {
      unblockClient(client.id);
    } else {
      blockClient(client.id);
    }
    
    // A atualização do estado virá através do efeito quando a prop client for atualizada
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    
    const { id, fileUrl } = documentToDelete;
    
    // Excluir do Supabase Storage primeiro
    if (fileUrl) {
      const deleted = await deleteFileFromStorage(fileUrl);
      if (!deleted) {
        toast.error('Erro ao excluir arquivo do storage');
        setShowDeleteAlert(false);
        setDocumentToDelete(null);
        return;
      }
    }
    
    // Excluir do cliente
    const updatedDocuments = localClient.documents.filter(doc => doc.id !== id);
    updateClient({
      ...localClient,
      documents: updatedDocuments
    });
    
    toast.success('Documento excluído com sucesso!');
    setShowDeleteAlert(false);
    setDocumentToDelete(null);
  };

  const openDeleteConfirmation = (doc: Document) => {
    setDocumentToDelete({
      id: doc.id,
      fileUrl: doc.fileUrl,
      name: doc.name
    });
    setShowDeleteAlert(true);
  };

  const handleDownloadDocument = async (doc: Document) => {
    if (!doc.fileUrl) {
      toast.error("URL do documento não disponível");
      return;
    }
    
    // Mostrar loading
    toast.loading("Preparando download...");
    
    try {
      // Usar nova função direta
      const success = await downloadFileDirectly(doc);
      
      if (success) {
        toast.dismiss(); // Remove loading
        toast.success(`Download iniciado: ${doc.name}`);
      } else {
        toast.dismiss(); // Remove loading
        toast.error("Falha ao baixar o documento");
        console.error('Verifique o console para detalhes');
      }
    } catch (error) {
      toast.dismiss(); // Remove loading
      toast.error("Erro ao processar o download");
      console.error('Erro durante o download:', error);
    }
  };

  const formatMaintenanceDate = (date: Date | null) => {
    if (!date) return 'Não agendada';
    return format(date, 'dd/MM/yyyy');
  };

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">{localClient.name}</h1>
          <p className="text-gray-500">CNPJ: {localClient.cnpj}</p>
          <p className="text-gray-500">Email: {localClient.email || 'Não informado'}</p>
        </div>
        
        <div className="flex gap-3">
          {isAdmin && (
            <button
              onClick={handleToggleBlock}
              className={`flex items-center gap-2 px-4 py-2 border ${isBlocked ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'bg-red-600 text-white border-red-600 hover:bg-red-700'} rounded-md transition-colors`}
            >
              {isBlocked ? <Unlock size={16} /> : <Lock size={16} />}
              <span>{isBlocked ? 'Desbloquear Cliente' : 'Bloquear Cliente'}</span>
            </button>
          )}
          
          {isAdmin && (
            <button
              onClick={onScheduleMaintenance}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white border border-black rounded-md hover:bg-gray-800 transition-colors"
            >
              <Calendar size={16} />
              <span>Agendar Manutenção</span>
            </button>
          )}
          
          {isAdmin && (
            <button
              onClick={onUploadDocument}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Upload size={16} />
              <span>Upload</span>
            </button>
          )}
        </div>
      </div>
      
      {isAdmin && (
        <div className="bg-white rounded-md p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="font-medium text-gray-800">Próxima Manutenção</h2>
                <p className={`${getNotificationColor(localClient.maintenanceDate)}`}>
                  {formatMaintenanceDate(localClient.maintenanceDate)}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost"
              size="icon" 
              onClick={onScheduleMaintenance}
              className="hover:bg-gray-100"
            >
              <Edit size={16} />
            </Button>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-md shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold">Documentos</h2>
        </div>
        
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3">NOME</th>
              <th className="px-6 py-3">TIPO</th>
              <th className="px-6 py-3">TAMANHO</th>
              <th className="px-6 py-3">DATA DE UPLOAD</th>
              <th className="px-6 py-3">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {localClient.documents.map(doc => (
              <tr key={doc.id} className="border-b border-gray-100">
                <td className="px-6 py-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {doc.name}
                </td>
                <td className="px-6 py-4">{doc.type}</td>
                <td className="px-6 py-4">{doc.size}</td>
                <td className="px-6 py-4">{format(new Date(doc.uploadDate), 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => handleDownloadDocument(doc)}
                      title="Baixar documento"
                    >
                      <Download size={16} />
                    </button>
                    {isAdmin && (
                      <button 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => openDeleteConfirmation(doc)}
                        title="Excluir documento"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {localClient.documents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Nenhum documento encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmação para exclusão */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o documento 
              <strong> {documentToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientDetails;
