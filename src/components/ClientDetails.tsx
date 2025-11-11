import React, { useState, useEffect } from 'react';
import { Calendar, Download, Trash2, Lock, Edit, Upload, Unlock, Folder, FolderOpen, File, ChevronRight, FolderPlus, Edit2, Move } from 'lucide-react';
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
import FolderDialog from '@/components/FolderDialog';
import DeleteFolderDialog from '@/components/DeleteFolderDialog';
import type { Folder as FolderType } from '@/types/folder';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

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
  const { 
    updateClient, 
    blockClient, 
    unblockClient, 
    removeDocument,
    currentFolderId,
    setCurrentFolderId,
    getFolderContents,
    getFolderPath,
    moveFolderOrDocument
  } = useClientContext();
  const { getNotificationColor } = useNotificationContext();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{id: string, fileUrl: string, name: string} | null>(null);
  const [isBlocked, setIsBlocked] = useState(client.isBlocked);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'rename'>('create');
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDraggingOverRoot, setIsDraggingOverRoot] = useState(false);
  
  // Obter conteúdo da pasta atual
  const { folders: currentFolders, documents: currentDocuments } = getFolderContents(client.id, currentFolderId);

  // Obter todas as pastas do cliente para o menu de movimentação
  const { folders } = useClientContext();
  const clientFolders = folders.filter(f => f.clientId === client.id);

  // Atualizar o estado local quando o client prop mudar
  useEffect(() => {
    setIsBlocked(client.isBlocked);
  }, [client.isBlocked]);

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
    
    const { id } = documentToDelete;
    
    // CORREÇÃO: Usar removeDocument() do contexto que faz a exclusão completa
    // (tanto do Storage quanto da tabela documents no Supabase)
    try {
      await removeDocument(client.id, id);
      // removeDocument já mostra o toast de sucesso
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast.error('Erro ao excluir documento');
    } finally {
        setShowDeleteAlert(false);
        setDocumentToDelete(null);
    }
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

  const handleCreateFolder = () => {
    setFolderDialogMode('create');
    setSelectedFolder(null);
    setFolderDialogOpen(true);
  };

  const handleRenameFolder = (folder: FolderType) => {
    setFolderDialogMode('rename');
    setSelectedFolder(folder);
    setFolderDialogOpen(true);
  };

  const handleDeleteFolder = (folder: FolderType) => {
    setSelectedFolder(folder);
    setDeleteFolderDialogOpen(true);
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  // Obter caminho da pasta atual para breadcrumb
  const breadcrumbPath = getFolderPath(currentFolderId);

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string, isFolder: boolean) => {
    if (!isAdmin) return;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('itemId', itemId);
    e.dataTransfer.setData('isFolder', isFolder.toString());
  };

  const handleDragOver = (e: React.DragEvent, targetFolderId: string | null) => {
    if (!isAdmin) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetFolderId === null) {
      setIsDraggingOverRoot(true);
    } else {
      setDragOverFolderId(targetFolderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isAdmin) return;
    
    setDragOverFolderId(null);
    setIsDraggingOverRoot(false);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    if (!isAdmin) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const itemId = e.dataTransfer.getData('itemId');
    const isFolder = e.dataTransfer.getData('isFolder') === 'true';
    
    setDragOverFolderId(null);
    setIsDraggingOverRoot(false);
    
    if (!itemId) return;
    
    // Não permitir drop em si mesmo
    if (isFolder && itemId === targetFolderId) {
      toast.error('Não é possível mover uma pasta para dentro de si mesma');
      return;
    }
    
    await moveFolderOrDocument(itemId, targetFolderId, isFolder);
  };

  // Função para mover documento via menu contextual
  const handleMoveDocument = async (documentId: string, targetFolderId: string | null) => {
    await moveFolderOrDocument(documentId, targetFolderId, false);
  };

  // Função recursiva para renderizar árvore de pastas
  const renderFolderTree = (parentId: string | null, documentId: string, depth: number = 0): JSX.Element[] => {
    const subFolders = clientFolders.filter(f => f.parentFolderId === parentId);
    
    return subFolders.map(folder => (
      // O React.Fragment aqui não precisa de key, a key vai no elemento filho
      <React.Fragment key={folder.id}>
        <DropdownMenuItem
          onClick={() => handleMoveDocument(documentId, folder.id)}
          className="cursor-pointer"
          style={{ paddingLeft: `${(depth + 1) * 16}px` }}
        >
          <Folder className="h-4 w-4 mr-2 text-yellow-500" />
          {folder.name}
        </DropdownMenuItem>
        {renderFolderTree(folder.id, documentId, depth + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 overflow-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-gray-500">CNPJ: {client.cnpj}</p>
          <p className="text-gray-500">Email: {client.email || 'Não informado'}</p>
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
              onClick={handleCreateFolder}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white border border-purple-600 rounded-md hover:bg-purple-700 transition-colors"
            >
              <FolderPlus size={16} />
              <span>Nova Pasta</span>
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
      
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-md shadow-sm mb-4 p-4">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => handleBreadcrumbClick(null)}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            Raiz
          </button>
          {breadcrumbPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight size={16} className="text-gray-400" />
              <button
                onClick={() => handleBreadcrumbClick(folder.id)}
                className={`hover:text-blue-800 hover:underline ${
                  index === breadcrumbPath.length - 1 
                    ? 'text-gray-700 font-medium' 
                    : 'text-blue-600'
                }`}
              >
                {folder.name}
              </button>
            </div>
          ))}
          <span className="ml-auto text-gray-500">
            {currentFolders.length} pasta(s) • {currentDocuments.length} documento(s)
          </span>
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
                <p className={`${getNotificationColor(client.maintenanceDate)}`}>
                  {formatMaintenanceDate(client.maintenanceDate)}
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
              <th className="px-6 py-3">DATA</th>
              <th className="px-6 py-3">AÇÕES</th>
            </tr>
          </thead>
          <tbody 
            onDragOver={(e) => handleDragOver(e, currentFolderId)}
            onDrop={(e) => handleDrop(e, currentFolderId)}
            onDragLeave={handleDragLeave}
          >
            {/* Listar PASTAS primeiro */}
            {currentFolders.map(folder => (
              <tr 
                key={folder.id} 
                className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  dragOverFolderId === folder.id ? 'bg-blue-50 border-blue-300' : ''
                }`}
                onClick={() => handleFolderClick(folder.id)}
                draggable={isAdmin}
                onDragStart={(e) => handleDragStart(e, folder.id, true)}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDrop={(e) => handleDrop(e, folder.id)}
                onDragLeave={handleDragLeave}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">Pasta</td>
                <td className="px-6 py-4 text-gray-500">—</td>
                <td className="px-6 py-4 text-gray-500">{format(new Date(folder.createdAt), 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <>
                        <button 
                          className="text-blue-500 hover:text-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameFolder(folder);
                          }}
                          title="Renomear pasta"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder);
                          }}
                          title="Excluir pasta"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            
            {/* Listar DOCUMENTOS depois */}
            {currentDocuments.map(doc => (
              <tr 
                key={doc.id} 
                className="border-b border-gray-100 hover:bg-gray-50"
                draggable={isAdmin}
                onDragStart={(e) => handleDragStart(e, doc.id, false)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-gray-400" />
                    <span>{doc.name}</span>
                  </div>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="text-purple-500 hover:text-purple-700"
                            title="Mover para..."
                          >
                            <Move size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Mover para...</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleMoveDocument(doc.id, null)}
                            className="cursor-pointer"
                          >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Raiz
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {renderFolderTree(null, doc.id)}
                          {clientFolders.length === 0 && (
                            <DropdownMenuItem disabled>
                              Nenhuma pasta disponível
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
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
            
            {/* Mensagem quando vazio */}
            {currentFolders.length === 0 && currentDocuments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Folder className="h-12 w-12 text-gray-300" />
                    <p>Esta pasta está vazia</p>
                    {isAdmin && (
                      <p className="text-sm">Clique em "Nova Pasta" ou "Upload" para adicionar conteúdo</p>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmação para exclusão de documento */}
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

      {/* Dialog para criar/renomear pasta */}
      <FolderDialog
        isOpen={folderDialogOpen}
        onClose={() => setFolderDialogOpen(false)}
        mode={folderDialogMode}
        clientId={client.id}
        parentFolderId={currentFolderId}
        folderId={selectedFolder?.id}
        folderName={selectedFolder?.name}
      />

      {/* Dialog para deletar pasta */}
      <DeleteFolderDialog
        isOpen={deleteFolderDialogOpen}
        onClose={() => setDeleteFolderDialogOpen(false)}
        folder={selectedFolder}
      />
    </div>
  );
};

export default ClientDetails;
