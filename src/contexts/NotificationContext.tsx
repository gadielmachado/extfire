import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client } from '@/types/client';
import { useClientContext } from './ClientContext';
import { differenceInDays } from 'date-fns';

// Definição do tipo de notificação
export interface MaintenanceNotification {
  clientId: string;
  clientName: string;
  maintenanceDate: Date;
  daysRemaining: number;
  status: 'upcoming' | 'near' | 'urgent';
}

interface NotificationContextType {
  notifications: MaintenanceNotification[];
  unreadCount: number;
  hasUnread: boolean;
  markAllAsRead: () => void;
  getNotificationColor: (date: Date | null) => string;
}

const NotificationContext = createContext<NotificationContextType>({} as NotificationContextType);

export const useNotificationContext = () => useContext(NotificationContext);

// Constantes para os limites de dias para cada nível de urgência
const URGENT_THRESHOLD = 2; // Vermelho: 0-2 dias
const NEAR_THRESHOLD = 15;  // Amarelo: 3-15 dias
                           // Verde: > 15 dias

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { clients } = useClientContext();
  const [notifications, setNotifications] = useState<MaintenanceNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  // Atualiza as notificações com base nos clientes
  useEffect(() => {
    const newNotifications: MaintenanceNotification[] = [];
    
    clients.forEach(client => {
      if (client.maintenanceDate) {
        const maintenanceDate = new Date(client.maintenanceDate);
        const today = new Date();
        
        // Verifica se a data é no futuro
        if (maintenanceDate > today) {
          const daysRemaining = differenceInDays(maintenanceDate, today);
          
          // Determina o status com base nos dias restantes
          let status: 'upcoming' | 'near' | 'urgent' = 'upcoming';
          
          if (daysRemaining <= URGENT_THRESHOLD) {
            status = 'urgent';
          } else if (daysRemaining <= NEAR_THRESHOLD) {
            status = 'near';
          }
          
          // Adiciona à lista de notificações se estiver dentro do limite de notificação (15 dias)
          if (daysRemaining <= NEAR_THRESHOLD) {
            newNotifications.push({
              clientId: client.id,
              clientName: client.name,
              maintenanceDate,
              daysRemaining,
              status
            });
          }
        }
      }
    });
    
    // Ordena as notificações pela quantidade de dias restantes (mais urgentes primeiro)
    newNotifications.sort((a, b) => a.daysRemaining - b.daysRemaining);
    
    setNotifications(newNotifications);
    
    // Quando novas notificações são carregadas, marca como não lidas
    if (newNotifications.length > 0) {
      setUnreadCount(newNotifications.length);
      setHasUnread(true);
    }
  }, [clients]);

  // Função para marcar todas as notificações como lidas
  const markAllAsRead = () => {
    setUnreadCount(0);
    setHasUnread(false);
  };

  // Função para determinar a cor com base na proximidade da data
  const getNotificationColor = (date: Date | null): string => {
    if (!date) return "text-gray-400"; // Sem data de manutenção
    
    const today = new Date();
    const maintenanceDate = new Date(date);
    
    // Se a data já passou
    if (maintenanceDate < today) {
      return "text-red-600"; // Vermelho para manutenções atrasadas
    }
    
    const daysRemaining = differenceInDays(maintenanceDate, today);
    
    if (daysRemaining <= URGENT_THRESHOLD) {
      return "text-red-500"; // Vermelho urgente
    } else if (daysRemaining <= NEAR_THRESHOLD) {
      return "text-yellow-500"; // Amarelo próximo
    } else {
      return "text-green-500"; // Verde tranquilo
    }
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        hasUnread,
        markAllAsRead,
        getNotificationColor
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}; 