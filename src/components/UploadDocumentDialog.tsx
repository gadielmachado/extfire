import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { useClientContext } from '@/contexts/ClientContext';
import { Document } from '@/types/document';
import { uploadFileToStorage } from '@/lib/utils';

interface UploadDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId?: string | null;
}

const UploadDocumentDialog: React.FC<UploadDocumentDialogProps> = ({ isOpen, onClose, currentFolderId = null }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const { currentClient, addDocument, folders, getFolderPath } = useClientContext();

  // Filtrar pastas do cliente atual
  const clientFolders = folders.filter(f => currentClient && f.clientId === currentClient.id);

  // Resetar pasta selecionada quando o dialog abre
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(currentFolderId);
    }
  }, [isOpen, currentFolderId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toUpperCase() || '';
    return extension;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !currentClient) {
      if (!currentClient) {
        console.error('❌ Nenhum cliente selecionado para upload!');
        toast.error('Selecione um cliente primeiro');
      }
      return;
    }
    
    try {
      setIsUploading(true);
      
      // CRÍTICO: Revalidar cliente atual diretamente do banco ANTES do upload
      // Isso garante que sempre usamos o ID mais recente e correto
      console.log('🔍 Validando cliente antes do upload...');
      
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: clienteAtual, error: clienteErro } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('id', currentClient.id)
        .single();
      
      if (clienteErro || !clienteAtual) {
        console.error('❌ Erro ao validar cliente:', clienteErro);
        toast.error('Erro ao validar cliente. Tente novamente.');
        return;
      }
      
      const clientIdFinal = clienteAtual.id;
      
      // Log detalhado do cliente validado
      console.log('📤 Upload confirmado para:', {
        arquivo: file.name,
        clienteNome: clienteAtual.name,
        clienteId: clientIdFinal,
        clienteEmail: clienteAtual.email,
        validacao: '✅ ID revalidado do banco'
      });
      
      // Upload para o Supabase Storage usando ID validado
      const fileUrl = await uploadFileToStorage(file, clientIdFinal);
      
      if (!fileUrl) {
        toast.error('Falha ao fazer upload do arquivo');
        return;
      }
      
      // Criar documento com URL do arquivo e pasta selecionada
      const newDocument: Document = {
        id: crypto.randomUUID(),
        name: file.name,
        type: getFileType(file.name),
        size: formatFileSize(file.size),
        uploadDate: new Date(),
        fileUrl: fileUrl,
        folderId: selectedFolderId
      };
      
      console.log('💾 Salvando documento no banco com ID VALIDADO:', {
        documentoId: newDocument.id,
        clienteId: clientIdFinal,
        nome: newDocument.name,
        validacao: '✅ Usando ID do banco, não do cache'
      });
      
      // Adicionar o documento ao cliente usando ID validado
      await addDocument(clientIdFinal, newDocument);
      
      toast.success('Documento enviado com sucesso!');
      setFile(null);
      setSelectedFolderId(currentFolderId);
      onClose();
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      toast.error('Erro ao enviar o documento');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Seletor de pasta destino */}
            <div className="grid gap-2">
              <Label htmlFor="folder-select">
                Pasta de Destino
              </Label>
              <Select
                value={selectedFolderId || 'root'}
                onValueChange={(value) => setSelectedFolderId(value === 'root' ? null : value)}
              >
                <SelectTrigger id="folder-select">
                  <SelectValue placeholder="Selecione uma pasta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      Raiz
                    </div>
                  </SelectItem>
                  {clientFolders.map(folder => {
                    const path = getFolderPath(folder.id);
                    const indentLevel = path.length;
                    return (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${indentLevel * 12}px` }}>
                          <Folder className="h-4 w-4 text-yellow-500" />
                          {folder.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {selectedFolderId 
                  ? `Enviando para: ${getFolderPath(selectedFolderId).map(f => f.name).join(' > ')}`
                  : 'O documento será enviado para a raiz'
                }
              </p>
            </div>

            <div
              className={`border-2 border-dashed rounded-md p-6 text-center ${
                isDragging ? 'bg-gray-50 border-blue-500' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <Upload className="h-12 w-12 text-gray-400 mb-2" />
                <p className="mb-2">Arraste e solte o arquivo aqui ou</p>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-500 hover:text-blue-700">selecione um arquivo</span>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file && (
                  <div className="mt-4 p-2 bg-gray-50 rounded text-sm">
                    <p>Arquivo selecionado: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? 'Processando...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDocumentDialog;