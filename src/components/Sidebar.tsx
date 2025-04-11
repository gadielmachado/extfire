import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import Logo from './Logo';
import ClientItem from './ClientItem';
import { useClientContext } from '@/contexts/ClientContext';
import { useAuthContext } from '@/contexts/AuthContext';
import UserInfo from './UserInfo';

interface SidebarProps {
  onAddClient: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddClient }) => {
  const { clients, setCurrentClient, currentClient, getActiveClients } = useClientContext();
  const { currentUser, isAdmin } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Para administradores, mostrar todos os clientes (incluindo bloqueados)
  // Para usuários regulares, mostrar apenas seu próprio cliente (se não estiver bloqueado)
  const availableClients = isAdmin 
    ? clients 
    : clients.filter(client => {
        // Para usuários não-admin, mostrar apenas o cliente correspondente ao usuário
        if (!currentUser) return false;
        
        // Se o cliente estiver bloqueado, não mostrar (a menos que seja admin)
        if (client.isBlocked) return false;
        
        // Verificar correspondência por clientId ou email
        return (
          // Correspondência por clientId (preferencial)
          (currentUser.clientId && client.id === currentUser.clientId) ||
          // Correspondência por email (fallback)
          (currentUser.email && client.email === currentUser.email)
        );
      });
  
  // Filtrar por termo de busca
  const filteredClients = availableClients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.cnpj.includes(searchTerm)
  );

  // Se o usuário é cliente e não há cliente atual, definir o cliente dele
  useEffect(() => {
    if (!isAdmin && !currentClient && availableClients.length > 0) {
      setCurrentClient(availableClients[0]);
    }
  }, [currentUser, availableClients, isAdmin, currentClient, setCurrentClient]);

  return (
    <div className="h-screen w-80 bg-extfire-background flex flex-col">
      <div className="p-4 flex items-center justify-between">
        <Logo />
        {isAdmin && (
          <button 
            onClick={onAddClient}
            className="p-1 hover:bg-extfire-hover rounded-md"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
      
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-extfire-gray" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#232836] text-extfire-text pl-9 pr-3 py-2 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {filteredClients.map(client => (
          <ClientItem 
            key={client.id} 
            client={client} 
            isActive={currentClient?.id === client.id}
            onClick={() => setCurrentClient(client)}
          />
        ))}
        {filteredClients.length === 0 && (
          <div className="px-4 py-3 text-extfire-gray text-sm">
            Nenhum cliente encontrado
          </div>
        )}
      </div>
      
      <UserInfo />
    </div>
  );
};

export default Sidebar;
