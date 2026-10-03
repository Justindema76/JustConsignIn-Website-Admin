import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { parseSupabase, SITE_KEY } from './_lib/content.js';

const ALLOWED_KEYS = new Set([
  'phone',
  'email',
  'hero_title',
  'hero_description',
  'hero_image',
  'hero_cta_label',
  'hero_cta_url',
]);

export default async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  try {
    if (req.method === 'GET') {
      const rows = await parseSupabase(
        await supabaseUserRest(
          owner.accessToken,
          `sunwings_site_settings?site_key=eq.${SITE_KEY}&select=site_key,key,value,updated_at&order=key.asc`,
          { method: 'GET' },
        ),
        'Unable to load Sunwings settings.',
      );
      return res.status(200).json({ settings: Object.fromEntries((rows || []).map(row => [row.key, row.value])) });
    }

    const input = req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : (req.body || {});
    const rows = Object.entries(input)
      .filter(([key]) => ALLOWED_KEYS.has(key))
      .map(([key, value]) => ({
        site_key: SITE_KEY,
        key,
        value: String(value ?? ''),
        updated_at: new Date().toISOString(),
      }));

    if (!rows.length) return res.status(400).json({ error: 'No supported Sunwings settings were supplied.' });

    await parseSupabase(
      await supabaseUserRest(owner.accessToken, 'sunwings_site_settings?on_conflict=site_key,key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      }),
      'Unable to save Sunwings settings.',
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[sunwings] settings failed', error);
    return res.status(500).json({ error: error.message || 'Settings request failed.' });
  }
}
