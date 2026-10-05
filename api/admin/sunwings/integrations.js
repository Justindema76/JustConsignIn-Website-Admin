import { supabaseUserRest } from '../../_lib/supabase.js';
import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';

const SITE_KEY = 'sunwings';
const PROVIDERS = new Set(['google_reviews', 'facebook']);

async function parseSupabase(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || fallback);
  return data;
}

function publicRow(row) {
  const secrets = row?.secrets || {};
  return {
    provider: row.provider,
    config: row.config || {},
    enabled: Boolean(row.enabled),
    secretConfigured: Object.fromEntries(Object.keys(secrets).map(key => [key, Boolean(secrets[key])])),
    last_tested_at: row.last_tested_at || null,
    last_test_ok: row.last_test_ok ?? null,
    last_test_message: row.last_test_message || '',
    updated_at: row.updated_at || null,
  };
}

async function getRow(token, provider) {
  const rows = await parseSupabase(
    await supabaseUserRest(token, `sunwings_integrations?site_key=eq.${SITE_KEY}&provider=eq.${provider}&select=*`, { method: 'GET' }),
    'Unable to load integration.',
  );
  return rows?.[0] || null;
}

async function testGoogle(config, secrets) {
  if (!config.place_id) throw new Error('Google Place ID is required.');
  if (!secrets.api_key) throw new Error('Google Places API key is required.');
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(config.place_id)}`, {
    headers: { 'X-Goog-Api-Key': secrets.api_key, 'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || 'Google connection failed.');
  return { message: `Connected to ${data.displayName?.text || 'Google Business Profile'} · ${data.userRatingCount || 0} ratings`, preview: data };
}

async function testFacebook(config, secrets) {
  if (!config.page_id) throw new Error('Facebook Page ID is required.');
  if (!config.graph_version) throw new Error('Meta Graph API version is required.');
  if (!secrets.page_access_token) throw new Error('Facebook Page access token is required.');
  const fields = 'id,name,posts.limit(3){id,message,created_time,permalink_url,full_picture}';
  const url = `https://graph.facebook.com/${encodeURIComponent(config.graph_version)}/${encodeURIComponent(config.page_id)}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(secrets.page_access_token)}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data?.error?.message || 'Facebook connection failed.');
  return { message: `Connected to ${data.name || 'Facebook Page'} · recent posts available`, preview: data };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  try {
    if (req.method === 'GET') {
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, `sunwings_integrations?site_key=eq.${SITE_KEY}&select=*&order=provider.asc`, { method: 'GET' }),
        'Unable to load integrations.',
      );
      return res.status(200).json({ integrations: (rows || []).map(publicRow) });
    }

    const body = req.body || {};
    const provider = String(body.provider || '');
    if (!PROVIDERS.has(provider)) return res.status(400).json({ error: 'Unsupported integration provider.' });

    const existing = await getRow(owner.accessToken, provider);
    const config = { ...(existing?.config || {}), ...(body.config || {}) };
    const secrets = { ...(existing?.secrets || {}) };
    for (const [key, value] of Object.entries(body.secrets || {})) {
      if (String(value || '').trim()) secrets[key] = String(value).trim();
    }

    let testResult = null;
    if (body.action === 'test') {
      testResult = provider === 'google_reviews' ? await testGoogle(config, secrets) : await testFacebook(config, secrets);
    }

    const row = {
      site_key: SITE_KEY,
      provider,
      config,
      secrets,
      enabled: Boolean(body.enabled),
      last_tested_at: testResult ? new Date().toISOString() : (existing?.last_tested_at || null),
      last_test_ok: testResult ? true : (existing?.last_test_ok ?? null),
      last_test_message: testResult?.message || (existing?.last_test_message || ''),
      updated_at: new Date().toISOString(),
    };

    await parseSupabase(
      await supabaseUserRest(owner.accessToken, 'sunwings_integrations?on_conflict=site_key,provider', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([row]),
      }),
      'Unable to save integration.',
    );

    return res.status(200).json({ ok: true, integration: publicRow(row), preview: testResult?.preview || null });
  } catch (error) {
    console.error('[sunwings] integration request failed', error);
    return res.status(500).json({ error: error.message || 'Integration request failed.' });
  }
}
