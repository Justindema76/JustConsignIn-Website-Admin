import { supabaseUserRest } from '../../_lib/supabase.js';
import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';

const SITE_KEY = 'sunwings';

async function parseSupabase(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || fallback);
  return data;
}

async function integration(token) {
  const rows = await parseSupabase(
    await supabaseUserRest(token, `sunwings_integrations?site_key=eq.${SITE_KEY}&provider=eq.facebook&select=*`, { method: 'GET' }),
    'Unable to load Facebook integration.',
  );
  return rows?.[0] || null;
}

async function cached(token, limit = 12) {
  return parseSupabase(
    await supabaseUserRest(
      token,
      `sunwings_social_posts?site_key=eq.${SITE_KEY}&provider=eq.facebook&select=external_id,message,image_url,permalink_url,published_at,synced_at&order=published_at.desc&limit=${limit}`,
      { method: 'GET' },
    ),
    'Unable to load cached Facebook posts.',
  );
}

async function syncFacebook(token, row) {
  const config = row?.config || {};
  const secrets = row?.secrets || {};
  if (!row?.enabled) throw new Error('Facebook website feed is not enabled.');
  if (!config.page_id || !config.graph_version || !secrets.page_access_token) throw new Error('Facebook connection is incomplete.');

  const limit = Math.min(Math.max(Number(config.display_limit || 6), 1), 12);
  const fields = 'id,message,created_time,permalink_url,full_picture';
  const url = `https://graph.facebook.com/${encodeURIComponent(config.graph_version)}/${encodeURIComponent(config.page_id)}/posts?fields=${encodeURIComponent(fields)}&limit=${limit}&access_token=${encodeURIComponent(secrets.page_access_token)}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data?.error?.message || 'Facebook sync failed.');

  const includeText = String(config.include_text_only ?? 'true') !== 'false';
  const posts = (data.data || [])
    .filter(post => includeText || post.full_picture)
    .map(post => ({
      site_key: SITE_KEY,
      provider: 'facebook',
      external_id: String(post.id),
      message: post.message || '',
      image_url: post.full_picture || '',
      permalink_url: post.permalink_url || '',
      published_at: post.created_time || null,
      synced_at: new Date().toISOString(),
      raw: post,
    }));

  if (posts.length) {
    await parseSupabase(
      await supabaseUserRest(token, 'sunwings_social_posts?on_conflict=site_key,provider,external_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(posts),
      }),
      'Unable to cache Facebook posts.',
    );
  }

  return posts;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  try {
    const row = await integration(owner.accessToken);
    const limit = Math.min(Math.max(Number(row?.config?.display_limit || 6), 1), 12);

    if (req.method === 'POST') {
      const posts = await syncFacebook(owner.accessToken, row);
      return res.status(200).json({ ok: true, count: posts.length, posts });
    }

    const posts = await cached(owner.accessToken, limit);
    return res.status(200).json({ enabled: Boolean(row?.enabled), posts: posts || [] });
  } catch (error) {
    console.error('[sunwings] facebook posts failed', error);
    return res.status(500).json({ error: error.message || 'Facebook posts request failed.' });
  }
}
