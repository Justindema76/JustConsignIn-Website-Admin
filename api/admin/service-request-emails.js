import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseRest } from '../_lib/supabase.js';
import { loadSiteEmailSettings, sendSiteEmail } from '../_lib/smtp.js';

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

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanEmailList(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(source.map(item => clean(item, 320).toLowerCase()).filter(Boolean))].slice(0, 10);
}

async function parseSupabase(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || fallback);
  return payload;
}

async function loadRequest(requestId) {
  const select = 'id,site_key,name,company,email,status,contacted_at,updated_at';
  const query = `service_requests?id=eq.${encodeURIComponent(requestId)}&site_key=eq.justindematteis&select=${encodeURIComponent(select)}&limit=1`;
  const rows = await parseSupabase(await supabaseRest(query, { method: 'GET' }), 'Unable to load service request.');
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function saveHistory(record) {
  const response = await supabaseRest('service_request_emails', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(record),
  });
  const rows = await parseSupabase(response, 'Unable to save email history.');
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function updateRequest(requestId, patch) {
  const query = `service_requests?id=eq.${encodeURIComponent(requestId)}&site_key=eq.justindematteis&select=id,status,contacted_at,updated_at`;
  const response = await supabaseRest(query, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  const rows = await parseSupabase(response, 'Unable to update service request.');
  return Array.isArray(rows) ? rows[0] || null : null;
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  if (req.method === 'GET') {
    const requestId = clean(req.query?.requestId, 80);
    if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });

    try {
      const select = 'id,service_request_id,created_at,sent_at,to_email,cc_emails,bcc_emails,from_email,subject,body_text,delivery_status,delivery_error,provider_message_id';
      const query = `service_request_emails?service_request_id=eq.${encodeURIComponent(requestId)}&select=${encodeURIComponent(select)}&order=created_at.desc&limit=200`;
      const emails = await parseSupabase(await supabaseRest(query, { method: 'GET' }), 'Unable to load email history.');
      return res.status(200).json({ emails: Array.isArray(emails) ? emails : [] });
    } catch (error) {
      console.error('Service request email history GET failed', error);
      return res.status(500).json({ error: 'Unable to load email history.' });
    }
  }

  if (req.method === 'POST') {
    const body = readBody(req);
    const requestId = clean(body.requestId, 80);
    const subject = clean(body.subject, 240);
    const message = clean(body.message, 12000);
    const cc = cleanEmailList(body.ccEmails);
    const bcc = cleanEmailList(body.bccEmails);

    if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });
    if (!subject) return res.status(400).json({ error: 'Subject is required.' });
    if (!message) return res.status(400).json({ error: 'Message is required.' });
    if ([...cc, ...bcc].some(email => !validEmail(email))) {
      return res.status(400).json({ error: 'CC and BCC must contain valid email addresses.' });
    }

    let request = null;
    let settings = null;
    const now = new Date().toISOString();

    try {
      request = await loadRequest(requestId);
      if (!request) return res.status(404).json({ error: 'Service request not found.' });

      const to = clean(request.email, 320).toLowerCase();
      if (!validEmail(to)) return res.status(400).json({ error: 'The service request does not have a valid email address.' });

      settings = await loadSiteEmailSettings('justindematteis');

      await sendSiteEmail(settings, {
        to: [to],
        cc,
        bcc,
        subject,
        text: message,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#202223">${message.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])).replace(/\n/g, '<br>')}</div>`,
      });

      const history = await saveHistory({
        service_request_id: requestId,
        sent_at: now,
        to_email: to,
        cc_emails: cc,
        bcc_emails: bcc,
        from_email: settings.smtp_from_email,
        subject,
        body_text: message,
        delivery_status: 'sent',
        delivery_error: null,
        provider_message_id: null,
        created_by: owner.id,
      });

      const patch = { updated_at: now };
      if (request.status === 'new' || request.status === 'reviewing') patch.status = 'contacted';
      if (!request.contacted_at) patch.contacted_at = now;
      const updatedRequest = await updateRequest(requestId, patch);

      return res.status(200).json({ ok: true, sent: true, email: history, request: updatedRequest });
    } catch (error) {
      const errorMessage = clean(error?.message || error, 1000) || 'Unable to send email.';

      try {
        if (request) {
          await saveHistory({
            service_request_id: requestId,
            sent_at: null,
            to_email: clean(request.email, 320).toLowerCase(),
            cc_emails: cc,
            bcc_emails: bcc,
            from_email: clean(settings?.smtp_from_email, 320).toLowerCase() || null,
            subject,
            body_text: message,
            delivery_status: 'failed',
            delivery_error: errorMessage,
            provider_message_id: null,
            created_by: owner.id,
          });
        }
      } catch (historyError) {
        console.error('Unable to save failed email history', historyError);
      }

      console.error('Service request email POST failed', error);
      return res.status(502).json({ error: errorMessage });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}
