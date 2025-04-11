import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import Logo from '@/components/Logo';
import { LockIcon, AlertTriangle } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

const AccessBlocked: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthContext();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center">
            <LockIcon className="h-10 w-10 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Acesso Bloqueado</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
          <p className="text-sm text-yellow-700">
            Desculpe, seu acesso não foi identificado. Entre em contato com o administrador para mais informações.
          </p>
        </div>
        
        <p className="text-gray-600 mb-8">
          Se você acredita que isso é um erro, por favor entre em contato com o suporte ou tente novamente mais tarde.
        </p>
        
        <Button 
          onClick={handleLogout}
          className="w-full bg-extfire-red hover:bg-red-600 text-white font-medium py-2"
        >
          Voltar para o Login
        </Button>
      </div>
    </div>
  );
};

export default AccessBlocked; 