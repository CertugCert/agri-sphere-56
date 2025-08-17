export const API_URL = import.meta.env.VITE_API_URL || "/api";

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

function getTokens() {
  return {
    access: localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token'),
  };
}

function setTokens(access?: string, refresh?: string) {
  if (access) localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

async function refreshToken() {
  const { refresh } = getTokens();
  if (!refresh) throw new Error('No refresh token');
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken as string;
}

async function fetchWithAuth<T>(path: string, method: HttpMethod, body?: unknown): Promise<T> {
  const url = `${API_URL}${path}`;
  const tokens = getTokens();
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
  if (res.status === 401 && tokens.refresh) {
    try {
      const newAccess = await refreshToken();
      res = await doFetch(newAccess);
    } catch {
      // fall through; caller should handle 401
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Erro desconhecido' } }));
    throw err;
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => fetchWithAuth<T>(path, 'GET'),
  post: <T>(path: string, body?: unknown) => fetchWithAuth<T>(path, 'POST', body),
  put: <T>(path: string, body?: unknown) => fetchWithAuth<T>(path, 'PUT', body),
  delete: <T>(path: string) => fetchWithAuth<T>(path, 'DELETE'),
};
