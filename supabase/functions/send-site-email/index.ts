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

async function loadSettings(siteKey = 'justconsignin') {
  const safeSiteKey = siteKey === 'justindematteis' ? 'justindematteis' : 'justconsignin';
  const { data, error } = await admin.rpc('service_get_email_settings', { p_site_key: safeSiteKey });
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
  if (!to.length && eventKey === 'demo_request' && clean(settings.notification_email, 320)) to = [clean(settings.notification_email, 320).toLowerCase()];
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
    const settings = await loadSettings('justconsignin');
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

  const settings = await loadSettings('justconsignin');
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
    const settings = await loadSettings('justconsignin');
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


function serviceRequestMessage(record: any, settings: any) {
  const display = (value: unknown) => clean(value, 3000) || 'Not provided';
  const company = clean(record.company, 160) || 'Individual project';
  const requestedService = clean(record.requested_service, 100).replace(/_/g, ' ') || 'Not specified';
  const primaryService = clean(record.ai_primary_service, 100).replace(/_/g, ' ') || 'Not classified';
  const secondary = Array.isArray(record.ai_secondary_services) ? record.ai_secondary_services.map((item: unknown) => clean(item, 100).replace(/_/g, ' ')).filter(Boolean).join(', ') : '';
  const campaign = [record.utm_source, record.utm_medium, record.utm_campaign].filter(Boolean).join(' / ') || 'Direct / unknown';
  const row = (label: string, value: unknown) => `<tr><td style="padding:8px 12px;color:#6d7175;font-weight:700;vertical-align:top;width:150px">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#202223;vertical-align:top">${escapeHtml(display(value))}</td></tr>`;

  const text = [
    'New JustinDeMatteis.com service request', '',
    `Name: ${display(record.name)}`,
    `Company: ${company}`,
    `Email: ${display(record.email)}`,
    `Phone: ${display(record.phone)}`,
    `Requested service: ${requestedService}`,
    `AI primary service: ${primaryService}`,
    `AI secondary services: ${secondary || 'None'}`,
    `Priority: ${display(record.ai_priority)}`,
    `AI summary: ${display(record.ai_summary)}`,
    `Budget: ${display(record.budget_range)}`,
    `Timeline: ${display(record.timeline)}`, '',
    'Project request:', display(record.message), '',
    `Source page: ${display(record.source_path)}`,
    `Campaign: ${campaign}`, '',
    'This request is saved in Website Admin → Service Requests.',
  ].join('\n');

  const html = `<div style="font-family:Arial,sans-serif;background:#f5f6f8;padding:24px;color:#202223"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #dfe3e8;border-radius:14px;overflow:hidden"><div style="background:#1f67b2;color:#fff;padding:20px 24px"><div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.85">Justin DeMatteis</div><h1 style="margin:5px 0 0;font-size:24px">New Service Request</h1></div><div style="padding:20px 12px"><table role="presentation" style="width:100%;border-collapse:collapse">${row('Name', record.name)}${row('Company', company)}${row('Email', record.email)}${row('Phone', record.phone)}${row('Requested service', requestedService)}${row('AI route', primaryService)}${row('Secondary', secondary)}${row('Priority', record.ai_priority)}${row('Budget', record.budget_range)}${row('Timeline', record.timeline)}${row('Source', campaign)}</table><div style="margin:16px 12px 4px;padding:16px;background:#f7f9fb;border-radius:10px"><strong style="display:block;margin-bottom:8px">AI summary</strong><div style="line-height:1.55">${escapeHtml(display(record.ai_summary))}</div></div><div style="margin:10px 12px 4px;padding:16px;background:#f7f9fb;border-radius:10px"><strong style="display:block;margin-bottom:8px">Project request</strong><div style="white-space:pre-wrap;line-height:1.55">${escapeHtml(display(record.message))}</div></div><p style="margin:18px 12px 4px;color:#6d7175;font-size:13px">Reply directly to ${escapeHtml(display(record.name))} at ${escapeHtml(display(record.email))}. The request is also saved in Website Admin → Service Requests.</p></div></div></div>`;

  return {
    from: fromAddress(settings),
    ...recipientsFor(settings, 'service_request'),
    replyTo: record.email,
    subject: `New Service Request — ${company} — ${display(record.name)}`,
    text,
    html,
  };
}

function hiringSpamScore(values: any) {
  const text = [
    clean(values.company, 200),
    clean(values.website_or_linkedin, 500),
    clean(values.role_title, 200),
    clean(values.message, 6000),
  ].join(' ').toLowerCase();

  const rules: Array<[RegExp, number, string]> = [
    [/\bseo services?\b/i, 5, 'SEO services pitch'],
    [/\bguest post(?:ing)?\b/i, 5, 'Guest-post pitch'],
    [/\bbacklinks?\b/i, 5, 'Backlink pitch'],
    [/\blink building\b/i, 5, 'Link-building pitch'],
    [/(increase|boost|grow).{0,24}(traffic|rankings?)/i, 4, 'Traffic/ranking sales pitch'],
    [/(rank|ranking).{0,18}(google|search)/i, 4, 'Search-ranking sales pitch'],
    [/\bdigital marketing services?\b/i, 4, 'Marketing-services pitch'],
    [/\bweb(?:site)? design services?\b/i, 4, 'Web-design services pitch'],
    [/\bapp development services?\b/i, 4, 'Development-services pitch'],
    [/\blead generation services?\b/i, 5, 'Lead-generation pitch'],
    [/\b(we|i) can help (you|your)\b/i, 3, 'Unsolicited services language'],
    [/\bour (agency|team|company).{0,60}(offer|provide|speciali[sz]e)/i, 3, 'Agency sales language'],
    [/(cheap|affordable).{0,24}(seo|website|marketing|development)/i, 4, 'Low-cost services pitch'],
  ];

  let score = 0;
  const reasons: string[] = [];
  for (const [pattern, points, reason] of rules) {
    if (pattern.test(text)) {
      score += points;
      reasons.push(reason);
    }
  }

  return { score, reasons };
}

function hiringContactMessage(record: any, settings: any) {
  const display = (value: unknown) => clean(value, 3000) || 'Not provided';
  const reasonLabels: Record<string,string> = {
    interview: 'Interview request',
    job_opportunity: 'Job opportunity',
    recruiter: 'Recruiter',
    other_employment: 'Other employment-related',
  };
  const reason = reasonLabels[clean(record.reason, 80)] || 'Employment-related';
  const campaign = [record.utm_source, record.utm_medium, record.utm_campaign].filter(Boolean).join(' / ') || 'Direct / unknown';
  const row = (label: string, value: unknown) => `<tr><td style="padding:8px 12px;color:#6d7175;font-weight:700;vertical-align:top;width:150px">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#202223;vertical-align:top">${escapeHtml(display(value))}</td></tr>`;

  const text = [
    'New JustinDeMatteis.com hiring contact', '',
    `Name: ${display(record.name)}`,
    `Company: ${display(record.company)}`,
    `Email: ${display(record.email)}`,
    `Phone: ${display(record.phone)}`,
    `Reason: ${reason}`,
    `Position / role: ${display(record.role_title)}`,
    `LinkedIn / company website: ${display(record.website_or_linkedin)}`, '',
    'Message:', display(record.message), '',
    `Source page: ${display(record.source_path)}`,
    `Campaign: ${campaign}`, '',
    'This message is saved in Website Admin → Hiring Contacts.',
  ].join('\n');

  const html = `<div style="font-family:Arial,sans-serif;background:#f5f6f8;padding:24px;color:#202223"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #dfe3e8;border-radius:14px;overflow:hidden"><div style="background:#0b1f33;color:#fff;padding:20px 24px"><div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.85">Justin DeMatteis</div><h1 style="margin:5px 0 0;font-size:24px">Hiring / Interview Contact</h1></div><div style="padding:20px 12px"><table role="presentation" style="width:100%;border-collapse:collapse">${row('Name',record.name)}${row('Company',record.company)}${row('Email',record.email)}${row('Phone',record.phone)}${row('Reason',reason)}${row('Position / role',record.role_title)}${row('LinkedIn / website',record.website_or_linkedin)}${row('Source',campaign)}</table><div style="margin:16px 12px 4px;padding:16px;background:#f7f9fb;border-radius:10px"><strong style="display:block;margin-bottom:8px">Message</strong><div style="white-space:pre-wrap;line-height:1.55">${escapeHtml(display(record.message))}</div></div><p style="margin:18px 12px 4px;color:#6d7175;font-size:13px">Reply to this email to respond directly to ${escapeHtml(display(record.name))}. The message is also saved in Website Admin → Hiring Contacts.</p></div></div></div>`;

  return {
    from: fromAddress(settings),
    ...recipientsFor(settings, 'hiring_contact'),
    replyTo: record.email,
    subject: `Hiring Contact — ${display(record.company)} — ${display(record.name)}`,
    text,
    html,
  };
}

async function submitHiringContact(body: any) {
  if (clean(body.company_services, 200)) {
    return Response.json({ ok: true, saved: true, filtered: true });
  }

  const name = clean(body.name, 120);
  const company = clean(body.company, 160);
  const email = clean(body.email, 254).toLowerCase();
  const reason = clean(body.reason, 80).toLowerCase();
  const roleTitle = clean(body.role_title, 180);
  const message = clean(body.message, 6000);
  const allowedReasons = ['interview','job_opportunity','recruiter','other_employment'];

  if (!name || !company || !validEmail(email) || !allowedReasons.includes(reason) || !roleTitle || message.length < 30 || body.employment_consent !== true) {
    return Response.json({ error: 'Please complete the required employment contact fields.' }, { status: 400 });
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from('hiring_contacts')
    .select('id')
    .eq('email', email)
    .gte('created_at', since)
    .limit(3);

  if (Array.isArray(recent) && recent.length >= 3) {
    return Response.json({ ok: true, saved: true, filtered: true });
  }

  const spam = hiringSpamScore({
    company,
    website_or_linkedin: body.website_or_linkedin,
    role_title: roleTitle,
    message,
  });
  const isSpam = spam.score >= 5;

  const record = {
    site_key: 'justindematteis',
    name,
    company,
    email,
    phone: clean(body.phone, 60),
    website_or_linkedin: clean(body.website_or_linkedin, 500),
    reason,
    role_title: roleTitle,
    message,
    employment_consent: true,
    status: isSpam ? 'spam' : 'new',
    spam_score: spam.score,
    spam_reasons: spam.reasons,
    is_spam: isSpam,
    source_path: clean(body.source_path, 500),
    referrer: clean(body.referrer, 1000),
    utm_source: clean(body.utm_source, 200),
    utm_medium: clean(body.utm_medium, 200),
    utm_campaign: clean(body.utm_campaign, 300),
    utm_content: clean(body.utm_content, 300),
    utm_term: clean(body.utm_term, 300),
    metadata: { submitted_via: 'portfolio_hiring_contact' },
  };

  const { data: saved, error: insertError } = await admin
    .from('hiring_contacts')
    .insert(record)
    .select('id,site_key,created_at,name,company,email,phone,website_or_linkedin,reason,role_title,message,status,spam_score,spam_reasons,is_spam,source_path,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,email_notified_at')
    .single();

  if (insertError || !saved) {
    console.error('Hiring contact insert failed', insertError?.message || 'No saved row returned');
    return Response.json({ error: 'Unable to save hiring contact.' }, { status: 500 });
  }

  if (isSpam) {
    console.log('Hiring contact filtered as spam', saved.id, spam.score, spam.reasons.join(', '));
    return Response.json({ ok: true, saved: true, filtered: true, request: { id: saved.id } });
  }

  let emailSent = false;
  let emailError = '';
  try {
    await admin.from('hiring_contacts')
      .update({ email_notification_attempted_at: new Date().toISOString(), email_notification_error: null })
      .eq('id', saved.id);

    const settings = await loadSettings('justindematteis');
    await transportFor(settings).sendMail(hiringContactMessage(saved, settings));

    await admin.from('hiring_contacts')
      .update({ email_notified_at: new Date().toISOString(), email_notification_error: null })
      .eq('id', saved.id);

    emailSent = true;
  } catch (error) {
    emailError = clean(error instanceof Error ? error.message : error, 1000) || 'Email delivery failed.';
    await admin.from('hiring_contacts')
      .update({ email_notification_error: emailError })
      .eq('id', saved.id);
    console.error('Hiring contact saved but notification failed', emailError);
  }

  return Response.json({
    ok: true,
    saved: true,
    emailSent,
    emailError: emailSent ? null : emailError,
    request: { id: saved.id },
  });
}

function departmentAssignmentMessage(record: any, department: any, settings: any, note = '') {
  const display = (value: unknown) => clean(value, 4000) || 'Not provided';
  const service = clean(record.ai_primary_service || record.requested_service, 100).replace(/_/g, ' ') || 'Service request';
  const company = clean(record.company, 160) || clean(record.name, 120) || 'New request';
  const assignmentNote = clean(note, 4000);

  const text = [
    'QUOTE REQUEST ASSIGNED', '',
    `Department: ${display(department.name)}`,
    `Customer / Company: ${company}`,
    `Contact: ${display(record.name)}`,
    `Email: ${display(record.email)}`,
    `Phone: ${display(record.phone)}`,
    `Service: ${service}`,
    `Priority: ${display(record.ai_priority)}`,
    `AI summary: ${display(record.ai_summary)}`, '',
    'Customer request:',
    display(record.message),
    ...(assignmentNote ? ['', 'Assignment note:', assignmentNote] : []),
    '',
    'Action required: Review this request and prepare a quote.',
    'The request remains stored in Website Admin → Service Requests.',
  ].join('\n');

  const row = (label: string, value: unknown) => `<tr><td style="padding:8px 12px;color:#6d7175;font-weight:700;vertical-align:top;width:150px">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#202223;vertical-align:top">${escapeHtml(display(value))}</td></tr>`;
  const html = `<div style="font-family:Arial,sans-serif;background:#f5f6f8;padding:24px;color:#202223"><div style="max-width:700px;margin:0 auto;background:#fff;border:1px solid #dfe3e8;border-radius:14px;overflow:hidden"><div style="background:#0b1f33;color:#fff;padding:20px 24px"><div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.85">Justin DeMatteis · Internal Assignment</div><h1 style="margin:5px 0 0;font-size:24px">Quote Request Assigned</h1></div><div style="padding:20px 12px"><table role="presentation" style="width:100%;border-collapse:collapse">${row('Department',department.name)}${row('Customer / Company',company)}${row('Contact',record.name)}${row('Email',record.email)}${row('Phone',record.phone)}${row('Service',service)}${row('Priority',record.ai_priority)}${row('AI summary',record.ai_summary)}</table><div style="margin:16px 12px 4px;padding:16px;background:#f7f9fb;border-radius:10px"><strong style="display:block;margin-bottom:8px">Customer request</strong><div style="white-space:pre-wrap;line-height:1.55">${escapeHtml(display(record.message))}</div></div>${assignmentNote ? `<div style="margin:10px 12px 4px;padding:16px;background:#eef5ff;border-radius:10px"><strong style="display:block;margin-bottom:8px">Assignment note</strong><div style="white-space:pre-wrap;line-height:1.55">${escapeHtml(assignmentNote)}</div></div>` : ''}<p style="margin:18px 12px 4px;color:#202223;font-size:13px;font-weight:700">Action required: Review this request and prepare a quote.</p><p style="margin:8px 12px 4px;color:#6d7175;font-size:12px">The original request remains stored in Website Admin → Service Requests.</p></div></div></div>`;

  return {
    from: fromAddress(settings),
    to: clean(department.email, 320).toLowerCase(),
    subject: `Quote Request Assigned — ${company} — ${service}`,
    text,
    html,
  };
}

async function assignServiceRequestDepartment(req: Request, body: any) {
  const ownerAuth = await requireOwner(req);
  if (!ownerAuth) return Response.json({ error: 'Not found' }, { status: 404 });

  const requestId = clean(body.requestId, 80);
  const departmentId = clean(body.departmentId, 80);
  const note = clean(body.note, 4000);

  if (!validUuid(requestId) || !validUuid(departmentId)) {
    return Response.json({ error: 'A valid request and department are required.' }, { status: 400 });
  }

  const [{ data: record, error: requestError }, { data: department, error: departmentError }] = await Promise.all([
    admin.from('service_requests')
      .select('id,site_key,name,email,phone,company,requested_service,message,status,ai_primary_service,ai_priority,ai_summary')
      .eq('id', requestId)
      .eq('site_key', 'justindematteis')
      .maybeSingle(),
    admin.from('agency_departments')
      .select('id,site_key,name,email,active')
      .eq('id', departmentId)
      .eq('site_key', 'justindematteis')
      .maybeSingle(),
  ]);

  if (requestError || !record) return Response.json({ error: 'Service request not found.' }, { status: 404 });
  if (departmentError || !department || department.active === false || !validEmail(clean(department.email, 320))) {
    return Response.json({ error: 'Department is not available for assignment.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const basePatch = {
    status: 'needs_quote',
    assigned_department_id: department.id,
    assigned_department_name: clean(department.name, 120),
    assigned_department_email: clean(department.email, 320).toLowerCase(),
    assigned_at: now,
    quote_requested_at: now,
    assignment_email_sent_at: null,
    assignment_email_error: null,
    updated_at: now,
  };

  const { error: assignError } = await admin.from('service_requests').update(basePatch).eq('id', requestId);
  if (assignError) {
    console.error('Department assignment save failed', assignError.message);
    return Response.json({ error: 'Unable to save department assignment.' }, { status: 500 });
  }

  let emailSent = false;
  let emailError = '';
  try {
    const settings = await loadSettings('justindematteis');
    await transportFor(settings).sendMail(departmentAssignmentMessage(record, department, settings, note));
    await admin.from('service_requests').update({
      assignment_email_sent_at: new Date().toISOString(),
      assignment_email_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', requestId);
    emailSent = true;
  } catch (error) {
    emailError = clean(error instanceof Error ? error.message : error, 1000) || 'Assignment email failed.';
    await admin.from('service_requests').update({
      assignment_email_error: emailError,
      updated_at: new Date().toISOString(),
    }).eq('id', requestId);
    console.error('Department assignment email failed', emailError);
  }

  const { data: updated } = await admin.from('service_requests')
    .select('id,status,assigned_department_id,assigned_department_name,assigned_department_email,assigned_at,quote_requested_at,assignment_email_sent_at,assignment_email_error,updated_at')
    .eq('id', requestId)
    .maybeSingle();

  return Response.json({
    ok: true,
    assigned: true,
    emailSent,
    emailError: emailSent ? null : emailError,
    request: updated || { id: requestId, ...basePatch },
    department: { id: department.id, name: department.name, email: department.email },
  });
}

async function submitServiceRequest(body: any) {
  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const message = clean(body.message, 6000);

  if (!name || !validEmail(email) || message.length < 20) {
    return Response.json({ error: 'Please complete the required fields.' }, { status: 400 });
  }

  const secondaryServices = Array.isArray(body.ai_secondary_services)
    ? body.ai_secondary_services.map((item: unknown) => clean(item, 100)).filter(Boolean).slice(0, 3)
    : [];

  const confidence = Math.max(0, Math.min(1, Number(body.ai_confidence) || 0));

  const record = {
    site_key: 'justindematteis',
    name,
    email,
    phone: clean(body.phone, 60),
    company: clean(body.company, 160),
    website: clean(body.website, 500),
    requested_service: clean(body.requested_service, 80) || 'not_sure',
    budget_range: clean(body.budget_range, 80),
    timeline: clean(body.timeline, 80),
    message,
    contact_consent: body.contact_consent === true,
    status: 'new',
    routed_queue: clean(body.routed_queue, 100) || 'other',
    ai_primary_service: clean(body.ai_primary_service, 100) || 'other',
    ai_secondary_services: secondaryServices,
    ai_priority: ['low', 'normal', 'high'].includes(clean(body.ai_priority, 20)) ? clean(body.ai_priority, 20) : 'normal',
    ai_summary: clean(body.ai_summary, 160),
    ai_confidence: confidence,
    ai_provider: clean(body.ai_provider, 80) || 'rules',
    ai_model: clean(body.ai_model, 120) || null,
    source_path: clean(body.source_path, 500),
    referrer: clean(body.referrer, 1000),
    utm_source: clean(body.utm_source, 200),
    utm_medium: clean(body.utm_medium, 200),
    utm_campaign: clean(body.utm_campaign, 300),
    utm_content: clean(body.utm_content, 300),
    utm_term: clean(body.utm_term, 300),
    metadata: {
      submitted_via: 'portfolio_service_request',
    },
  };

  const { data: saved, error: insertError } = await admin
    .from('service_requests')
    .insert(record)
    .select('id,site_key,name,email,phone,company,website,requested_service,budget_range,timeline,message,status,routed_queue,ai_primary_service,ai_secondary_services,ai_priority,ai_summary,ai_confidence,ai_provider,ai_model,source_path,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,notification_token,email_notified_at')
    .single();

  if (insertError || !saved) {
    console.error('Service request insert failed', insertError?.message || 'No saved row returned');
    return Response.json({ error: 'Unable to save service request.' }, { status: 500 });
  }

  let emailSent = false;
  let emailError = '';

  try {
    await admin.from('service_requests')
      .update({ email_notification_attempted_at: new Date().toISOString(), email_notification_error: null })
      .eq('id', saved.id);

    const settings = await loadSettings('justindematteis');
    await transportFor(settings).sendMail(serviceRequestMessage(saved, settings));

    await admin.from('service_requests')
      .update({ email_notified_at: new Date().toISOString(), email_notification_error: null })
      .eq('id', saved.id);

    emailSent = true;
  } catch (error) {
    emailError = clean(error instanceof Error ? error.message : error, 1000) || 'Email delivery failed.';
    await admin.from('service_requests')
      .update({ email_notification_error: emailError })
      .eq('id', saved.id);
    console.error('Service request saved but notification failed', emailError);
  }

  return Response.json({
    ok: true,
    saved: true,
    emailSent,
    emailError: emailSent ? null : emailError,
    request: saved,
  });
}

async function sendServiceRequestNotification(body: any) {
  const requestId = clean(body.requestId, 80);
  const notificationToken = clean(body.notificationToken, 80);
  if (!validUuid(requestId) || !validUuid(notificationToken)) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: record, error } = await admin
    .from('service_requests')
    .select('id,site_key,name,email,phone,company,requested_service,budget_range,timeline,message,routed_queue,ai_primary_service,ai_secondary_services,ai_priority,ai_summary,source_path,utm_source,utm_medium,utm_campaign,notification_token,email_notified_at')
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
    const settings = await loadSettings('justindematteis');
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

async function saveServiceRequestEmailHistory(values: any) {
  const { data, error } = await admin
    .from('service_request_emails')
    .insert(values)
    .select('id,service_request_id,created_at,sent_at,to_email,cc_emails,bcc_emails,from_email,subject,body_text,delivery_status,delivery_error,provider_message_id')
    .single();
  if (error) console.error('Unable to save service request email history', error.message);
  return { data, error };
}

async function sendServiceRequestReply(req: Request, body: any) {
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

  const { data: record, error } = await admin
    .from('service_requests')
    .select('id,site_key,name,company,email,status,contacted_at')
    .eq('id', requestId)
    .eq('site_key', 'justindematteis')
    .maybeSingle();

  if (error) {
    console.error('Owner service request lookup failed', error.message);
    return Response.json({ error: 'Unable to load service request.' }, { status: 500 });
  }
  if (!record) return Response.json({ error: 'Service request not found.' }, { status: 404 });

  const to = clean(record.email, 320).toLowerCase();
  if (!validEmail(to)) return Response.json({ error: 'The service request does not have a valid email address.' }, { status: 400 });

  const settings = await loadSettings('justindematteis');
  const fromEmail = clean(settings.smtp_from_email, 320).toLowerCase();
  const sentAt = new Date().toISOString();
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#202223">${escapeHtml(message).replace(/\n/g, '<br>')}</div>`;

  try {
    const info = await transportFor(settings).sendMail({ from: fromAddress(settings), to, cc, bcc, subject, text: message, html });
    const history = await saveServiceRequestEmailHistory({
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

    const patch: Record<string, unknown> = { updated_at: sentAt };
    if (record.status === 'new' || record.status === 'reviewing') patch.status = 'contacted';
    if (!record.contacted_at) patch.contacted_at = sentAt;
    const { data: updatedRequest } = await admin
      .from('service_requests')
      .update(patch)
      .eq('id', requestId)
      .eq('site_key', 'justindematteis')
      .select('id,status,contacted_at,updated_at')
      .maybeSingle();

    return Response.json({ ok: true, sent: true, email: history.data || null, request: updatedRequest || null, historySaved: !history.error });
  } catch (error) {
    const errorMessage = clean(error instanceof Error ? error.message : error, 1000) || 'Email delivery failed.';
    await saveServiceRequestEmailHistory({
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

async function sendTest(req: Request, body: any) {
  const ownerAuth = await requireOwner(req);
  if (!ownerAuth) return Response.json({ error: 'Not found' }, { status: 404 });

  const siteKey = clean(body?.siteKey, 80).toLowerCase() === 'justindematteis' ? 'justindematteis' : 'justconsignin';
  const eventKey = siteKey === 'justindematteis' ? 'service_request' : 'demo_request';
  const siteLabel = siteKey === 'justindematteis' ? 'Justin DeMatteis' : 'JustConsignIn';
  const eventLabel = siteKey === 'justindematteis' ? 'Service Requests' : 'Demo Requests';

  try {
    const settings = await loadSettings(siteKey);
    const transport = transportFor(settings);
    await transport.verify();
    await transport.sendMail({
      from: fromAddress(settings),
      ...recipientsFor(settings, eventKey),
      subject: `${siteLabel} Email Settings Test`,
      text: `Your Website Admin SMTP settings and ${eventLabel} routing are working.`,
      html: `<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="margin:0 0 12px">Email settings are working</h2><p>Your ${siteLabel} Website Admin successfully connected to the configured SMTP server and sent this message using the saved ${eventLabel} routing.</p></div>`,
    });
    return Response.json({ ok: true, sent: true, siteKey });
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
  if (body.action === 'service_submit') return submitServiceRequest(body);
  if (body.action === 'service_assign_department') return assignServiceRequestDepartment(req, body);
  if (body.action === 'hiring_contact_submit') return submitHiringContact(body);
  if (body.action === 'service_request') return sendServiceRequestNotification(body);
  if (body.action === 'reply') return sendReply(req, body);
  if (body.action === 'service_reply') return sendServiceRequestReply(req, body);
  if (body.action === 'schedule') return sendSchedule(req, body);
  if (body.action === 'test') return sendTest(req, body);
  return Response.json({ error: 'Invalid action' }, { status: 400 });
});