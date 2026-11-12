import { requireSiteAccess } from '../../_lib/websiteAdmin.js';
import { supabaseSecret, supabaseUrl, supabaseUserRest } from '../../_lib/supabase.js';
import { withPhotoUrls } from '../../_lib/sunwingsPhotos.js';

function clean(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

// Justin or Marius sends a follow-up email to a Sunwings customer (from the Jobs calendar).
// Marius can only email customers on jobs Justin has sent him.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const viewer = await requireSiteAccess(req, res, 'sunwings');
  if (!viewer) return;

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const id = clean(body.id, 80);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'A valid job is required.' });

  try {
    // Check this person can see the job, using their own sign-in.
    const sentOnly = viewer.role === 'owner' ? '' : '&forwarded_at=not.is.null';
    const check = await supabaseUserRest(viewer.accessToken, `sunwings_quote_requests?site_key=eq.sunwings&id=eq.${encodeURIComponent(id)}${sentOnly}&select=id`, { method: 'GET' });
    const rows = await check.json().catch(() => []);
    if (!check.ok || !Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'That job is not available.' });

    const key = supabaseSecret();
    const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sunwings_follow_up',
        requestId: id,
        subject: clean(body.subject, 240),
        message: clean(body.message, 8000),
        sentBy: viewer.role === 'owner' ? 'Justin' : 'Marius',
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status === 400 ? 400 : 502).json({ error: payload?.error || 'Unable to send the email.' });
    let [request] = payload.request ? await withPhotoUrls([payload.request]) : [null];
    if (request && viewer.role !== 'owner') {
      request = { ...request };
      ['admin_notes', 'commission_rate', 'commission_status', 'commission_paid_at', 'commission_paid_method', 'partner_update_unseen'].forEach(field => { delete request[field]; });
    }
    return res.status(200).json({ ok: true, request });
  } catch (error) {
    console.error('[sunwings] follow-up failed', error);
    return res.status(502).json({ error: 'Unable to send the email.' });
  }
}
