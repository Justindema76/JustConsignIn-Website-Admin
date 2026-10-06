import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseRest } from '../_lib/supabase.js';

const ROLES = new Set(['admin', 'editor']);
const SELECT = 'id,site_key,email,role,label,created_at';

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function clean(value, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function parseSupabase(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || fallback);
  return payload;
}

export default async function handler(req, res) {
  // Only the true owner can manage who else has access.
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  try {
    if (req.method === 'GET') {
      const siteKey = clean(req.query?.site, 60);
      if (!siteKey) return res.status(400).json({ error: 'Missing site.' });
      const rows = await parseSupabase(
        await supabaseRest(`site_collaborators?site_key=eq.${encodeURIComponent(siteKey)}&select=${encodeURIComponent(SELECT)}&order=created_at.asc`, { method: 'GET' }),
        'Unable to load collaborators.',
      );
      return res.status(200).json({ collaborators: rows });
    }

    if (req.method === 'DELETE') {
      const id = clean(req.query?.id, 60);
      if (!validUuid(id)) return res.status(400).json({ error: 'Invalid collaborator id.' });
      await parseSupabase(
        await supabaseRest(`site_collaborators?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }),
        'Unable to remove collaborator.',
      );
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      const siteKey = clean(body.siteKey, 60);
      const email = clean(body.email, 300).toLowerCase();
      const role = clean(body.role, 20);
      const label = clean(body.label, 120);

      if (!siteKey) return res.status(400).json({ error: 'Missing site.' });
      if (!email || !email.includes('@')) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (!ROLES.has(role)) return res.status(400).json({ error: 'Invalid role.' });

      const rows = await parseSupabase(
        await supabaseRest('site_collaborators?on_conflict=site_key,email', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify([{ site_key: siteKey, email, role, label }]),
        }),
        'Unable to save collaborator.',
      );
      return res.status(200).json({ collaborator: Array.isArray(rows) ? rows[0] : rows });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[collaborators] request failed', error);
    return res.status(500).json({ error: error.message || 'Collaborator request failed.' });
  }
}
