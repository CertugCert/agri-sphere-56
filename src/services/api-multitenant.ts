import { useParams } from 'react-router-dom';

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Context = 'master' | 'tenant' | 'public';

// Token management by context
function getTokens(context: Context, slug?: string) {
  if (context === 'master') {
    return {
      access: localStorage.getItem('master_access_token'),
      refresh: localStorage.getItem('master_refresh_token'),
    };
  } else if (context === 'tenant' && slug) {
    return {
      access: localStorage.getItem(`tenant_${slug}_access_token`),
      refresh: localStorage.getItem(`tenant_${slug}_refresh_token`),
    };
  }
  return { access: null, refresh: null };
}

function setTokens(context: Context, access?: string, refresh?: string, slug?: string) {
  if (context === 'master') {
    if (access) localStorage.setItem('master_access_token', access);
    if (refresh) localStorage.setItem('master_refresh_token', refresh);
  } else if (context === 'tenant' && slug) {
    if (access) localStorage.setItem(`tenant_${slug}_access_token`, access);
    if (refresh) localStorage.setItem(`tenant_${slug}_refresh_token`, refresh);
  }
}

function clearTokens(context: Context, slug?: string) {
  if (context === 'master') {
    localStorage.removeItem('master_access_token');
    localStorage.removeItem('master_refresh_token');
  } else if (context === 'tenant' && slug) {
    localStorage.removeItem(`tenant_${slug}_access_token`);
    localStorage.removeItem(`tenant_${slug}_refresh_token`);
  }
}

// Build baseURL based on context
function getBaseURL(context: Context, slug?: string) {
  if (context === 'master') {
    return `${API_BASE}/admin`;
  } else if (context === 'tenant' && slug) {
    return `${API_BASE}/t/${slug}`;
  } else if (context === 'public') {
    return `${API_BASE}/public`;
  }
  return API_BASE;
}

async function refreshToken(context: Context, slug?: string) {
  const { refresh } = getTokens(context, slug);
  if (!refresh) throw new Error('No refresh token');
  
  const baseURL = getBaseURL(context, slug);
  const res = await fetch(`${baseURL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh, refresh_token: refresh, token: refresh }),
  });
  
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  
  // Accept both camelCase and snake_case
  const accessToken = data.accessToken || data.access_token;
  const refreshToken = data.refreshToken || data.refresh_token;
  
  setTokens(context, accessToken, refreshToken, slug);
  return accessToken;
}

async function fetchWithAuth<T>(
  path: string, 
  method: HttpMethod, 
  context: Context,
  slug?: string,
  body?: unknown
): Promise<T> {
  const baseURL = getBaseURL(context, slug);
  const url = `${baseURL}${path}`;
  const tokens = getTokens(context, slug);
  
  const doFetch = async (token?: string) => {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  };

  let res = await doFetch(tokens.access || undefined);
  
  if (res.status === 401 && tokens.refresh && context !== 'public') {
    try {
      const newAccess = await refreshToken(context, slug);
      res = await doFetch(newAccess);
    } catch {
      // Clear invalid tokens
      clearTokens(context, slug);
      throw new Error('Authentication failed');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Erro desconhecido' } }));
    throw err;
  }
  return res.json();
}

// Master API
export const masterApi = {
  get: <T>(path: string) => fetchWithAuth<T>(path, 'GET', 'master'),
  post: <T>(path: string, body?: unknown) => fetchWithAuth<T>(path, 'POST', 'master', undefined, body),
  put: <T>(path: string, body?: unknown) => fetchWithAuth<T>(path, 'PUT', 'master', undefined, body),
  delete: <T>(path: string) => fetchWithAuth<T>(path, 'DELETE', 'master'),
  
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: 'Login failed' } }));
      throw err;
    }
    
    const data = await res.json();
    const accessToken = data.accessToken || data.access_token;
    const refreshToken = data.refreshToken || data.refresh_token;
    
    setTokens('master', accessToken, refreshToken);
    return data;
  },
  
  logout: () => clearTokens('master'),
  
  isAuthenticated: () => !!localStorage.getItem('master_access_token')
};

// Tenant API
export const tenantApi = {
  get: <T>(path: string, slug: string) => fetchWithAuth<T>(path, 'GET', 'tenant', slug),
  post: <T>(path: string, slug: string, body?: unknown) => fetchWithAuth<T>(path, 'POST', 'tenant', slug, body),
  put: <T>(path: string, slug: string, body?: unknown) => fetchWithAuth<T>(path, 'PUT', 'tenant', slug, body),
  delete: <T>(path: string, slug: string) => fetchWithAuth<T>(path, 'DELETE', 'tenant', slug),
  
  login: async (slug: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/t/${slug}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha: password }),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: 'Login failed' } }));
      throw err;
    }
    
    const data = await res.json();
    const accessToken = data.accessToken || data.access_token;
    const refreshToken = data.refreshToken || data.refresh_token;
    
    setTokens('tenant', accessToken, refreshToken, slug);
    localStorage.setItem('current_tenant_slug', slug);
    return data;
  },
  
  logout: (slug: string) => {
    clearTokens('tenant', slug);
    localStorage.removeItem('current_tenant_slug');
  },
  
  isAuthenticated: (slug: string) => !!localStorage.getItem(`tenant_${slug}_access_token`)
};

// Public API
export const publicApi = {
  get: <T>(path: string) => fetchWithAuth<T>(path, 'GET', 'public'),
  post: <T>(path: string, body?: unknown) => fetchWithAuth<T>(path, 'POST', 'public', undefined, body),
  
  checkTenantExists: async (slug: string) => {
    return publicApi.get<{ exists: boolean }>(`/tenants/${slug}/exists`);
  }
};