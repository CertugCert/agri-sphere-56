import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { tenantApi } from '@/services/api-multitenant';

interface RequireModuleProps {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface TenantMe {
  user: { id: string; empresa_id: string; nome: string; email: string };
  roles: string[];
  permissions: string[];
  allowedModules: string[];
}

export function RequireModule({ module, children, fallback }: RequireModuleProps) {
  const { slug } = useParams<{ slug: string }>();
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const fetchMe = async () => {
      try {
        const me = await tenantApi.get<TenantMe>('/me', slug);
        setAllowedModules(me.allowedModules || []);
      } catch (error) {
        console.error('Failed to fetch user modules:', error);
        setAllowedModules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [slug]);

  if (loading) {
    return <div className="p-4 text-center">Carregando...</div>;
  }

  if (!allowedModules.includes(module)) {
    return fallback ? <>{fallback}</> : <div className="p-4 text-center text-muted-foreground">Módulo não disponível</div>;
  }

  return <>{children}</>;
}