const SESSION_KEY = 'justconsignin-website-admin-session-v1';
const TOKEN_KEY = 'justconsignin-website-admin-access-token-v1';
const REFRESH_KEY = 'justconsignin-website-admin-refresh-token-v1';

export function currentAccessToken(fallback = '') {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(TOKEN_KEY) || fallback;
}

function persistRefreshedSession(payload = {}) {
  if (typeof window === 'undefined') return;
  if (payload.accessToken) localStorage.setItem(TOKEN_KEY, payload.accessToken);
  if (payload.refreshToken) localStorage.setItem(REFRESH_KEY, payload.refreshToken);
  if (payload.user) localStorage.setItem(SESSION_KEY, JSON.stringify(payload.user));
  window.dispatchEvent(new CustomEvent('jci-admin-session-refreshed', { detail: payload }));
}

export async function refreshAdminAccessToken() {
  if (typeof window === 'undefined') return '';
  const refreshToken = localStorage.getItem(REFRESH_KEY) || '';
  if (!refreshToken) return '';

  const response = await fetch('/api/auth/refresh?admin=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.accessToken) return '';
  persistRefreshedSession(payload);
  return payload.accessToken;
}

export async function adminFetch(url, options = {}, accessToken = '') {
  const makeRequest = token => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  let response = await makeRequest(currentAccessToken(accessToken));
  if (response.status !== 401) return response;

  const refreshed = await refreshAdminAccessToken();
  if (!refreshed) return response;
  return makeRequest(refreshed);
}

export async function parseJsonResponse(response, fallbackMessage = 'Request failed') {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || fallbackMessage);
  return payload;
}
