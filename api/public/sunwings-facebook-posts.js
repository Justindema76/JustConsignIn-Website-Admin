import { supabaseAnon, supabaseRest, supabaseUrl } from '../_lib/supabase.js';

const SITE_KEY = 'sunwings';
const POST_FIELDS = 'external_id,message,image_url,permalink_url,published_at';

// Public posts table is readable with the public key.
async function publicPosts(limit) {
  const key = supabaseAnon();
  const response = await fetch(
    `${supabaseUrl()}/rest/v1/sunwings_social_posts?site_key=eq.${SITE_KEY}&provider=eq.facebook&select=${POST_FIELDS}&order=published_at.desc&limit=${limit}`,
    { headers: { apikey: key } },
  );
  if (!response.ok) throw new Error(`Unable to load Facebook posts (${response.status}).`);
  return response.json();
}

// The on/off switch and post count live in the private settings table (server key only).
async function feedSettings() {
  try {
    const response = await supabaseRest(`sunwings_integrations?site_key=eq.${SITE_KEY}&provider=eq.facebook&select=enabled,config`);
    if (!response.ok) {
      console.error('[sunwings] facebook feed settings unreadable', response.status, (await response.text()).slice(0, 200));
      return null;
    }
    return (await response.json())?.[0] || { enabled: false };
  } catch (error) {
    console.error('[sunwings] facebook feed settings failed', error.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const setting = await feedSettings();
    // If the settings can't be read, still show synced posts (default 6) rather than breaking the site.
    if (setting && !setting.enabled) return res.status(200).json({ enabled: false, posts: [] });
    const limit = Math.min(Math.max(Number(setting?.config?.display_limit || 6), 1), 12);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ enabled: true, posts: await publicPosts(limit) });
  } catch (error) {
    console.error('[sunwings] facebook feed failed', error.message);
    return res.status(500).json({ error: error.message || 'Unable to load Facebook feed.' });
  }
}
