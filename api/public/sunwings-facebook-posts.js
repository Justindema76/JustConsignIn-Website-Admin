import { supabaseAnon, supabaseUrl } from '../_lib/supabase.js';

const SITE_KEY = 'sunwings';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const key = supabaseAnon();
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    const integration = await fetch(
      `${supabaseUrl()}/rest/v1/sunwings_integrations?site_key=eq.${SITE_KEY}&provider=eq.facebook&select=enabled,config`,
      { headers },
    );
    if (!integration.ok) throw new Error('Unable to read Facebook feed settings.');
    const setting = (await integration.json())?.[0];
    if (!setting?.enabled) return res.status(200).json({ enabled: false, posts: [] });

    const limit = Math.min(Math.max(Number(setting.config?.display_limit || 6), 1), 12);
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/sunwings_social_posts?site_key=eq.${SITE_KEY}&provider=eq.facebook&select=external_id,message,image_url,permalink_url,published_at&order=published_at.desc&limit=${limit}`,
      { headers },
    );
    if (!response.ok) throw new Error('Unable to load Facebook posts.');

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ enabled: true, posts: await response.json() });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to load Facebook feed.' });
  }
}
