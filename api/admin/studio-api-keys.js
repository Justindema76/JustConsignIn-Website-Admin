import crypto from 'node:crypto';
import { supabaseUserRest } from '../_lib/supabase.js';
import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';

// Keys for the Shopify Studio content API (Supabase function "studio-api", used by ChatGPT).
// Owner only. A new key is returned ONCE; only its SHA-256 hash and last 4 characters are stored.
const FIELDS = 'id,label,key_hint,scopes,created_at,last_used_at,revoked_at';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireWebsiteOwner(req, res);
  if (!user) return;
  try {
    if (req.method === 'GET') {
      const response = await supabaseUserRest(user.accessToken, `studio_api_keys?site_key=eq.shopifystudio&select=${FIELDS}&order=created_at.desc`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load API keys');
      return res.status(200).json({ keys: data });
    }
    if (req.method === 'POST' && req.body?.action === 'create') {
      const key = `ss_${crypto.randomBytes(32).toString('base64url')}`;
      const row = {
        site_key: 'shopifystudio',
        label: String(req.body?.label || 'ChatGPT').trim().slice(0, 80) || 'ChatGPT',
        key_hash: crypto.createHash('sha256').update(key).digest('hex'),
        key_hint: key.slice(-4),
      };
      const response = await supabaseUserRest(user.accessToken, 'studio_api_keys', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to create API key');
      return res.status(200).json({ key, record: Array.isArray(data) ? data[0] : data });
    }
    if (req.method === 'POST' && req.body?.action === 'revoke') {
      const id = String(req.body?.id || '').trim();
      if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: 'Invalid key id' });
      const response = await supabaseUserRest(user.accessToken, `studio_api_keys?id=eq.${id}&site_key=eq.shopifystudio`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: new Date().toISOString() }) });
      if (!response.ok) throw new Error('Unable to revoke API key');
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'API key request failed' });
  }
}
