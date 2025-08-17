import { Navigate, useParams } from 'react-router-dom';
import { tenantApi } from '@/services/api-multitenant';

interface RequireAuthTenantProps {
  children: React.ReactNode;
}

export function RequireAuthTenant({ children }: RequireAuthTenantProps) {
  const { slug } = useParams<{ slug: string }>();
  
  if (!slug) {
    return <Navigate to="/" replace />;
  }
  
  if (!tenantApi.isAuthenticated(slug)) {
    return <Navigate to={`/t/${slug}/login`} replace />;
  }
  
  return <>{children}</>;
}