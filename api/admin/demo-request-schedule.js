import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseAnon, supabaseUrl } from '../_lib/supabase.js';

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function clean(value, max = 4000) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = readBody(req);
  const requestId = clean(body.requestId, 80);
  const scheduledAt = clean(body.scheduledAt, 100);
  const durationMinutes = Number(body.durationMinutes || 30);
  const timezone = clean(body.timezone, 100);
  const location = clean(body.location, 1000);
  const notes = clean(body.notes, 6000);

  if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) return res.status(400).json({ error: 'Choose a valid date and time.' });
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) return res.status(400).json({ error: 'Duration must be between 15 and 240 minutes.' });

  try {
    const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnon(),
        Authorization: `Bearer ${owner.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'schedule',
        requestId,
        scheduledAt,
        durationMinutes,
        timezone,
        location,
        notes,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status >= 400 && response.status < 500 ? response.status : 502)
        .json({ error: payload?.error || 'Unable to schedule demo.' });
    }
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Demo request scheduling failed', error);
    return res.status(502).json({ error: 'Unable to schedule demo.' });
  }
}
