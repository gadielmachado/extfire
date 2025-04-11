import React from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import NotificationPopover from './NotificationPopover';

const UserInfo: React.FC = () => {
  const { currentUser, logout } = useAuthContext();
  
  if (!currentUser) return null;
  
  return (
    <div className="border-t border-[#2A2F3C] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-extfire-hover rounded-full flex items-center justify-center mr-3">
            <User className="h-4 w-4 text-extfire-text" />
          </div>
          <div>
            <p className="text-sm text-extfire-text">Usuário Master</p>
            <p className="text-xs text-extfire-gray">{currentUser.email}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <NotificationPopover />
          <button 
            className="p-1 ml-2 text-extfire-gray hover:text-white"
            onClick={logout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
