import { customerAppEnabled, getProfile, getUserFromToken, supabaseAnon, supabaseRest, supabaseUrl, supabaseUserRest } from '../_lib/supabase.js';
import { isWebsiteOwner } from '../_lib/websiteAdmin.js';
import { rateLimit } from '../_lib/rateLimit.js';

function safeCallback(value) {
  const path = String(value || '/admin-login').trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '/admin-login';
  return path;
}

async function findCollaboratorAccess(token, email) {
  const response = await supabaseUserRest(token, `site_collaborators?email=eq.${encodeURIComponent(email)}&select=site_key,role`, { method: 'GET' });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  if (!rows?.length) return null;
  return { role: rows[0].role, sites: rows.map(row => row.site_key) };
}

async function buildSessionUser(authUser, { requireAdmin = false, token = '' } = {}) {
  const admin = isWebsiteOwner(authUser);
  let collaboratorAccess = null;

  if (requireAdmin && !admin) {
    collaboratorAccess = await findCollaboratorAccess(token, String(authUser.email || '').trim().toLowerCase());
    if (!collaboratorAccess) {
      const error = new Error('Not found');
      error.statusCode = 404;
      throw error;
    }
  }

  let profile = null;
  try {
    profile = await getProfile(authUser.id);
  } catch {
    profile = null;
  }

  if (admin || collaboratorAccess) {
    return {
      id: authUser.id,
      name: profile?.full_name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || 'Admin',
      businessName: profile?.business_name || authUser.user_metadata?.businessName || 'JustConsignIn',
      email: authUser.email,
      workspaceId: profile?.workspace_id || null,
      isAdmin: true,
      role: admin ? 'owner' : collaboratorAccess.role,
      sites: admin ? null : collaboratorAccess.sites,
    };
  }

  if (profile?.suspended) {
    const error = new Error('This account is suspended. Contact JustConsignIn support.');
    error.statusCode = 403;
    throw error;
  }

  const status = profile?.subscription_status || 'checkout_pending';
  if (!profile || !['trialing', 'active'].includes(status)) {
    const error = new Error('A valid trial or subscription is required.');
    error.statusCode = 402;
    error.billingRequired = true;
    throw error;
  }

  supabaseRest(`profiles?user_id=eq.${encodeURIComponent(authUser.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
  }).catch(() => {});

  return {
    id: authUser.id,
    name: profile?.full_name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || '',
    businessName: profile?.business_name || authUser.user_metadata?.businessName || '',
    email: authUser.email,
    workspaceId: profile?.workspace_id,
    subscriptionStatus: status,
    trialEndsAt: profile?.trial_ends_at || null,
    isAdmin: false,
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!rateLimit(req, res, { key: 'login', limit: 20, windowMs: 10 * 60_000 })) return;

  if (req.method === 'GET') {
    if (String(req.query?.provider || '').toLowerCase() === 'google') {
      if (!customerAppEnabled() && safeCallback(req.query?.callback) !== '/admin-login') {
        return res.status(404).json({ error: 'Not found' });
      }
      const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
      const protocol = forwardedProto || (String(req.headers.host || '').startsWith('localhost') ? 'http' : 'https');
      const requestOrigin = req.headers.host ? `${protocol}://${req.headers.host}` : '';
      // Admin OAuth must return to the admin host that initiated login. APP_URL belongs to the customer app
      // and must never override the website-admin callback.
      const callbackPath = safeCallback(req.query?.callback);
      const isAdminCallback = callbackPath === '/admin-login';
      const appUrl = String(isAdminCallback ? requestOrigin : (process.env.APP_URL || requestOrigin)).replace(/\/$/, '');
      const redirectTo = `${appUrl}${callbackPath}`;
      const googleScopes = [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ].join(' ');
      const authorizeUrl = `${supabaseUrl()}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&scopes=${encodeURIComponent(googleScopes)}`;
      res.statusCode = 302;
      res.setHeader('Location', authorizeUrl);
      return res.end();
    }

    if (String(req.query?.session || '') === '1') {
      const requireAdmin = String(req.query?.admin || '') === '1';
      if (!requireAdmin && !customerAppEnabled()) return res.status(404).json({ error: 'Not found' });
      const auth = String(req.headers.authorization || '');
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const authUser = await getUserFromToken(token);
      if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

      try {
        const user = await buildSessionUser(authUser, { requireAdmin, token });
        return res.status(200).json({ user });
      } catch (error) {
        return res.status(error.statusCode || 500).json({
          error: error.message || 'Unable to open session.',
          billingRequired: Boolean(error.billingRequired),
        });
      }
    }

    return res.status(400).json({ error: 'Invalid login request.' });
  }

  const { email = '', password = '', admin = false } = req.body || {};
  if (admin || !customerAppEnabled()) return res.status(404).json({ error: 'Not found' });
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const response = await fetch(`${supabaseUrl()}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: supabaseAnon(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
    const payload = await response.json();
    if (!response.ok) return res.status(401).json({ error: 'Email or password is incorrect.' });

    try {
      const user = await buildSessionUser(payload.user, { requireAdmin: Boolean(admin) });
      return res.status(200).json({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        user,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: error.message || 'Unable to log in.',
        billingRequired: Boolean(error.billingRequired),
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to log in.' });
  }
}
