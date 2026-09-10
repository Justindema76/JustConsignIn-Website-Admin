import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseAnon, supabaseUrl, supabaseUserRest } from '../_lib/supabase.js';

const EMAIL_SELECT = 'id,demo_request_id,created_at,sent_at,to_email,cc_emails,bcc_emails,from_email,subject,body_text,delivery_status,delivery_error,provider_message_id';

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

function cleanEmailList(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return values.map(item => clean(item, 320).toLowerCase()).filter(Boolean).slice(0, 10);
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  if (req.method === 'GET') {
    const requestId = clean(req.query?.requestId, 80);
    if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });

    try {
      const response = await supabaseUserRest(
        owner.accessToken,
        `demo_request_emails?demo_request_id=eq.${encodeURIComponent(requestId)}&select=${encodeURIComponent(EMAIL_SELECT)}&order=created_at.desc&limit=100`,
        { method: 'GET' },
      );
      if (!response.ok) {
        console.error('Unable to load demo request emails', response.status, await response.text().catch(() => ''));
        return res.status(500).json({ error: 'Unable to load email history.' });
      }
      const emails = await response.json();
      return res.status(200).json({ emails: Array.isArray(emails) ? emails : [] });
    } catch (error) {
      console.error('Demo request email history GET failed', error);
      return res.status(500).json({ error: 'Unable to load email history.' });
    }
  }

  if (req.method === 'POST') {
    const body = readBody(req);
    const requestId = clean(body.requestId, 80);
    const subject = clean(body.subject, 240);
    const message = clean(body.message, 12000);
    const ccEmails = cleanEmailList(body.ccEmails);
    const bccEmails = cleanEmailList(body.bccEmails);

    if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });
    if (!subject) return res.status(400).json({ error: 'Subject is required.' });
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    try {
      const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnon(),
          Authorization: `Bearer ${owner.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reply',
          requestId,
          subject,
          message,
          ccEmails,
          bccEmails,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(502).json({ error: payload?.error || 'Unable to send email.' });
      }
      return res.status(200).json(payload);
    } catch (error) {
      console.error('Demo request email send failed', error);
      return res.status(502).json({ error: 'Unable to send email.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}
