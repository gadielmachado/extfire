import React from 'react';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotificationContext } from '@/contexts/NotificationContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const NotificationPopover: React.FC = () => {
  const { notifications, unreadCount, hasUnread, markAllAsRead } = useNotificationContext();

  const handlePopoverOpenChange = (open: boolean) => {
    // Quando o popover é aberto, marcar notificações como lidas
    if (open) {
      markAllAsRead();
    }
  };

  // Função para renderizar a mensagem baseada nos dias restantes
  const getDaysMessage = (days: number): string => {
    if (days === 0) {
      return "Hoje";
    } else if (days === 1) {
      return "Amanhã";
    } else {
      return `Em ${days} dias`;
    }
  };

  return (
    <Popover onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger asChild>
        <button className="p-1 text-extfire-gray hover:text-white relative">
          <Bell size={18} />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="p-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Notificações de Manutenção</h3>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <div 
                key={`${notification.clientId}-${index}`} 
                className={`p-3 border-b border-gray-100 last:border-none ${
                  notification.status === 'urgent' 
                    ? 'bg-red-50' 
                    : notification.status === 'near' 
                    ? 'bg-yellow-50' 
                    : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-gray-900">{notification.clientName}</h4>
                  <span 
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      notification.status === 'urgent' 
                        ? 'bg-red-100 text-red-800' 
                        : notification.status === 'near' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {getDaysMessage(notification.daysRemaining)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Manutenção agendada para{' '}
                  <span className="font-medium">
                    {format(notification.maintenanceDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </p>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>Não há manutenções próximas.</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPopover; 