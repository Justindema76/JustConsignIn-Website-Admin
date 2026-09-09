import { getUserFromToken, supabaseUserRest } from '../_lib/supabase.js';
import { isWebsiteOwner } from '../_lib/websiteAdmin.js';
import { finishMetricoolOAuth, getMetricoolTools } from '../_lib/metricoolMcp.js';

const CALLBACK_COOKIE = 'jci_metricool_callback_session';

function cookieValue(req, name) {
  const raw = String(req.headers.cookie || '');
  const parts = raw.split(';').map(part => part.trim());
  const match = parts.find(part => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

async function readRow(userToken) {
  const response = await supabaseUserRest(userToken, 'social_integrations?provider=eq.metricool&select=*&limit=1', { method: 'GET' });
  const rows = await response.json();
  if (!response.ok) throw new Error(rows?.message || 'Unable to read Metricool connection');
  return rows[0] || null;
}

async function saveRow(userToken, payload) {
  const response = await supabaseUserRest(userToken, 'social_integrations?on_conflict=provider', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || 'Unable to save Metricool connection');
  return data?.[0] || payload;
}

function redirect(res, ok, message = '') {
  const qs = new URLSearchParams(ok ? { metricool: 'connected' } : { metricool: 'error', message: String(message || '').slice(0, 240) });
  res.setHeader('Set-Cookie', `${CALLBACK_COOKIE}=; Max-Age=0; Path=/api/admin/metricool-callback; HttpOnly; SameSite=Lax; Secure`);
  res.writeHead(302, { Location: `/admin/social-automation?${qs.toString()}`, 'Cache-Control': 'no-store' });
  res.end();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (req.query?.error) return redirect(res, false, req.query.error_description || req.query.error);
    const code = String(req.query?.code || '');
    const state = String(req.query?.state || '');
    if (!code || !state) return redirect(res, false, 'Metricool did not return an authorization code');

    const userToken = cookieValue(req, CALLBACK_COOKIE);
    if (!userToken) return redirect(res, false, 'Your admin session was not available during the Metricool callback. Try connecting again.');
    const user = await getUserFromToken(userToken);
    if (!user || !isWebsiteOwner(user)) return redirect(res, false, 'Your Website Admin session expired. Sign in and connect Metricool again.');

    const row = await readRow(userToken);
    if (!row) return redirect(res, false, 'Metricool connection record is missing');
    const transaction = row.credentials?.oauthTransaction;
    if (!transaction?.state || transaction.state !== state) return redirect(res, false, 'Metricool authorization state did not match');
    if (transaction.createdAt && Date.now() - transaction.createdAt > 20 * 60 * 1000) return redirect(res, false, 'Metricool authorization expired. Try connecting again.');

    const credentials = await finishMetricoolOAuth(transaction, code);
    const { tools } = await getMetricoolTools(credentials.accessToken);
    await saveRow(userToken, {
      provider: 'metricool', connected: true, account_label: row.account_label || 'JustConsignIn',
      external_user_id: row.external_user_id || '5309805', external_brand_id: row.external_brand_id || '6893759',
      credentials,
      secret_ciphertext: '', secret_iv: '', secret_tag: '',
      metadata: { ...(row.metadata || {}), timezone: 'America/Toronto', mcp_url: 'https://ai.metricool.com/mcp', oauth: true, oauth_state: null, tool_count: tools.length },
      connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    return redirect(res, true);
  } catch (error) {
    return redirect(res, false, error.message || 'Metricool connection failed');
  }
}
