import { requireSiteAccess } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { SITE_KEY, TABLES, parseSupabase } from './_lib/content.js';

// Website-wide text and contact details the public site reads on load.
export const ALLOWED_KEYS = new Set([
  'site_name',
  'tagline',
  'topbar_message',
  'hero_title',
  'hero_highlight',
  'hero_text',
  'hero_image',
  'hero_badge_title',
  'hero_badge_text',
  'phone',
  'email',
  'hours',
  'service_areas',
  'footer_note',
  'supplier_url',
]);

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const access = await requireSiteAccess(req, res, SITE_KEY);
  if (!access) return;
  if (req.method === 'POST' && !['owner', 'admin'].includes(access.role)) {
    return res.status(403).json({ error: 'Only the site owner or an admin can change website settings.' });
  }

  try {
    if (req.method === 'GET') {
      const rows = await parseSupabase(
        await supabaseUserRest(access.accessToken, `${TABLES.settings}?site_key=eq.${SITE_KEY}&select=key,value,updated_at&order=key.asc`, { method: 'GET' }),
        'Unable to load Rent & Rally settings.',
      );
      return res.status(200).json({ settings: Object.fromEntries((rows || []).map(row => [row.key, row.value])) });
    }

    const input = req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : (req.body || {});
    const rows = Object.entries(input)
      .filter(([key]) => ALLOWED_KEYS.has(key))
      .map(([key, value]) => ({ site_key: SITE_KEY, key, value: String(value ?? '').slice(0, 4000), updated_at: new Date().toISOString() }));
    if (!rows.length) return res.status(400).json({ error: 'No supported settings were supplied.' });

    await parseSupabase(
      await supabaseUserRest(access.accessToken, `${TABLES.settings}?on_conflict=site_key,key`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      }),
      'Unable to save Rent & Rally settings.',
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[rentrally] settings failed', error);
    return res.status(500).json({ error: error.message || 'Settings request failed.' });
  }
}
