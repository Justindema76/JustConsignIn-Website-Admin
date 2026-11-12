import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';
import { supabaseAnon, supabaseUrl } from '../../_lib/supabase.js';
import { withPhotoUrls } from '../../_lib/sunwingsPhotos.js';

function clean(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

// Justin sends a follow-up email to a Sunwings customer (from the Job Calendar).
// The email itself goes out through the send-site-email function, which re-checks it's Justin.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  try {
    const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
      method: 'POST',
      headers: { apikey: supabaseAnon(), Authorization: `Bearer ${owner.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sunwings_follow_up',
        requestId: clean(body.id, 80),
        subject: clean(body.subject, 240),
        message: clean(body.message, 8000),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status === 400 ? 400 : 502).json({ error: payload?.error || 'Unable to send the email.' });
    const [request] = payload.request ? await withPhotoUrls([payload.request]) : [null];
    return res.status(200).json({ ok: true, request });
  } catch (error) {
    console.error('[sunwings] follow-up failed', error);
    return res.status(502).json({ error: 'Unable to send the email.' });
  }
}
