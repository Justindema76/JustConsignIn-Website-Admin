import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../_lib/supabase.js';

const STATUSES = new Set(['new', 'reviewing', 'contacted', 'demo', 'accepted', 'waitlist', 'installed', 'active', 'completed', 'declined']);
const SELECT = 'id,created_at,updated_at,first_name,last_name,business_name,email,phone,business_website,shopify_store_url,shopify_status,monthly_item_volume,current_system,biggest_problem,beta_goal,source_path,referrer,source_tag,utm_source,utm_medium,utm_campaign,utm_content,utm_term,contact_consent,marketing_consent,status,admin_notes,contacted_at,accepted_at,installed_at,email_notified_at,email_notification_error,metadata';

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function clean(value, max = 8000) {
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
      const response = await supabaseUserRest(
        owner.accessToken,
        `beta_applications?select=${encodeURIComponent(SELECT)}&order=created_at.desc&limit=500`,
        { method: 'GET' },
      );
      if (!response.ok) {
        console.error('Unable to load beta applications', response.status, await response.text().catch(() => ''));
        return res.status(500).json({ error: 'Unable to load beta applications.' });
      }
      const applications = await response.json();
      return res.status(200).json({ applications: Array.isArray(applications) ? applications : [] });
    } catch (error) {
      console.error('Beta applications admin GET failed', error);
      return res.status(500).json({ error: 'Unable to load beta applications.' });
    }
  }

  if (req.method === 'PATCH') {
    const body = readBody(req);
    const id = clean(body.id, 80);
    if (!validUuid(id)) return res.status(400).json({ error: 'A valid application ID is required.' });

    const patch = { updated_at: new Date().toISOString() };
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = clean(body.status, 30).toLowerCase();
      if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid application status.' });
      patch.status = status;
      if (status === 'contacted') patch.contacted_at = new Date().toISOString();
      if (status === 'accepted') patch.accepted_at = new Date().toISOString();
      if (status === 'installed') patch.installed_at = new Date().toISOString();
    }
    if (Object.prototype.hasOwnProperty.call(body, 'adminNotes')) patch.admin_notes = clean(body.adminNotes, 8000) || null;

    if (Object.keys(patch).length === 1) return res.status(400).json({ error: 'Nothing to update.' });

    try {
      const response = await supabaseUserRest(
        owner.accessToken,
        `beta_applications?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(SELECT)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        },
      );
      if (!response.ok) {
        console.error('Unable to update beta application', response.status, await response.text().catch(() => ''));
        return res.status(500).json({ error: 'Unable to update beta application.' });
      }
      const rows = await response.json();
      if (!rows?.[0]) return res.status(404).json({ error: 'Beta application not found.' });
      return res.status(200).json({ application: rows[0] });
    } catch (error) {
      console.error('Beta application admin PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update beta application.' });
    }
  }

  if (req.method === 'DELETE') {
    const body = readBody(req);
    const id = clean(body.id, 80);
    if (!validUuid(id)) return res.status(400).json({ error: 'A valid application ID is required.' });

    try {
      const response = await supabaseUserRest(
        owner.accessToken,
        `beta_applications?id=eq.${encodeURIComponent(id)}&select=id`,
        { method: 'DELETE', headers: { Prefer: 'return=representation' } },
      );
      if (!response.ok) {
        console.error('Unable to delete beta application', response.status, await response.text().catch(() => ''));
        return res.status(500).json({ error: 'Unable to delete beta application.' });
      }
      const rows = await response.json();
      if (!rows?.[0]) return res.status(404).json({ error: 'Beta application not found.' });
      return res.status(200).json({ ok: true, id: rows[0].id });
    } catch (error) {
      console.error('Beta application admin DELETE failed', error);
      return res.status(500).json({ error: 'Unable to delete beta application.' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
