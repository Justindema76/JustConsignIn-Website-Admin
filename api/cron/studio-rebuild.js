import { supabaseSecret, supabaseUrl } from '../_lib/supabase.js';
import { rebuildStudioSite } from '../_lib/studioRebuild.js';

// Runs every hour (vercel.json → crons). If a scheduled Shopify Tip went live in the last hour,
// rebuild justindematteis.com so the tip gets its SEO page, schema and sitemap entry.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const fromVercelCron = /vercel-cron/i.test(req.headers['user-agent'] || '');
  if (secret ? auth !== `Bearer ${secret}` : !fromVercelCron) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const key = supabaseSecret();
    const now = new Date();
    const since = new Date(now.getTime() - 65 * 60 * 1000).toISOString();
    const query = `blog_posts?site_key=eq.shopifystudio&status=eq.published&published_at=gt.${encodeURIComponent(since)}&published_at=lte.${encodeURIComponent(now.toISOString())}&select=slug`;
    const response = await fetch(`${supabaseUrl()}/rest/v1/${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const live = await response.json().catch(() => []);
    if (!response.ok) return res.status(502).json({ error: 'Unable to check Shopify Tips.' });
    if (!Array.isArray(live) || !live.length) return res.status(200).json({ rebuilt: false, wentLive: 0 });
    const result = await rebuildStudioSite(`scheduled tips live: ${live.map(p => p.slug).join(', ')}`);
    return res.status(200).json({ rebuilt: result.triggered, wentLive: live.length });
  } catch (error) {
    console.error('[studio] rebuild cron failed', error);
    return res.status(500).json({ error: 'Rebuild check failed.' });
  }
}
