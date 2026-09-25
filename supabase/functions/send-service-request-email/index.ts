import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@^9';

const OWNER_EMAIL = 'justindema76@gmail.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

function readKey(legacyName: string, modernName: string) {
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  try {
    const parsed = JSON.parse(Deno.env.get(modernName) || '{}');
    return parsed.default || Object.values(parsed)[0] || '';
  } catch {
    return '';
  }
}

const SERVICE_KEY = readKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
const ANON_KEY = readKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS');
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function clean(value: unknown, max = 4000) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch] || ch));
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmailList(value: unknown) {
  const input = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(input.map(item => clean(item, 320).toLowerCase()).filter(Boolean))].slice(0, 10);
}

async function requireOwner(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user || clean(data.user.email, 254).toLowerCase() !== OWNER_EMAIL) return null;
  return { user: data.user, token };
}

function userClient(token: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function loadSettings() {
  const { data, error } = await admin.rpc('service_get_email_settings');
  if (error) throw new Error(`Unable to load email settings: ${error.message}`);
  const settings = Array.isArray(data) ? data[0] : data;
  if (!settings?.enabled) throw new Error('Email notifications are disabled in Website Admin.');
  for (const key of ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_from_email', 'smtp_password']) {
    if (!settings[key]) throw new Error(`Email setting ${key} is not configured.`);
  }
  return settings;
}

function transportFor(settings: any) {
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: Number(settings.smtp_port),
    secure: Boolean(settings.smtp_secure),
    auth: { user: settings.smtp_username, pass: settings.smtp_password },
  });
}

function recipientsFor(settings: any, eventKey: string) {
  const routes = Array.isArray(settings.notification_routes) ? settings.notification_routes : [];
  const selected = routes.filter((route: any) => {
    const routeEvent = clean(route?.eventKey, 60).toLowerCase();
    return route?.enabled !== false && (routeEvent === eventKey || routeEvent === 'all') && clean(route?.email, 320);
  });
  const unique = (type: string) => [...new Set(selected
    .filter((route: any) => clean(route?.recipientType, 10).toLowerCase() === type)
    .map((route: any) => clean(route?.email, 320).toLowerCase()))];

  let to = unique('to');
  const cc = unique('cc').filter((email: string) => !to.includes(email));
  const bcc = unique('bcc').filter((email: string) => !to.includes(email) && !cc.includes(email));

  // Keep the existing primary notification address as a safe fallback until
  // a Service Requests route is explicitly configured in Website Admin.
  if (!to.length && clean(settings.notification_email, 320)) {
    to = [clean(settings.notification_email, 320).toLowerCase()];
  }
  if (!to.length) throw new Error(`No To recipient is configured for ${eventKey}.`);
  return { to, cc, bcc };
}

function fromAddress(settings: any) {
  return settings.smtp_from_name
    ? `"${clean(settings.smtp_from_name, 120).replace(/["\r\n]/g, '')}" <${settings.smtp_from_email}>`
    : settings.smtp_from_email;
}

function serviceRequestMessage(record: any, settings: any) {
  const display = (value: unknown) => clean(value, 3000) || 'Not provided';
  const business = clean(record.company, 160) || 'No company';
  const service = clean(record.ai_primary_service || record.requested_service, 100) || 'Other';
  const secondary = Array.isArray(record.ai_secondary_services) ? record.ai_secondary_services.join(', ') : '';
  const campaign = [record.utm_source, record.utm_medium, record.utm_campaign].filter(Boolean).join(' / ') || 'Not provided';
  const row = (label: string, value: unknown) => `<tr><td style="padding:8px 12px;color:#6d7175;font-weight:700;vertical-align:top;width:150px">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#202223;vertical-align:top">${escapeHtml(display(value))}</td></tr>`;

  const text = [
    'New Service Request', '',
    `Name: ${display(record.name)}`,
    `Company: ${business}`,
    `Email: ${display(record.email)}`,
    `Phone: ${display(record.phone)}`,
    `Requested service: ${display(record.requested_service)}`,
    `AI route: ${service}`,
    secondary ? `Secondary: ${secondary}` : '',
    `Priority: ${display(record.ai_priority)}`,
    `Budget: ${display(record.budget_range)}`,
    `Timeline: ${display(record.timeline)}`,
    `AI summary: ${display(record.ai_summary)}`, '',
    'Project request:', display(record.message), '',
    `Campaign: ${campaign}`,
    'This request is also saved in Website Admin → Service Requests.',
  ].filter(Boolean).join('\n');

  const html = `<div style="font-family:Arial,sans-serif;background:#f5f6f8;padding:24px;color:#202223"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #dfe3e8;border-radius:14px;overflow:hidden"><div style="background:#1f67b2;color:#fff;padding:20px 24px"><div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.85">Justin DeMatteis</div><h1 style="margin:5px 0 0;font-size:24px">New Service Request</h1></div><div style="padding:20px 12px"><table role="presentation" style="width:100%;border-collapse:collapse">${row('Name', record.name)}${row('Company', business)}${row('Email', record.email)}${row('Phone', record.phone)}${row('Requested service', record.requested_service)}${row('AI route', service)}${row('Secondary', secondary)}${row('Priority', record.ai_priority)}${row('Budget', record.budget_range)}${row('Timeline', record.timeline)}${row('Campaign', campaign)}</table><div style="margin:16px 12px 4px;padding:16px;background:#f7f9fb;border-radius:10px"><strong style="display:block;margin-bottom:8px">AI summary</strong><div style="line-height:1.55">${escapeHtml(display(record.ai_summary))}</div></div><div style="margin:12px;padding:16px;background:#f7f9fb;border-radius:10px"><strong style="display:block;margin-bottom:8px">Project request</strong><div style="white-space:pre-wrap;line-height:1.55">${escapeHtml(display(record.message))}</div></div><p style="margin:18px 12px 4px;color:#6d7175;font-size:13px">Reply to this email to respond directly to ${escapeHtml(display(record.name))}. The request is saved in Website Admin → Service Requests.</p></div></div></div>`;

  return {
    from: fromAddress(settings),
    ...recipientsFor(settings, 'service_request'),
    replyTo: record.email,
    subject: `New Service Request — ${business} — ${display(record.name)}`,
    text,
    html,
  };
}

async function sendNotification(body: any) {
  const requestId = clean(body.requestId, 80);
  const notificationToken = clean(body.notificationToken, 80);
  if (!validUuid(requestId) || !validUuid(notificationToken)) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: record, error } = await admin
    .from('service_requests')
    .select('id,site_key,name,email,phone,company,requested_service,budget_range,timeline,message,ai_primary_service,ai_secondary_services,ai_priority,ai_summary,utm_source,utm_medium,utm_campaign,notification_token,email_notified_at')
    .eq('id', requestId)
    .eq('site_key', 'justindematteis')
    .maybeSingle();

  if (error) {
    console.error('Service request notification lookup failed', error.message);
    return Response.json({ error: 'Unable to load service request.' }, { status: 500 });
  }
  if (!record || String(record.notification_token) !== notificationToken) return Response.json({ error: 'Not found' }, { status: 404 });
  if (record.email_notified_at) return Response.json({ ok: true, alreadySent: true });

  await admin.from('service_requests').update({ email_notification_attempted_at: new Date().toISOString(), email_notification_error: null }).eq('id', requestId);

  try {
    const settings = await loadSettings();
    await transportFor(settings).sendMail(serviceRequestMessage(record, settings));
    await admin.from('service_requests').update({ email_notified_at: new Date().toISOString(), email_notification_error: null }).eq('id', requestId);
    return Response.json({ ok: true, sent: true });
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : error, 1000) || 'Email delivery failed.';
    await admin.from('service_requests').update({ email_notification_error: message }).eq('id', requestId);
    console.error('Service request notification failed', message);
    return Response.json({ error: message }, { status: 502 });
  }
}

async function ownerRequest(ownerAuth: any, requestId: string) {
  const client = userClient(ownerAuth.token);
  const { data, error } = await client
    .from('service_requests')
    .select('id,site_key,name,company,email,status,contacted_at')
    .eq('id', requestId)
    .eq('site_key', 'justindematteis')
    .maybeSingle();

  if (error) {
    console.error('Owner service request lookup failed', error.message);
    return { record: null, error: 'Unable to load service request.' };
  }
  if (!data) return { record: null, error: 'Service request not found.' };
  return { record: data, error: null };
}

async function saveEmailHistory(values: any) {
  const { data, error } = await admin
    .from('service_request_emails')
    .insert(values)
    .select('id,service_request_id,created_at,sent_at,to_email,cc_emails,bcc_emails,from_email,subject,body_text,delivery_status,delivery_error,provider_message_id')
    .single();
  if (error) console.error('Unable to save service request email history', error.message);
  return { data, error };
}

async function sendReply(req: Request, body: any) {
  const ownerAuth = await requireOwner(req);
  if (!ownerAuth) return Response.json({ error: 'Not found' }, { status: 404 });

  const requestId = clean(body.requestId, 80);
  const subject = clean(body.subject, 240);
  const message = clean(body.message, 12000);
  const cc = normalizeEmailList(body.ccEmails);
  const bcc = normalizeEmailList(body.bccEmails);

  if (!validUuid(requestId)) return Response.json({ error: 'A valid request ID is required.' }, { status: 400 });
  if (!subject) return Response.json({ error: 'Subject is required.' }, { status: 400 });
  if (!message) return Response.json({ error: 'Message is required.' }, { status: 400 });
  if ([...cc, ...bcc].some(email => !validEmail(email))) return Response.json({ error: 'CC and BCC must contain valid email addresses.' }, { status: 400 });

  const lookup = await ownerRequest(ownerAuth, requestId);
  if (!lookup.record) return Response.json({ error: lookup.error }, { status: lookup.error === 'Service request not found.' ? 404 : 500 });
  const record: any = lookup.record;

  const to = clean(record.email, 320).toLowerCase();
  if (!validEmail(to)) return Response.json({ error: 'The service request does not have a valid email address.' }, { status: 400 });

  const settings = await loadSettings();
  const fromEmail = clean(settings.smtp_from_email, 320).toLowerCase();
  const sentAt = new Date().toISOString();
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#202223">${escapeHtml(message).replace(/\n/g, '<br>')}</div>`;

  try {
    const info = await transportFor(settings).sendMail({ from: fromAddress(settings), to, cc, bcc, subject, text: message, html });
    const history = await saveEmailHistory({
      service_request_id: requestId,
      sent_at: sentAt,
      to_email: to,
      cc_emails: cc,
      bcc_emails: bcc,
      from_email: fromEmail,
      subject,
      body_text: message,
      delivery_status: 'sent',
      provider_message_id: clean(info?.messageId, 1000) || null,
      created_by: ownerAuth.user.id,
    });

    const client = userClient(ownerAuth.token);
    const patch: Record<string, unknown> = { updated_at: sentAt };
    if (record.status === 'new') patch.status = 'contacted';
    if (!record.contacted_at) patch.contacted_at = sentAt;
    const { data: updatedRequest } = await client
      .from('service_requests')
      .update(patch)
      .eq('id', requestId)
      .eq('site_key', 'justindematteis')
      .select('id,status,contacted_at,updated_at')
      .maybeSingle();

    return Response.json({ ok: true, sent: true, email: history.data || null, request: updatedRequest || null, historySaved: !history.error });
  } catch (error) {
    const errorMessage = clean(error instanceof Error ? error.message : error, 1000) || 'Email delivery failed.';
    await saveEmailHistory({
      service_request_id: requestId,
      to_email: to,
      cc_emails: cc,
      bcc_emails: bcc,
      from_email: fromEmail,
      subject,
      body_text: message,
      delivery_status: 'failed',
      delivery_error: errorMessage,
      created_by: ownerAuth.user.id,
    });
    console.error('Service request reply failed', errorMessage);
    return Response.json({ error: errorMessage }, { status: 502 });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  let body: any = {};
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }); }

  if (body.action === 'notify') return sendNotification(body);
  if (body.action === 'reply') return sendReply(req, body);
  return Response.json({ error: 'Invalid action' }, { status: 400 });
});
