import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseAnon, supabaseUrl, supabaseUserRest } from '../_lib/supabase.js';

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
    const requestId = clean(req.query?.requestId, 80);
    if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });

    try {
      const select = 'id,service_request_id,created_at,sent_at,to_email,cc_emails,bcc_emails,from_email,subject,body_text,attachments,delivery_status,delivery_error,provider_message_id';
      const query = `service_request_emails?service_request_id=eq.${encodeURIComponent(requestId)}&select=${encodeURIComponent(select)}&order=created_at.desc&limit=200`;
      const emails = await parseSupabase(await supabaseUserRest(owner.accessToken, query, { method: 'GET' }), 'Unable to load email history.');
      return res.status(200).json({ emails: Array.isArray(emails) ? emails : [] });
    } catch (error) {
      console.error('Service request email history GET failed', error);
      return res.status(500).json({ error: 'Unable to load email history.' });
    }
  }

  if (req.method === 'POST') {
    const body = readBody(req);
    const requestId = clean(body.requestId, 80);
    if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });

    try {
      const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnon(),
          Authorization: `Bearer ${owner.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'service_reply',
          requestId,
          subject: clean(body.subject, 240),
          message: clean(body.message, 12000),
          ccEmails: body.ccEmails || '',
          bccEmails: body.bccEmails || '',
          attachments: Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : [],
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status === 400 ? 400 : 502).json({ error: payload?.error || 'Unable to send email.' });
      return res.status(200).json(payload);
    } catch (error) {
      console.error('Service request email POST failed', error);
      return res.status(502).json({ error: 'Unable to send email.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}
