import { supabaseRest } from '../_lib/supabase.js';
import { decryptSecret, encryptSecret, finishMetricoolOAuth, getMetricoolTools } from '../_lib/metricoolMcp.js';

async function readRow() {
  const response = await supabaseRest('social_integrations?provider=eq.metricool&select=*&limit=1', { method: 'GET' });
  const rows = await response.json();
  if (!response.ok) throw new Error(rows?.message || 'Unable to read Metricool connection');
  return rows[0] || null;
}

async function saveRow(payload) {
  const response = await supabaseRest('social_integrations?on_conflict=provider', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || 'Unable to save Metricool connection');
  return data?.[0] || payload;
}

function redirect(res, ok, message = '') {
  const qs = new URLSearchParams(ok ? { metricool: 'connected' } : { metricool: 'error', message: String(message || '').slice(0, 240) });
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
    const row = await readRow();
    if (!row) return redirect(res, false, 'Metricool connection record is missing');
    const secret = JSON.parse(decryptSecret(row) || '{}');
    const transaction = secret.oauthTransaction;
    if (!transaction?.state || transaction.state !== state) return redirect(res, false, 'Metricool authorization state did not match');
    if (transaction.createdAt && Date.now() - transaction.createdAt > 20 * 60 * 1000) return redirect(res, false, 'Metricool authorization expired. Try connecting again.');

    const credentials = await finishMetricoolOAuth(transaction, code);
    const { tools } = await getMetricoolTools(credentials.accessToken);
    const encrypted = encryptSecret(JSON.stringify(credentials));
    await saveRow({
      provider: 'metricool', connected: true, account_label: row.account_label || 'JustConsignIn',
      external_user_id: row.external_user_id || '5309805', external_brand_id: row.external_brand_id || '6893759',
      ...encrypted,
      metadata: { ...(row.metadata || {}), timezone: 'America/Toronto', mcp_url: 'https://ai.metricool.com/mcp', oauth: true, oauth_state: null, tool_count: tools.length },
      connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    return redirect(res, true);
  } catch (error) {
    return redirect(res, false, error.message || 'Metricool connection failed');
  }
}
