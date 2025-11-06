import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Edit, Trash2, Lock, Unlock } from 'lucide-react';
import { useClientContext } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import { useAuthContext } from '@/contexts/AuthContext';
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

interface ClientItemProps {
  client: Client;
  isActive: boolean;
  onClick: () => void;
}

const ClientItem: React.FC<ClientItemProps> = ({ client, isActive, onClick }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isBlocked, setIsBlocked] = useState(client.isBlocked);
  const { deleteClient, setCurrentClientToEdit, setEditDialogOpen, blockClient, unblockClient } = useClientContext();
  const { isAdmin } = useAuthContext();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsBlocked(client.isBlocked);
  }, [client.isBlocked]);

  // Adiciona ouvinte de clique global quando o menu está aberto
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Fecha o menu se o clique for fora do menu e do botão de três pontinhos
      if (
        showMenu && 
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    // Adiciona o ouvinte quando o menu está aberto
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Remove o ouvinte quando o componente é desmontado ou o menu é fechado
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentClientToEdit(client);
    setEditDialogOpen(true);
    setShowMenu(false);
  };

  const handleBlockToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBlocked) {
      unblockClient(client.id);
    } else {
      blockClient(client.id);
    }
    setShowMenu(false);
  };

  const handleDeletePrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const handleDeleteConfirm = () => {
    console.log('🔍 ClientItem - Tentando excluir cliente:', {
      clientId: client.id,
      clientName: client.name,
      tipoId: typeof client.id,
      idLength: client.id?.length,
      clientCompleto: client
    });
    
    if (!client.id) {
      console.error('❌ ClientItem - ID do cliente está vazio!');
      alert('Erro: ID do cliente não encontrado. Por favor, recarregue a página.');
      return;
    }
    
    deleteClient(client.id);
    setShowDeleteConfirm(false);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <>
      <div 
        className={`relative flex flex-col px-4 py-3 cursor-pointer ${isActive ? 'bg-extfire-hover text-white' : 'text-extfire-text hover:bg-extfire-hover'}`}
        onClick={onClick}
      >
        <div className="flex justify-between items-center">
          <div className="font-medium">
            {client.name}
            {isBlocked && (
              <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-sm">
                Bloqueado
              </span>
            )}
          </div>
          {isAdmin && (
            <button 
              ref={buttonRef}
              className="text-extfire-gray hover:text-white p-1 rounded-full"
              onClick={handleMenuToggle}
            >
              <MoreHorizontal size={16} />
            </button>
          )}
        </div>
        <div className="text-sm text-extfire-gray">{client.cnpj}</div>
        
        {showMenu && (
          <div 
            ref={menuRef}
            className="absolute right-3 top-10 bg-white text-black shadow-lg rounded-md z-10 py-1 w-40"
          >
            <button 
              className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100"
              onClick={handleEditClick}
            >
              <Edit size={16} />
              <span>Editar Cliente</span>
            </button>
            <button 
              className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 ${isBlocked ? 'text-green-600' : 'text-orange-500'}`}
              onClick={handleBlockToggle}
            >
              {isBlocked ? (
                <>
                  <Unlock size={16} />
                  <span>Desbloquear</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Bloquear</span>
                </>
              )}
            </button>
            <button 
              className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 text-red-500"
              onClick={handleDeletePrompt}
            >
              <Trash2 size={16} />
              <span>Excluir Cliente</span>
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{client.name}</strong>? Esta ação não poderá ser desfeita e removerá permanentemente o cliente e seus dados do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClientItem;
