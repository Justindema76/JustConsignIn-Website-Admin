import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { parseSupabase, SITE_KEY } from './_lib/content.js';

// Partners (e.g. Marius) who can log in and see only "Jobs from Justin". Owner only.

function clean(value, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  try {
    if (req.method === 'GET') {
      const partners = await parseSupabase(
        await supabaseUserRest(owner.accessToken, `sunwings_partners?site_key=eq.${SITE_KEY}&select=id,email,label,created_at&order=created_at.asc`, { method: 'GET' }),
        'Unable to load partners.',
      );
      return res.status(200).json({ partners });
    }
    if (req.method === 'POST') {
      const email = clean(req.body?.email).toLowerCase();
      if (!email.includes('@')) return res.status(400).json({ error: 'Enter a valid email address.' });
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, 'sunwings_partners?on_conflict=site_key,email', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify([{ site_key: SITE_KEY, email, label: clean(req.body?.label, 120) }]),
        }),
        'Unable to save partner.',
      );
      return res.status(200).json({ partner: Array.isArray(rows) ? rows[0] : rows });
    }
    if (req.method === 'DELETE') {
      const id = clean(req.query?.id, 80);
      if (!id) return res.status(400).json({ error: 'Missing partner id.' });
      const response = await supabaseUserRest(owner.accessToken, `sunwings_partners?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!response.ok) throw new Error('Unable to remove partner.');
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[sunwings] partners failed', error);
    return res.status(500).json({ error: error.message || 'Partners request failed.' });
  }
}
