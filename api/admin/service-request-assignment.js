import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseAnon, supabaseUrl } from '../_lib/supabase.js';

function clean(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
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

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const requestId = clean(body.requestId, 80);
  const departmentId = clean(body.departmentId, 80);
  const note = clean(body.note, 4000);

  if (!validUuid(requestId) || !validUuid(departmentId)) {
    return res.status(400).json({ error: 'A valid request and department are required.' });
  }

  try {
    const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnon(),
        Authorization: `Bearer ${owner.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'service_assign_department',
        requestId,
        departmentId,
        note,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      return res.status(response.status || 500).json({ error: payload?.error || 'Unable to assign department.' });
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Service request department assignment failed', error);
    return res.status(500).json({ error: 'Unable to assign department.' });
  }
}
