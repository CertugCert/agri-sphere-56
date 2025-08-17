import { Navigate } from 'react-router-dom';
import { masterApi } from '@/services/api-multitenant';

interface RequireAuthMasterProps {
  children: React.ReactNode;
}

export function RequireAuthMaster({ children }: RequireAuthMasterProps) {
  if (!masterApi.isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
}