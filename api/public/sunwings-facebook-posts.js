import { supabaseRest } from '../_lib/supabase.js';

const SITE_KEY = 'sunwings';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    // Server key: the settings table isn't readable by the public (anon) key. Only safe fields are returned.
    const integration = await supabaseRest(`sunwings_integrations?site_key=eq.${SITE_KEY}&provider=eq.facebook&select=enabled,config`);
    if (!integration.ok) throw new Error('Unable to read Facebook feed settings.');
    const setting = (await integration.json())?.[0];
    if (!setting?.enabled) return res.status(200).json({ enabled: false, posts: [] });

    const limit = Math.min(Math.max(Number(setting.config?.display_limit || 6), 1), 12);
    const response = await supabaseRest(`sunwings_social_posts?site_key=eq.${SITE_KEY}&provider=eq.facebook&select=external_id,message,image_url,permalink_url,published_at&order=published_at.desc&limit=${limit}`);
    if (!response.ok) throw new Error('Unable to load Facebook posts.');

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ enabled: true, posts: await response.json() });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to load Facebook feed.' });
  }
}
