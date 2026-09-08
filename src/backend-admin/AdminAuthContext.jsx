import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SESSION_KEY = 'justconsignin-website-admin-session-v1';
const TOKEN_KEY = 'justconsignin-website-admin-access-token-v1';
const REFRESH_KEY = 'justconsignin-website-admin-refresh-token-v1';
const AdminAuthContext = createContext(null);

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(() => readJson(SESSION_KEY));
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(REFRESH_KEY) || '');
  const [checking, setChecking] = useState(true);

  const persist = ({ user: nextUser, accessToken: nextAccessToken, refreshToken: nextRefreshToken }) => {
    if (nextUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
    }
    if (nextAccessToken) {
      localStorage.setItem(TOKEN_KEY, nextAccessToken);
      setAccessToken(nextAccessToken);
    }
    if (typeof nextRefreshToken === 'string') {
      if (nextRefreshToken) localStorage.setItem(REFRESH_KEY, nextRefreshToken);
      else localStorage.removeItem(REFRESH_KEY);
      setRefreshToken(nextRefreshToken);
    }
  };

  const clear = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
    setAccessToken('');
    setRefreshToken('');
  };

  useEffect(() => {
    let active = true;

    const validateStoredSession = async () => {
      const oauthParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      if (window.location.pathname === '/admin-login' && oauthParams.has('access_token')) {
        if (active) setChecking(false);
        return;
      }

      const storedAccessToken = localStorage.getItem(TOKEN_KEY) || '';
      const storedRefreshToken = localStorage.getItem(REFRESH_KEY) || '';

      try {
        if (!storedAccessToken) throw new Error('No stored admin session.');

        let response = await fetch('/api/auth/login?session=1&admin=1', {
          headers: { Authorization: `Bearer ${storedAccessToken}` },
        });
        let payload = await response.json().catch(() => ({}));

        if (!response.ok && storedRefreshToken) {
          response = await fetch('/api/auth/refresh?admin=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          });
          payload = await response.json().catch(() => ({}));
        }

        if (!response.ok || !payload.user?.isAdmin) throw new Error('Admin session is not authorized.');
        if (active) {
          persist({
            user: payload.user,
            accessToken: payload.accessToken || storedAccessToken,
            refreshToken: payload.refreshToken || storedRefreshToken,
          });
        }
      } catch {
        if (active) clear();
      } finally {
        if (active) setChecking(false);
      }
    };

    validateStoredSession();
    return () => { active = false; };
  }, []);

  const startGoogleSignIn = () => {
    clear();
    window.location.assign('/api/auth/login?provider=google&callback=%2Fadmin-login');
  };

  const completeGoogleSession = async ({ accessToken: oauthAccessToken, refreshToken: oauthRefreshToken }) => {
    if (!oauthAccessToken) throw new Error('Missing Google session token.');
    const response = await fetch('/api/auth/login?session=1&admin=1', {
      headers: { Authorization: `Bearer ${oauthAccessToken}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Unable to open website admin session.');
    persist({ user: payload.user, accessToken: oauthAccessToken, refreshToken: oauthRefreshToken || '' });
    return payload.user;
  };

  const refreshSession = async () => {
    if (!refreshToken) return null;
    const response = await fetch('/api/auth/refresh?admin=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      clear();
      throw new Error(payload.error || 'Admin session expired.');
    }
    persist(payload);
    return payload.user;
  };

  useEffect(() => {
    if (checking || !refreshToken || !user?.isAdmin) return;
    const timer = setInterval(() => { refreshSession().catch(() => {}); }, 45 * 60_000);
    return () => clearInterval(timer);
  }, [checking, refreshToken, user?.id]);

  const value = useMemo(() => ({
    user,
    accessToken,
    refreshToken,
    checking,
    startGoogleSignIn,
    completeGoogleSession,
    refreshSession,
    signOut: clear,
  }), [user, accessToken, refreshToken, checking]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return value;
}

export const useAuth = useAdminAuth;
