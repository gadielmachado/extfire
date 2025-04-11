import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useClientContext } from '@/contexts/ClientContext';
import { Document } from '@/types/document';
import { uploadFileToStorage } from '@/lib/utils';

interface UploadDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadDocumentDialog: React.FC<UploadDocumentDialogProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { currentClient, addDocument } = useClientContext();

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
    if (!file || !currentClient) return;
    
    try {
      setIsUploading(true);
      
      // Upload para o Supabase Storage
      const fileUrl = await uploadFileToStorage(file, currentClient.id);
      
      if (!fileUrl) {
        toast.error('Falha ao fazer upload do arquivo');
        return;
      }
      
      // Criar documento com URL do arquivo
      const newDocument: Document = {
        id: Date.now().toString(),
        name: file.name,
        type: getFileType(file.name),
        size: formatFileSize(file.size),
        uploadDate: new Date(),
        fileUrl: fileUrl
      };
      
      // Adicionar o documento ao cliente
      addDocument(currentClient.id, newDocument);
      
      toast.success('Documento enviado com sucesso!');
      setFile(null);
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