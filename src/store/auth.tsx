import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';

export type MeResponse = {
  user: { id: string; empresa_id: string; nome: string; email: string };
  roles: string[];
  permissions: string[];
  allowedModules: string[];
};

type AuthContextType = {
  me?: MeResponse;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const data = await api.get<MeResponse>('/me');
      setMe(data);
    } catch {
      setMe(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const access = localStorage.getItem('access_token');
    if (access) fetchMe();
    else setLoading(false);
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; refreshToken: string }>('/auth/login', { email, password });
    localStorage.setItem('access_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    await fetchMe();
  }, [fetchMe]);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setMe(undefined);
  }, []);

  const value = useMemo(() => ({ me, loading, isAuthenticated: !!me, login, logout }), [me, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
