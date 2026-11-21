import { supabaseUserRest } from '../../_lib/supabase.js';
import { requireSiteAccess } from '../../_lib/websiteAdmin.js';

// Price calculator settings (Admin › Price calculator). Private: stored in sunwings_integrations
// as provider 'pricing' (owner and approved collaborators only). Needs migration
// backend/migrations/20261119_sunwings_pricing_settings.sql.
const SITE_KEY = 'sunwings';

async function parseSupabase(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || fallback);
  return data;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireSiteAccess(req, res, SITE_KEY);
  if (!owner) return;
  try {
    if (req.method === 'GET') {
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, `sunwings_integrations?site_key=eq.${SITE_KEY}&provider=eq.pricing&select=config,updated_at`, { method: 'GET' }),
        'Unable to load price settings.',
      );
      return res.status(200).json({ settings: rows?.[0]?.config || null, updated_at: rows?.[0]?.updated_at || null });
    }
    const settings = req.body?.settings;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return res.status(400).json({ error: 'Settings are missing.' });
    // Only the owner can change the commission: anyone else's save keeps the saved commission.
    if (owner.role !== 'owner') {
      const saved = await parseSupabase(
        await supabaseUserRest(owner.accessToken, `sunwings_integrations?site_key=eq.${SITE_KEY}&provider=eq.pricing&select=config`, { method: 'GET' }),
        'Unable to load price settings.',
      );
      const current = saved?.[0]?.config || {};
      if (current.commission) settings.commission = current.commission;
      else delete settings.commission;
    }
    const text = JSON.stringify(settings);
    if (text.length > 50000) return res.status(400).json({ error: 'Settings are too large.' });
    const row = { site_key: SITE_KEY, provider: 'pricing', config: settings, secrets: {}, enabled: true, updated_at: new Date().toISOString() };
    await parseSupabase(
      await supabaseUserRest(owner.accessToken, 'sunwings_integrations?on_conflict=site_key,provider', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([row]),
      }),
      'Unable to save price settings. If this is the first time, run the database setup for the price calculator.',
    );
    return res.status(200).json({ ok: true, updated_at: row.updated_at });
  } catch (error) {
    console.error('[sunwings] pricing settings failed', error);
    return res.status(500).json({ error: error.message || 'Price settings request failed.' });
  }
}
