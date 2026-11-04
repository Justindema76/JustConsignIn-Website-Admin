import { requireSiteAccess } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { parseSupabase } from './_lib/content.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireSiteAccess(req, res, 'sunwings');
  if (!user) return;
  try {
    const events = await parseSupabase(
      await supabaseUserRest(
        user.accessToken,
        'sunwings_phone_events?site_key=eq.sunwings&select=id,created_at,page_path,button_location,destination,referrer_host,utm_source,utm_medium,utm_campaign&order=created_at.desc&limit=1000',
        { method: 'GET' },
      ),
      'Unable to load Sunwings phone events.',
    );
    return res.status(200).json({ events });
  } catch (error) {
    console.error('[sunwings] phone analytics failed', error);
    return res.status(500).json({ error: 'Unable to load phone analytics.' });
  }
}
