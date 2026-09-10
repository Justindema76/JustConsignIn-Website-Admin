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
  return data.user;
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
  const cc = unique('cc').filter(email => !to.includes(email));
  const bcc = unique('bcc').filter(email => !to.includes(email) && !cc.includes(email));
  if (!to.length && clean(settings.notification_email, 320)) to = [clean(settings.notification_email, 320).toLowerCase()];
  if (!to.length) throw new Error(`No To recipient is configured for ${eventKey}.`);
  return { to, cc, bcc };
}

function fromAddress(settings: any) {
  return settings.smtp_from_name
    ? `"${clean(settings.smtp_from_name, 120).replace(/["\r\n]/g, '')}" <${settings.smtp_from_email}>`
    : settings.smtp_from_email;
}

function demoMessage(record: any, settings: any) {
  const fullName = `${clean(record.first_name, 100)} ${clean(record.last_name, 100)}`.trim();
  const business = clean(record.business_name, 160) || 'Unknown business';
  const display = (value: unknown) => clean(value, 3000) || 'Not provided';
  const source = record.source_path ? `https://www.justconsignin.com${clean(record.source_path, 500)}` : 'Not provided';
  const campaign = [record.utm_source, record.utm_medium, record.utm_campaign].filter(Boolean).join(' / ') || 'Not provided';
  const row = (label: string, value: unknown) => `<tr><td style="padding:8px 12px;color:#6d7175;font-weight:700;vertical-align:top;width:150px">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#202223;vertical-align:top">${escapeHtml(display(value))}</td></tr>`;

  const text = [
    'New Request a Free Demo submission', '',
    `Name: ${fullName}`, `Business: ${business}`, `Email: ${record.email}`,
    `Phone: ${display(record.phone)}`, `Shopify: ${display(record.shopify_status)}`,
    `Interested in: ${display(record.interest)}`, '', 'Message:', display(record.message), '',
    `Source page: ${source}`, `Campaign: ${campaign}`, '',
    'This request is also saved in Website Admin → Demo Requests.',
  ].join('\n');

  const html = `<div style="font-family:Arial,sans-serif;background:#f5f6f8;padding:24px;color:#202223"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #dfe3e8;border-radius:14px;overflow:hidden"><div style="background:#1f67b2;color:#fff;padding:20px 24px"><div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.85">JustConsignIn</div><h1 style="margin:5px 0 0;font-size:24px">New Demo Request</h1></div><div style="padding:20px 12px"><table role="presentation" style="width:100%;border-collapse:collapse">${row('Name', fullName)}${row('Business', business)}${row('Email', record.email)}${row('Phone', record.phone)}${row('Shopify', record.shopify_status)}${row('Interested in', record.interest)}${row('Source page', source)}${row('Campaign', campaign)}</table><div style="margin:16px 12px 4px;padding:16px;background:#f7f9fb;border-radius:10px"><strong style="display:block;margin-bottom:8px">Message</strong><div style="white-space:pre-wrap;line-height:1.55">${escapeHtml(display(record.message))}</div></div><p style="margin:18px 12px 4px;color:#6d7175;font-size:13px">Reply to this email to respond directly to ${escapeHtml(fullName)}. The request is also saved in Website Admin → Demo Requests.</p></div></div></div>`;

  return { from: fromAddress(settings), ...recipientsFor(settings, 'demo_request'), replyTo: record.email, subject: `New Demo Request — ${business} — ${fullName}`, text, html };
}

async function sendDemo(body: any) {
  const requestId = clean(body.requestId, 80);
  const notificationToken = clean(body.notificationToken, 80);
  if (!validUuid(requestId) || !validUuid(notificationToken)) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: record, error } = await admin
    .from('demo_requests')
    .select('id,first_name,last_name,business_name,email,phone,shopify_status,interest,message,source_path,utm_source,utm_medium,utm_campaign,notification_token,email_notified_at')
    .eq('id', requestId)
    .maybeSingle();
  if (error || !record || String(record.notification_token) !== notificationToken) return Response.json({ error: 'Not found' }, { status: 404 });
  if (record.email_notified_at) return Response.json({ ok: true, alreadySent: true });

  await admin.from('demo_requests').update({ email_notification_attempted_at: new Date().toISOString(), email_notification_error: null }).eq('id', requestId);
  try {
    const settings = await loadSettings();
    await transportFor(settings).sendMail(demoMessage(record, settings));
    await admin.from('demo_requests').update({ email_notified_at: new Date().toISOString(), email_notification_error: null }).eq('id', requestId);
    return Response.json({ ok: true, sent: true });
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : error, 1000) || 'Email delivery failed.';
    await admin.from('demo_requests').update({ email_notification_error: message }).eq('id', requestId);
    console.error('Demo request email failed', message);
    return Response.json({ error: message }, { status: 502 });
  }
}

async function sendReply(req: Request, body: any) {
  const owner = await requireOwner(req);
  if (!owner) return Response.json({ error: 'Not found' }, { status: 404 });

  const requestId = clean(body.requestId, 80);
  const subject = clean(body.subject, 240);
  const message = clean(body.message, 12000);
  const cc = normalizeEmailList(body.ccEmails);
  const bcc = normalizeEmailList(body.bccEmails);
  if (!validUuid(requestId)) return Response.json({ error: 'A valid request ID is required.' }, { status: 400 });
  if (!subject) return Response.json({ error: 'Subject is required.' }, { status: 400 });
  if (!message) return Response.json({ error: 'Message is required.' }, { status: 400 });
  if ([...cc, ...bcc].some(email => !validEmail(email))) return Response.json({ error: 'CC and BCC must contain valid email addresses.' }, { status: 400 });

  const { data: record, error: requestError } = await admin
    .from('demo_requests')
    .select('id,first_name,last_name,business_name,email,status,contacted_at')
    .eq('id', requestId)
    .maybeSingle();
  if (requestError || !record) return Response.json({ error: 'Demo request not found.' }, { status: 404 });

  const to = clean(record.email, 320).toLowerCase();
  if (!validEmail(to)) return Response.json({ error: 'The demo request does not have a valid email address.' }, { status: 400 });

  const settings = await loadSettings();
  const fromEmail = clean(settings.smtp_from_email, 320).toLowerCase();
  const sentAt = new Date().toISOString();
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#202223">${escapeHtml(message).replace(/\n/g, '<br>')}</div>`;

  try {
    const info = await transportFor(settings).sendMail({ from: fromAddress(settings), to, cc, bcc, subject, text: message, html });
    const { data: history, error: historyError } = await admin
      .from('demo_request_emails')
      .insert({
        demo_request_id: requestId,
        sent_at: sentAt,
        to_email: to,
        cc_emails: cc,
        bcc_emails: bcc,
        from_email: fromEmail,
        subject,
        body_text: message,
        delivery_status: 'sent',
        provider_message_id: clean(info?.messageId, 1000) || null,
        created_by: owner.id,
      })
      .select('id,demo_request_id,created_at,sent_at,to_email,cc_emails,bcc_emails,from_email,subject,body_text,delivery_status,delivery_error,provider_message_id')
      .single();
    if (historyError) console.error('Email sent but history save failed', historyError.message);

    const patch: Record<string, unknown> = { updated_at: sentAt };
    if (record.status === 'new') patch.status = 'contacted';
    if (!record.contacted_at) patch.contacted_at = sentAt;
    const { data: updatedRequest } = await admin.from('demo_requests').update(patch).eq('id', requestId).select('id,status,contacted_at,updated_at').maybeSingle();

    return Response.json({ ok: true, sent: true, email: history || null, request: updatedRequest || null, historySaved: !historyError });
  } catch (error) {
    const errorMessage = clean(error instanceof Error ? error.message : error, 1000) || 'Email delivery failed.';
    const { error: logError } = await admin.from('demo_request_emails').insert({
      demo_request_id: requestId,
      to_email: to,
      cc_emails: cc,
      bcc_emails: bcc,
      from_email: fromEmail,
      subject,
      body_text: message,
      delivery_status: 'failed',
      delivery_error: errorMessage,
      created_by: owner.id,
    });
    if (logError) console.error('Unable to record failed email attempt', logError.message);
    console.error('Demo request reply failed', errorMessage);
    return Response.json({ error: errorMessage }, { status: 502 });
  }
}

async function sendTest(req: Request) {
  const owner = await requireOwner(req);
  if (!owner) return Response.json({ error: 'Not found' }, { status: 404 });
  try {
    const settings = await loadSettings();
    const transport = transportFor(settings);
    await transport.verify();
    await transport.sendMail({
      from: fromAddress(settings),
      ...recipientsFor(settings, 'demo_request'),
      subject: 'JustConsignIn Email Settings Test',
      text: 'Your Website Admin SMTP settings and Demo Requests routing are working.',
      html: '<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="margin:0 0 12px">Email settings are working</h2><p>Your JustConsignIn Website Admin successfully connected to the configured SMTP server and sent this message using the saved Demo Requests routing.</p></div>',
    });
    return Response.json({ ok: true, sent: true });
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : error, 1000) || 'Email test failed.';
    console.error('SMTP test failed', message);
    return Response.json({ error: message }, { status: 502 });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  let body: any = {};
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }); }
  if (body.action === 'demo') return sendDemo(body);
  if (body.action === 'reply') return sendReply(req, body);
  if (body.action === 'test') return sendTest(req);
  return Response.json({ error: 'Invalid action' }, { status: 400 });
});
