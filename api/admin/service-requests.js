import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../_lib/supabase.js';

const SITE_KEY = 'justindematteis';
const STATUSES = new Set(['new', 'reviewing', 'needs_quote', 'contacted', 'discovery', 'proposal_sent', 'accepted', 'in_progress', 'complete', 'declined', 'spam']);
const SELECT = 'id,site_key,created_at,updated_at,name,email,phone,company,website,requested_service,budget_range,timeline,message,contact_consent,status,status_changed_at,routed_queue,ai_primary_service,ai_secondary_services,ai_priority,ai_summary,ai_confidence,ai_provider,ai_model,source_path,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,metadata,admin_notes,contacted_at,email_notification_attempted_at,email_notified_at,email_notification_error,assigned_department_id,assigned_department_name,assigned_department_email,assigned_at,quote_requested_at,assignment_email_sent_at,assignment_email_error,quote_number,quote_amount,last_activity,last_activity_at,next_action,next_action_due_at';

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

async function parseSupabase(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || fallback);
  return payload;
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  if (req.method === 'GET') {
    try {
      const query = `service_requests?site_key=eq.${encodeURIComponent(SITE_KEY)}&select=${encodeURIComponent(SELECT)}&order=created_at.desc&limit=500`;
      const requests = await parseSupabase(await supabaseUserRest(owner.accessToken, query, { method: 'GET' }), 'Unable to load service requests.');
      return res.status(200).json({ requests: Array.isArray(requests) ? requests : [] });
    } catch (error) {
      console.error('Service requests GET failed', error);
      return res.status(500).json({ error: 'Unable to load service requests.' });
    }
  }

  if (req.method === 'PATCH') {
    const body = readBody(req);
    const id = clean(body.id, 80);
    if (!validUuid(id)) return res.status(400).json({ error: 'A valid request ID is required.' });

    const patch = { updated_at: new Date().toISOString() };
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = clean(body.status, 30).toLowerCase();
      if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid request status.' });
      patch.status = status;
      patch.status_changed_at = new Date().toISOString();
      if (status === 'contacted') patch.contacted_at = new Date().toISOString();
    }
    if (Object.prototype.hasOwnProperty.call(body, 'adminNotes')) patch.admin_notes = clean(body.adminNotes, 8000) || null;

    if (Object.keys(patch).length === 1) return res.status(400).json({ error: 'Nothing to update.' });

    try {
      const query = `service_requests?id=eq.${encodeURIComponent(id)}&site_key=eq.${encodeURIComponent(SITE_KEY)}&select=${encodeURIComponent(SELECT)}`;
      const rows = await parseSupabase(await supabaseUserRest(owner.accessToken, query, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      }), 'Unable to update service request.');
      if (!rows?.[0]) return res.status(404).json({ error: 'Service request not found.' });
      return res.status(200).json({ request: rows[0] });
    } catch (error) {
      console.error('Service requests PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update service request.' });
    }
  }

  if (req.method === 'DELETE') {
    const body = readBody(req);
    const id = clean(body.id, 80);
    if (!validUuid(id)) return res.status(400).json({ error: 'A valid request ID is required.' });

    try {
      const query = `service_requests?id=eq.${encodeURIComponent(id)}&site_key=eq.${encodeURIComponent(SITE_KEY)}&select=id`;
      const rows = await parseSupabase(await supabaseUserRest(owner.accessToken, query, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      }), 'Unable to delete service request.');
      if (!rows?.[0]) return res.status(404).json({ error: 'Service request not found.' });
      return res.status(200).json({ ok: true, id: rows[0].id });
    } catch (error) {
      console.error('Service requests DELETE failed', error);
      return res.status(500).json({ error: 'Unable to delete service request.' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
