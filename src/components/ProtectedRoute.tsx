import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useClientContext } from '@/contexts/ClientContext';
import Spinner from './Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { currentUser, isLoading, isAdmin, isClientBlocked } = useAuthContext();
  const { clients, setCurrentClient } = useClientContext();

  if (isLoading) {
    return <Spinner />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Verificar se o cliente está bloqueado (apenas para usuários não-admin)
  if (!isAdmin && isClientBlocked(clients)) {
    return <Navigate to="/access-blocked" replace />;
  }

  // Se for rota apenas para admin e o usuário não for admin, redireciona para o dashboard
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
