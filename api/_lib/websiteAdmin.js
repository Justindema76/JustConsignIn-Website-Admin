import { getUserFromToken, supabaseRest } from './supabase.js';

export const WEBSITE_OWNER_EMAIL = 'justindema76@gmail.com';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function identityProviders(user) {
  const providers = new Set();
  const primaryProvider = String(user?.app_metadata?.provider || '').trim().toLowerCase();
  if (primaryProvider) providers.add(primaryProvider);

  if (Array.isArray(user?.app_metadata?.providers)) {
    user.app_metadata.providers.forEach(provider => {
      const value = String(provider || '').trim().toLowerCase();
      if (value) providers.add(value);
    });
  }

  if (Array.isArray(user?.identities)) {
    user.identities.forEach(identity => {
      const value = String(identity?.provider || '').trim().toLowerCase();
      if (value) providers.add(value);
    });
  }

  return providers;
}

export function isWebsiteOwner(user) {
  return normalizeEmail(user?.email) === WEBSITE_OWNER_EMAIL && identityProviders(user).has('google');
}

export async function requireWebsiteOwner(req, res) {
  const authorization = String(req.headers.authorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const user = await getUserFromToken(token);

  res.setHeader('Cache-Control', 'no-store');
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  if (!isWebsiteOwner(user)) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }

  return { ...user, accessToken: token };
}

async function findCollaborator(siteKey, email) {
  const response = await supabaseRest(
    `site_collaborators?site_key=eq.${encodeURIComponent(siteKey)}&email=eq.${encodeURIComponent(email)}&select=role`,
    { method: 'GET' },
  );
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  return rows?.[0] || null;
}

// Like requireWebsiteOwner, but also accepts a site_collaborators row for
// the given site. Returns { ...user, accessToken, role: 'owner' | 'admin' | 'editor' }.
// 'owner' is always the hardcoded WEBSITE_OWNER_EMAIL (unrestricted, every site) so
// that account can never be locked out by a bad collaborator-table edit.
export async function requireSiteAccess(req, res, siteKey) {
  const authorization = String(req.headers.authorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const user = await getUserFromToken(token);

  res.setHeader('Cache-Control', 'no-store');
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  if (isWebsiteOwner(user)) {
    return { ...user, accessToken: token, role: 'owner' };
  }

  if (!identityProviders(user).has('google')) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }

  const collaborator = await findCollaborator(siteKey, normalizeEmail(user.email));
  if (!collaborator) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }

  return { ...user, accessToken: token, role: collaborator.role };
}
