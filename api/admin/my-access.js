import { getUserFromToken, supabaseUserRest } from '../_lib/supabase.js';
import { isWebsiteOwner } from '../_lib/websiteAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authorization = String(req.headers.authorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const user = await getUserFromToken(token);

  res.setHeader('Cache-Control', 'no-store');
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (isWebsiteOwner(user)) {
    return res.status(200).json({ role: 'owner', sites: [] });
  }

  try {
    const email = String(user.email || '').trim().toLowerCase();
    const response = await supabaseUserRest(token, `site_collaborators?email=eq.${encodeURIComponent(email)}&select=site_key,role`, { method: 'GET' });
    const rows = response.ok ? await response.json().catch(() => []) : [];
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ role: rows[0].role, sites: rows.map(row => row.site_key) });
  } catch (error) {
    console.error('[my-access] failed', error);
    return res.status(500).json({ error: 'Unable to load access.' });
  }
}
