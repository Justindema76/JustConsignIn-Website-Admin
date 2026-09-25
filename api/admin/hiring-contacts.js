import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../_lib/supabase.js';

const SITE_KEY = 'justindematteis';
const STATUSES = new Set(['new','reviewing','contacted','interview','closed','spam']);
const SELECT = 'id,site_key,created_at,updated_at,name,company,email,phone,website_or_linkedin,reason,role_title,message,employment_consent,status,spam_score,spam_reasons,is_spam,source_path,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,metadata,admin_notes,contacted_at,email_notification_attempted_at,email_notified_at,email_notification_error';

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
      const query = `hiring_contacts?site_key=eq.${encodeURIComponent(SITE_KEY)}&select=${encodeURIComponent(SELECT)}&order=created_at.desc&limit=500`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, { method: 'GET' }),
        'Unable to load hiring contacts.',
      );
      return res.status(200).json({ contacts: Array.isArray(rows) ? rows : [] });
    } catch (error) {
      console.error('Hiring contacts GET failed', error);
      return res.status(500).json({ error: 'Unable to load hiring contacts.' });
    }
  }

  if (req.method === 'PATCH') {
    const body = readBody(req);
    const id = clean(body.id, 80);
    if (!validUuid(id)) return res.status(400).json({ error: 'A valid contact ID is required.' });

    const patch = { updated_at: new Date().toISOString() };
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = clean(body.status, 30).toLowerCase();
      if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid hiring contact status.' });
      patch.status = status;
      patch.is_spam = status === 'spam';
      if (status === 'contacted' || status === 'interview') patch.contacted_at = new Date().toISOString();
    }
    if (Object.prototype.hasOwnProperty.call(body, 'adminNotes')) patch.admin_notes = clean(body.adminNotes, 8000) || null;

    if (Object.keys(patch).length === 1) return res.status(400).json({ error: 'Nothing to update.' });

    try {
      const query = `hiring_contacts?id=eq.${encodeURIComponent(id)}&site_key=eq.${encodeURIComponent(SITE_KEY)}&select=${encodeURIComponent(SELECT)}`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        }),
        'Unable to update hiring contact.',
      );
      if (!rows?.[0]) return res.status(404).json({ error: 'Hiring contact not found.' });
      return res.status(200).json({ contact: rows[0] });
    } catch (error) {
      console.error('Hiring contacts PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update hiring contact.' });
    }
  }

  if (req.method === 'DELETE') {
    const body = readBody(req);
    const id = clean(body.id, 80);
    if (!validUuid(id)) return res.status(400).json({ error: 'A valid contact ID is required.' });

    try {
      const query = `hiring_contacts?id=eq.${encodeURIComponent(id)}&site_key=eq.${encodeURIComponent(SITE_KEY)}&select=id`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, {
          method: 'DELETE',
          headers: { Prefer: 'return=representation' },
        }),
        'Unable to delete hiring contact.',
      );
      if (!rows?.[0]) return res.status(404).json({ error: 'Hiring contact not found.' });
      return res.status(200).json({ ok: true, id: rows[0].id });
    } catch (error) {
      console.error('Hiring contacts DELETE failed', error);
      return res.status(500).json({ error: 'Unable to delete hiring contact.' });
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
