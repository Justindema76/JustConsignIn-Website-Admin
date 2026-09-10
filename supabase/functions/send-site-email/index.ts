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
  if (error) {
    console.error('Demo notification lookup failed', error.message);
    return Response.json({ error: 'Unable to load demo request.' }, { status: 500 });
  }
  if (!record || String(record.notification_token) !== notificationToken) return Response.json({ error: 'Not found' }, { status: 404 });
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

async function ownerRequest(ownerAuth: any, requestId: string, select: string) {
  const client = userClient(ownerAuth.token);
  const { data, error } = await client.from('demo_requests').select(select).eq('id', requestId).maybeSingle();
  if (error) {
    console.error('Owner demo request lookup failed', error.message);
    return { record: null, error: 'Unable to load demo request.' };
  }
  if (!data) return { record: null, error: 'Demo request not found.' };
  return { record: data, error: null };
}

async function saveEmailHistory(values: any) {
  const { data, error } = await admin
    .from('demo_request_emails')
    .insert(values)
    .select('id,demo_request_id,created_at,sent_at,to_email,cc_emails,bcc_emails,from_email,subject,body_text,delivery_status,delivery_error,provider_message_id')
    .single();
  if (error) console.error('Unable to save demo request email history', error.message);
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

  const lookup = await ownerRequest(ownerAuth, requestId, 'id,first_name,last_name,business_name,email,status,contacted_at');
  if (!lookup.record) return Response.json({ error: lookup.error }, { status: lookup.error === 'Demo request not found.' ? 404 : 500 });
  const record: any = lookup.record;

  const to = clean(record.email, 320).toLowerCase();
  if (!validEmail(to)) return Response.json({ error: 'The demo request does not have a valid email address.' }, { status: 400 });

  const settings = await loadSettings();
  const fromEmail = clean(settings.smtp_from_email, 320).toLowerCase();
  const sentAt = new Date().toISOString();
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#202223">${escapeHtml(message).replace(/\n/g, '<br>')}</div>`;

  try {
    const info = await transportFor(settings).sendMail({ from: fromAddress(settings), to, cc, bcc, subject, text: message, html });
    const history = await saveEmailHistory({
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
      created_by: ownerAuth.user.id,
    });

    const client = userClient(ownerAuth.token);
    const patch: Record<string, unknown> = { updated_at: sentAt };
    if (record.status === 'new') patch.status = 'contacted';
    if (!record.contacted_at) patch.contacted_at = sentAt;
    const { data: updatedRequest } = await client.from('demo_requests').update(patch).eq('id', requestId).select('id,status,contacted_at,updated_at').maybeSingle();

    return Response.json({ ok: true, sent: true, email: history.data || null, request: updatedRequest || null, historySaved: !history.error });
  } catch (error) {
    const errorMessage = clean(error instanceof Error ? error.message : error, 1000) || 'Email delivery failed.';
    await saveEmailHistory({
      demo_request_id: requestId,
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
    console.error('Demo request reply failed', errorMessage);
    return Response.json({ error: errorMessage }, { status: 502 });
  }
}

function safeTimezone(value: unknown) {
  const timezone = clean(value, 100) || 'America/Toronto';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return 'America/Toronto';
  }
}

function scheduleDisplay(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}

function icsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsEscape(value: unknown) {
  return clean(value, 4000).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function buildCalendarInvite(record: any, scheduledAt: string, durationMinutes: number, location: string, notes: string, settings: any) {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const fullName = `${clean(record.first_name, 100)} ${clean(record.last_name, 100)}`.trim();
  const description = notes || 'JustConsignIn product demo.';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JustConsignIn//Demo Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${record.id}@justconsignin.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    'SUMMARY:JustConsignIn Demo',
    `DESCRIPTION:${icsEscape(description)}`,
    location ? `LOCATION:${icsEscape(location)}` : null,
    `ORGANIZER;CN=${icsEscape(settings.smtp_from_name || 'JustConsignIn')}:mailto:${clean(settings.smtp_from_email, 320)}`,
    `ATTENDEE;CN=${icsEscape(fullName)};RSVP=TRUE:mailto:${clean(record.email, 320)}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function scheduleEmail(record: any, scheduledAt: string, durationMinutes: number, timezone: string, location: string, notes: string, settings: any) {
  const fullName = `${clean(record.first_name, 100)} ${clean(record.last_name, 100)}`.trim();
  const when = scheduleDisplay(scheduledAt, timezone);
  const locationText = location || 'Details to follow';
  const text = [
    `Hi ${clean(record.first_name, 100) || 'there'},`, '',
    'Your JustConsignIn demo is scheduled.', '',
    `Date & time: ${when}`,
    `Duration: ${durationMinutes} minutes`,
    `Meeting: ${locationText}`,
    notes ? `\nMessage: ${notes}` : '', '',
    'A calendar invite is attached to this email.', '',
    'Thanks,',
    'JustConsignIn',
  ].filter(value => value !== '').join('\n');

  const locationHtml = /^https?:\/\//i.test(locationText)
    ? `<a href="${escapeHtml(locationText)}">${escapeHtml(locationText)}</a>`
    : escapeHtml(locationText);
  const html = `<div style="font-family:Arial,sans-serif;background:#f5f6f8;padding:24px;color:#202223"><div style="max-width:620px;margin:auto;background:#fff;border:1px solid #dfe3e8;border-radius:14px;overflow:hidden"><div style="background:#1f67b2;color:#fff;padding:20px 24px"><h1 style="margin:0;font-size:24px">Your JustConsignIn demo is scheduled</h1></div><div style="padding:24px"><p>Hi ${escapeHtml(record.first_name || 'there')},</p><p>Your demo has been scheduled.</p><div style="margin:18px 0;padding:16px;background:#f7f9fb;border-radius:10px;line-height:1.8"><strong>Date & time:</strong> ${escapeHtml(when)}<br><strong>Duration:</strong> ${durationMinutes} minutes<br><strong>Meeting:</strong> ${locationHtml}</div>${notes ? `<p><strong>Message:</strong><br>${escapeHtml(notes).replace(/\n/g, '<br>')}</p>` : ''}<p>A calendar invite is attached so you can add the appointment to your calendar.</p><p>Thanks,<br>JustConsignIn</p></div></div></div>`;
  return { fullName, when, text, html };
}

async function sendSchedule(req: Request, body: any) {
  const ownerAuth = await requireOwner(req);
  if (!ownerAuth) return Response.json({ error: 'Not found' }, { status: 404 });

  const requestId = clean(body.requestId, 80);
  const scheduledAtRaw = clean(body.scheduledAt, 100);
  const durationMinutes = Number(body.durationMinutes || 30);
  const timezone = safeTimezone(body.timezone);
  const location = clean(body.location, 1000);
  const notes = clean(body.notes, 6000);

  if (!validUuid(requestId)) return Response.json({ error: 'A valid request ID is required.' }, { status: 400 });
  const scheduledDate = new Date(scheduledAtRaw);
  if (!scheduledAtRaw || Number.isNaN(scheduledDate.getTime())) return Response.json({ error: 'Choose a valid date and time.' }, { status: 400 });
  if (scheduledDate.getTime() < Date.now() - 5 * 60000) return Response.json({ error: 'The demo time must be in the future.' }, { status: 400 });
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) return Response.json({ error: 'Duration must be between 15 and 240 minutes.' }, { status: 400 });

  const lookup = await ownerRequest(ownerAuth, requestId, 'id,first_name,last_name,business_name,email,status,contacted_at');
  if (!lookup.record) return Response.json({ error: lookup.error }, { status: lookup.error === 'Demo request not found.' ? 404 : 500 });
  const record: any = lookup.record;
  if (!validEmail(clean(record.email, 320))) return Response.json({ error: 'The demo request does not have a valid email address.' }, { status: 400 });

  const client = userClient(ownerAuth.token);
  const now = new Date().toISOString();
  const update = {
    status: 'scheduled',
    scheduled_at: scheduledDate.toISOString(),
    scheduled_duration_minutes: durationMinutes,
    scheduled_timezone: timezone,
    scheduled_location: location || null,
    scheduled_notes: notes || null,
    contacted_at: record.contacted_at || now,
    updated_at: now,
  };
  const { data: updatedRequest, error: updateError } = await client
    .from('demo_requests')
    .update(update)
    .eq('id', requestId)
    .select('id,status,contacted_at,updated_at,scheduled_at,scheduled_duration_minutes,scheduled_timezone,scheduled_location,scheduled_notes')
    .maybeSingle();
  if (updateError || !updatedRequest) {
    console.error('Unable to save demo schedule', updateError?.message || 'No updated row returned');
    return Response.json({ error: 'Unable to save the demo schedule.' }, { status: 500 });
  }

  try {
    const settings = await loadSettings();
    const email = scheduleEmail(record, updatedRequest.scheduled_at, durationMinutes, timezone, location, notes, settings);
    const invite = buildCalendarInvite(record, updatedRequest.scheduled_at, durationMinutes, location, notes, settings);
    const subject = 'Your JustConsignIn demo is scheduled';
    const info = await transportFor(settings).sendMail({
      from: fromAddress(settings),
      to: record.email,
      subject,
      text: email.text,
      html: email.html,
      icalEvent: {
        filename: 'justconsignin-demo.ics',
        method: 'REQUEST',
        content: invite,
      },
    });

    const history = await saveEmailHistory({
      demo_request_id: requestId,
      sent_at: new Date().toISOString(),
      to_email: clean(record.email, 320).toLowerCase(),
      cc_emails: [],
      bcc_emails: [],
      from_email: clean(settings.smtp_from_email, 320).toLowerCase(),
      subject,
      body_text: email.text,
      delivery_status: 'sent',
      provider_message_id: clean(info?.messageId, 1000) || null,
      created_by: ownerAuth.user.id,
    });

    return Response.json({ ok: true, scheduled: true, emailSent: true, request: updatedRequest, email: history.data || null });
  } catch (error) {
    const errorMessage = clean(error instanceof Error ? error.message : error, 1000) || 'Schedule saved, but the confirmation email failed.';
    console.error('Demo schedule email failed', errorMessage);
    return Response.json({ ok: true, scheduled: true, emailSent: false, request: updatedRequest, warning: `Schedule saved, but the confirmation email failed: ${errorMessage}` });
  }
}

async function sendTest(req: Request) {
  const ownerAuth = await requireOwner(req);
  if (!ownerAuth) return Response.json({ error: 'Not found' }, { status: 404 });
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
  if (body.action === 'schedule') return sendSchedule(req, body);
  if (body.action === 'test') return sendTest(req);
  return Response.json({ error: 'Invalid action' }, { status: 400 });
});