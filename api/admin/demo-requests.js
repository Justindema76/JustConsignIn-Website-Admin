import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseRest } from '../_lib/supabase.js';

const STATUSES = new Set(['new', 'contacted', 'scheduled', 'completed', 'archived']);
const SELECT = 'id,created_at,updated_at,first_name,last_name,business_name,email,phone,shopify_status,interest,message,source_path,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,status,admin_notes,contacted_at,scheduled_at,metadata';

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

  if (req.method === 'GET') {
    try {
      const response = await supabaseRest(`demo_requests?select=${encodeURIComponent(SELECT)}&order=created_at.desc&limit=500`, { method: 'GET' });
      if (!response.ok) {
        console.error('Unable to load demo requests', response.status, await response.text().catch(() => ''));
        return res.status(500).json({ error: 'Unable to load demo requests.' });
      }
      const requests = await response.json();
      return res.status(200).json({ requests: Array.isArray(requests) ? requests : [] });
    } catch (error) {
      console.error('Demo request admin GET failed', error);
      return res.status(500).json({ error: 'Unable to load demo requests.' });
    }
  }

  if (req.method === 'PATCH') {
    const body = readBody(req);
    const id = clean(body.id, 80);
    if (!validUuid(id)) return res.status(400).json({ error: 'A valid request ID is required.' });

    const patch = {};
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = clean(body.status, 30).toLowerCase();
      if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid request status.' });
      patch.status = status;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'adminNotes')) patch.admin_notes = clean(body.adminNotes, 8000) || null;
    if (Object.prototype.hasOwnProperty.call(body, 'scheduledAt')) {
      const scheduledAt = clean(body.scheduledAt, 80);
      if (!scheduledAt) patch.scheduled_at = null;
      else {
        const parsed = new Date(scheduledAt);
        if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid scheduled date.' });
        patch.scheduled_at = parsed.toISOString();
      }
    }

    if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update.' });

    try {
      const response = await supabaseRest(`demo_requests?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(SELECT)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        console.error('Unable to update demo request', response.status, await response.text().catch(() => ''));
        return res.status(500).json({ error: 'Unable to update demo request.' });
      }
      const rows = await response.json();
      if (!rows?.[0]) return res.status(404).json({ error: 'Demo request not found.' });
      return res.status(200).json({ request: rows[0] });
    } catch (error) {
      console.error('Demo request admin PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update demo request.' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ error: 'Method not allowed.' });
}
