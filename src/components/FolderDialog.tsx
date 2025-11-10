import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Folder } from 'lucide-react';
import { useClientContext } from '@/contexts/ClientContext';

interface FolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'rename';
  clientId: string;
  parentFolderId?: string | null;
  folderId?: string;
  folderName?: string;
}

const FolderDialog: React.FC<FolderDialogProps> = ({ 
  isOpen, 
  onClose, 
  mode, 
  clientId,
  parentFolderId = null,
  folderId,
  folderName: initialFolderName = ''
}) => {
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createFolder, renameFolder, getFolderPath } = useClientContext();

  // Resetar ou definir nome ao abrir
  useEffect(() => {
    if (isOpen) {
      setFolderName(mode === 'rename' ? initialFolderName : '');
    }
  }, [isOpen, mode, initialFolderName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        await createFolder(clientId, folderName, parentFolderId);
      } else if (mode === 'rename' && folderId) {
        await renameFolder(folderId, folderName);
      }

      setFolderName('');
      onClose();
    } catch (error) {
      console.error('Erro ao processar pasta:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obter caminho da pasta pai para exibir no breadcrumb
  const getParentPath = () => {
    if (!parentFolderId) return 'Raiz';
    
    const path = getFolderPath(parentFolderId);
    if (path.length === 0) return 'Raiz';
    
    return 'Raiz > ' + path.map(f => f.name).join(' > ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {mode === 'create' ? 'Nova Pasta' : 'Renomear Pasta'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {mode === 'create' && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Criar em: </span>
                <span className="text-gray-500">{getParentPath()}</span>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="folder-name">
                Nome da Pasta
              </Label>
              <Input
                id="folder-name"
                type="text"
                placeholder="Digite o nome da pasta"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                autoFocus
                maxLength={255}
              />
              <p className="text-xs text-gray-500">
                O nome deve ser único dentro desta pasta
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!folderName.trim() || isSubmitting}
            >
              {isSubmitting ? 'Processando...' : (mode === 'create' ? 'Criar Pasta' : 'Renomear')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FolderDialog;

