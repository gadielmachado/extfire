import React, { useState, useMemo } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Folder, AlertTriangle } from 'lucide-react';
import { useClientContext } from '@/contexts/ClientContext';
import type { Folder as FolderType } from '@/types/folder';

interface DeleteFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FolderType | null;
}

const DeleteFolderDialog: React.FC<DeleteFolderDialogProps> = ({ 
  isOpen, 
  onClose, 
  folder 
}) => {
  const [deleteOption, setDeleteOption] = useState<'move' | 'delete'>('move');
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteFolder, getFolderContents, folders } = useClientContext();

  // Calcular quantidade de itens na pasta e subpastas
  const itemCount = useMemo(() => {
    if (!folder) return { folders: 0, documents: 0, total: 0 };

    let folderCount = 0;
    let documentCount = 0;

    // Função recursiva para contar subpastas e documentos
    const countItems = (folderId: string) => {
      const contents = getFolderContents(folder.clientId, folderId);
      
      folderCount += contents.folders.length;
      documentCount += contents.documents.length;

      // Recursivamente contar nas subpastas
      contents.folders.forEach(subFolder => {
        countItems(subFolder.id);
      });
    };

    countItems(folder.id);

    return {
      folders: folderCount,
      documents: documentCount,
      total: folderCount + documentCount
    };
  }, [folder, folders, getFolderContents]);

  const handleDelete = async () => {
    if (!folder) return;

    setIsDeleting(true);

    try {
      await deleteFolder(folder.id, deleteOption === 'delete');
      onClose();
      setDeleteOption('move'); // Resetar para padrão
    } catch (error) {
      console.error('Erro ao deletar pasta:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!folder) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Confirmar Exclusão de Pasta
          </AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a deletar a pasta <strong>"{folder.name}"</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {itemCount.total > 0 && (
          <div className="py-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-sm text-amber-800">
                <strong>Atenção:</strong> Esta pasta contém:
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 ml-4">
                {itemCount.folders > 0 && (
                  <li>• {itemCount.folders} pasta(s)</li>
                )}
                {itemCount.documents > 0 && (
                  <li>• {itemCount.documents} documento(s)</li>
                )}
              </ul>
            </div>

            <RadioGroup value={deleteOption} onValueChange={(value: string) => setDeleteOption(value as 'move' | 'delete')}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="move" id="move" className="mt-1" />
                  <Label htmlFor="move" className="cursor-pointer flex-1">
                    <div className="font-medium">Mover conteúdo para a raiz</div>
                    <p className="text-sm text-gray-600 mt-1">
                      As pastas e documentos serão movidos para o nível pai (ou raiz) antes de deletar a pasta
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer border-red-200">
                  <RadioGroupItem value="delete" id="delete" className="mt-1" />
                  <Label htmlFor="delete" className="cursor-pointer flex-1">
                    <div className="font-medium text-red-600">Deletar todo o conteúdo</div>
                    <p className="text-sm text-gray-600 mt-1">
                      A pasta e todo o seu conteúdo (pastas e documentos) serão permanentemente deletados
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}

        {itemCount.total === 0 && (
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Esta pasta está vazia e será deletada permanentemente.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variant={deleteOption === 'delete' ? 'destructive' : 'default'}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deletando...' : (deleteOption === 'delete' ? 'Deletar Tudo' : 'Deletar Pasta')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteFolderDialog;

