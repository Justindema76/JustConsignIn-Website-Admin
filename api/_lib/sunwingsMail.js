// Sunwings quote conversation: every email to a customer goes out from the Sunwings mailbox,
// gets saved on the job, and customer replies are read back from the same mailbox.
// Uses the SMTP login saved in Website Admin › Email settings (no new passwords).

import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabaseRest } from './supabase.js';

const SITE_KEY = 'sunwings';
// Marius's inbox: gets a heads-up when Justin sends him a job.
export const DISPATCH_EMAIL = () => process.env.SUNWINGS_DISPATCH_EMAIL || 'dispatch@sunwingstransport.ca';
const ADMIN_URL = () => process.env.WEBSITE_ADMIN_URL || 'https://admin.justindematteis.com';

export const clean = (value, max = 8000) => String(value ?? '').trim().slice(0, max);
const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
export const money = n => '$' + Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The short tag in every subject, e.g. [SW-3EA3E6]. Replies keep it, so they find their job.
export const refOf = id => `SW-${String(id).replace(/-/g, '').slice(0, 6).toUpperCase()}`;
const withRef = (subject, ref) => (subject.includes(`[${ref}]`) ? subject : `${subject} [${ref}]`);

async function rest(path, options = {}) {
  const response = await supabaseRest(path, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Database request failed (${response.status}).`);
  return data;
}

export async function loadMailSettings() {
  const data = await rest('rpc/service_get_email_settings', { method: 'POST', body: JSON.stringify({ p_site_key: SITE_KEY }) });
  const settings = Array.isArray(data) ? data[0] : data;
  if (!settings?.enabled) throw new Error('Sunwings email is turned off in Website Admin › Email settings.');
  for (const key of ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_from_email', 'smtp_password']) {
    if (!settings[key]) throw new Error(`Sunwings email setting ${key} is missing.`);
  }
  return settings;
}

const fromOf = s => (s.smtp_from_name ? { name: s.smtp_from_name, address: s.smtp_from_email } : s.smtp_from_email);
const transportOf = s => nodemailer.createTransport({
  host: s.smtp_host, port: Number(s.smtp_port), secure: Boolean(s.smtp_secure),
  auth: { user: s.smtp_username, pass: s.smtp_password },
});

function shell(title, inner) {
  return `<div style="font-family:Arial,sans-serif;background:#F6F8FB;padding:24px;color:#14213D"><div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #E3E9F2;border-radius:14px;overflow:hidden">
<div style="background:#0B2545;color:#fff;padding:18px 24px"><div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#FDB833">Sunwings Transport</div>${title ? `<div style="margin-top:4px;font-size:20px;font-weight:800">${esc(title)}</div>` : ''}</div>
<div style="padding:22px 24px;font-size:15px;line-height:1.6">${inner}</div></div></div>`;
}
const paragraphs = text => clean(text).split(/\n{2,}/).map(p => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

// ---- Saving messages -------------------------------------------------------------------

export async function saveMessage(quoteId, message) {
  const row = { site_key: SITE_KEY, quote_id: quoteId, ...message };
  const [saved] = await rest('sunwings_quote_messages?on_conflict=email_message_id', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify(row),
  }) || [];
  return saved || null;
}

export async function listMessages(quoteId) {
  return rest(`sunwings_quote_messages?quote_id=eq.${encodeURIComponent(quoteId)}&order=created_at.asc&select=*`, { method: 'GET' });
}

export async function touchQuote(quoteId, patch) {
  const rows = await rest(`sunwings_quote_requests?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(quoteId)}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ updated_at: new Date().toISOString(), ...patch }),
  });
  return Array.isArray(rows) ? rows[0] || null : rows;
}

export async function loadQuote(quoteId) {
  const rows = await rest(`sunwings_quote_requests?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(quoteId)}&select=*`, { method: 'GET' });
  return Array.isArray(rows) ? rows[0] || null : null;
}

// ---- Emails to the customer -----------------------------------------------------------

export async function emailCustomer(quote, { subject, body, by, attachments = [], title = '' }) {
  const to = clean(quote.email, 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('This customer has no valid email address.');
  const settings = await loadMailSettings();
  const ref = refOf(quote.id);
  const info = await transportOf(settings).sendMail({
    from: fromOf(settings), to, replyTo: settings.smtp_from_email,
    subject: withRef(clean(subject, 200) || 'Your Sunwings Transport quote', ref),
    text: body, html: shell(title, paragraphs(body)), attachments,
  });
  return { messageId: info.messageId, to, from: settings.smtp_from_email, ref };
}

// ---- Quote PDF ------------------------------------------------------------------------

const ascii = value => String(value ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/→/g, '->').replace(/[^\x20-\x7E\n]/g, '');

export async function quotePdf(quote, { lines, total, includes, validDays, by }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.043, 0.145, 0.271), orange = rgb(0.976, 0.451, 0.086), grey = rgb(0.36, 0.42, 0.51);
  let y = 792;
  page.drawRectangle({ x: 0, y: 792 - 96, width: 612, height: 96, color: navy });
  page.drawText('SUNWINGS TRANSPORT', { x: 48, y: 740, size: 11, font: bold, color: rgb(0.99, 0.72, 0.2) });
  page.drawText('Quote', { x: 48, y: 712, size: 26, font: bold, color: rgb(1, 1, 1) });
  page.drawText(refOf(quote.id), { x: 470, y: 716, size: 12, font: bold, color: rgb(1, 1, 1) });
  y = 660;
  const text = (value, x, size = 11, f = font, color = navy) => page.drawText(ascii(value), { x, y, size, font: f, color });
  const today = new Date();
  const until = new Date(today.getTime() + (Number(validDays) || 14) * 86400000);
  const dateText = d => d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  text('Prepared for', 48, 10, bold, grey); text('Date', 360, 10, bold, grey); y -= 16;
  text(quote.name || 'Customer', 48, 13, bold); text(dateText(today), 360, 12); y -= 16;
  text(quote.email || '', 48, 10, font, grey); text(`Valid until ${dateText(until)}`, 360, 10, font, grey); y -= 30;
  const pickup = [quote.pickup_address, quote.pickup_city].filter(Boolean).join(', ') || quote.move_from || '';
  const dropoff = [quote.dropoff_address, quote.dropoff_city].filter(Boolean).join(', ') || quote.move_to || '';
  for (const [label, value] of [['Service', quote.service], ['Date requested', quote.preferred_date], ['Pickup', pickup], ['Drop-off', dropoff]]) {
    if (!value) continue;
    text(label, 48, 10, bold, grey); text(String(value).slice(0, 80), 160, 11); y -= 18;
  }
  y -= 14;
  page.drawRectangle({ x: 48, y: y - 6, width: 516, height: 24, color: rgb(0.965, 0.973, 0.984) });
  y += 2; text('Description', 58, 10, bold, grey); text('Amount', 500, 10, bold, grey); y -= 28;
  for (const line of lines) {
    text(String(line.label).slice(0, 70), 58, 11);
    const amt = money(line.amount); page.drawText(amt, { x: 554 - font.widthOfTextAtSize(amt, 11), y, size: 11, font, color: navy });
    y -= 22;
  }
  page.drawLine({ start: { x: 48, y: y + 8 }, end: { x: 564, y: y + 8 }, thickness: 1, color: rgb(0.89, 0.91, 0.95) });
  y -= 10;
  text('Total', 360, 14, bold); const tot = money(total); page.drawText(tot, { x: 554 - bold.widthOfTextAtSize(tot, 18), y: y - 2, size: 18, font: bold, color: orange });
  y -= 44;
  if (clean(includes)) {
    text('What’s included', 48, 11, bold); y -= 18;
    for (const raw of clean(includes).split(/\n+/).slice(0, 14)) { text(`- ${raw.replace(/^[-•*]\s*/, '')}`.slice(0, 95), 56, 10); y -= 15; }
    y -= 10;
  }
  text('To book, reply to this email or call us.', 48, 10, font, grey); y -= 15;
  text(`Prepared by ${by} · Sunwings Transport · sunwingstransport.ca`, 48, 9, font, grey);
  return Buffer.from(await pdf.save());
}

export function quoteEmailBody(quote, { message, lines, total, validDays }) {
  const first = String(quote.name || '').trim().split(/\s+/)[0] || 'there';
  const list = lines.map(line => `• ${line.label}: ${money(line.amount)}`).join('\n');
  return `${clean(message) || `Hi ${first},\n\nThanks for your patience. Here is your quote for your ${String(quote.service || 'job').toLowerCase()}.`}\n\n${list}\nTotal: ${money(total)}\n\nThe full quote is attached. It's good for ${Number(validDays) || 14} days. To book, just reply to this email.\n\nThanks,\nThe Sunwings Transport team`;
}

// ---- Heads-up to Marius's dispatch inbox when Justin sends him a job --------------------

export async function emailDispatch(quote) {
  const settings = await loadMailSettings();
  const pickup = [quote.pickup_address, quote.pickup_city, quote.pickup_postal_code].filter(Boolean).join(', ') || quote.move_from || '—';
  const dropoff = [quote.dropoff_address, quote.dropoff_city, quote.dropoff_postal_code].filter(Boolean).join(', ') || quote.move_to || '—';
  const rows = [['Customer', quote.name], ['Phone', quote.phone], ['Email', quote.email], ['Service', quote.service], ['Date', [quote.preferred_date, quote.preferred_time].filter(Boolean).join(' ')], ['Size', quote.move_size], ['Pickup', pickup], ['Drop-off', dropoff], ['Items', quote.item_list], ['Notes', quote.message]]
    .filter(([, v]) => clean(v));
  const link = `${ADMIN_URL()}/admin/sunwings/quotes?id=${encodeURIComponent(quote.id)}`;
  const table = rows.map(([k, v]) => `<tr><td style="padding:8px 10px;color:#5B6B82;font-weight:700;vertical-align:top;width:110px">${esc(k)}</td><td style="padding:8px 10px;white-space:pre-wrap">${esc(v)}</td></tr>`).join('');
  const inner = `<p style="margin:0 0 14px">Justin sent you a new job. Open it in Website Admin to message the customer and send your quote. Everything you send there is saved on the job.</p>
<table style="width:100%;border-collapse:collapse;border-top:1px solid #EEF2F7">${table}</table>
<p style="margin:22px 0 0;text-align:center"><a href="${esc(link)}" style="display:inline-block;background:#F97316;color:#fff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:10px">Open the job →</a></p>`;
  const info = await transportOf(settings).sendMail({
    from: fromOf(settings), to: DISPATCH_EMAIL(),
    subject: `New job from Justin: ${quote.service || 'Job'} · ${quote.name || 'Customer'} [${refOf(quote.id)}]`,
    text: `Justin sent you a new job.\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nOpen it: ${link}`,
    html: shell('New job from Justin', inner),
  });
  return { messageId: info.messageId, to: DISPATCH_EMAIL() };
}

// Emails dispatch and records it on the job. Never fails the send itself: if the email can't go,
// the job is still sent and the conversation says the email failed.
export async function notifyDispatch(quoteId) {
  try {
    const quote = await loadQuote(quoteId);
    if (!quote) return;
    let line;
    try { const sent = await emailDispatch(quote); line = `Justin sent this job to Marius. Emailed ${sent.to}.`; }
    catch (error) { console.error('[sunwings] dispatch email failed', error); line = `Justin sent this job to Marius. The email to ${DISPATCH_EMAIL()} failed: ${clean(error.message, 200)}`; }
    await saveMessage(quoteId, { kind: 'system', author: 'System', body: line });
  } catch (error) {
    console.error('[sunwings] dispatch note failed', error);
  }
}

// ---- Reading customer replies from the mailbox -------------------------------------------

// Drop the quoted earlier email ("On Mon, ... wrote:") so only the new reply is saved.
function replyOnly(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const cut = lines.findIndex(line => /^On .+wrote:\s*$/i.test(line.trim()) || /^-{2,}\s*Original Message/i.test(line.trim()) || /^From:\s.+/i.test(line.trim()) || /^>/.test(line));
  return (cut > 0 ? lines.slice(0, cut) : lines).join('\n').trim().slice(0, 8000);
}

let lastCheck = 0;

// Looks at the last few days of the mailbox and saves new customer replies on their jobs.
// Never marks mail as read or deletes anything. Safe to run often (each email is saved once).
export async function checkInbox({ force = false } = {}) {
  if (!force && Date.now() - lastCheck < 120000) return { skipped: true };
  lastCheck = Date.now();
  const settings = await loadMailSettings();
  const own = new Set([settings.smtp_from_email, settings.smtp_username, DISPATCH_EMAIL()].map(v => clean(v).toLowerCase()));
  const client = new ImapFlow({
    host: process.env.SUNWINGS_IMAP_HOST || settings.smtp_host, port: Number(process.env.SUNWINGS_IMAP_PORT || 993), secure: true,
    auth: { user: settings.smtp_username, pass: settings.smtp_password }, logger: false,
  });
  let saved = 0;
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const since = new Date(Date.now() - 4 * 86400000);
    for await (const msg of client.fetch({ since }, { source: true, envelope: true }, { uid: false })) {
      const mail = await simpleParser(msg.source);
      const from = clean(mail.from?.value?.[0]?.address, 320).toLowerCase();
      if (!from || own.has(from)) continue;
      const messageId = clean(mail.messageId, 500);
      if (!messageId) continue;
      const quoteId = await matchQuote(mail, from);
      if (!quoteId) continue;
      const row = await saveMessage(quoteId, {
        kind: 'email_in', author: 'Customer', subject: clean(mail.subject, 300), body: replyOnly(mail.text || ''),
        from_email: from, to_email: clean(mail.to?.value?.[0]?.address, 320), email_message_id: messageId,
        created_at: (mail.date || new Date()).toISOString(),
        meta: { attachments: (mail.attachments || []).map(a => a.filename).filter(Boolean).slice(0, 10) },
      });
      if (row) {
        saved += 1;
        const now = new Date().toISOString();
        await touchQuote(quoteId, { customer_replied_at: row.created_at, customer_reply_unseen: true, last_message_at: row.created_at, last_message_by: 'Customer', last_activity: 'Customer replied by email', last_activity_at: now });
      }
    }
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }
  return { saved };
}

async function matchQuote(mail, from) {
  // 1. It answers an email we sent (In-Reply-To / References).
  const refs = [mail.inReplyTo, ...(Array.isArray(mail.references) ? mail.references : [mail.references])].map(v => clean(v, 500)).filter(Boolean);
  for (const id of refs) {
    const rows = await rest(`sunwings_quote_messages?email_message_id=eq.${encodeURIComponent(id)}&select=quote_id&limit=1`, { method: 'GET' });
    if (rows?.[0]) return rows[0].quote_id;
  }
  // 2. The subject still has our [SW-XXXXXX] tag.
  const tag = /\[(SW-[0-9A-F]{6})\]/i.exec(mail.subject || '')?.[1]?.toUpperCase();
  if (tag) {
    const rows = await rest(`sunwings_quote_messages?ref=eq.${encodeURIComponent(tag)}&select=quote_id&limit=1`, { method: 'GET' });
    if (rows?.[0]) return rows[0].quote_id;
  }
  // 3. It's from a customer we've emailed about an open job.
  const rows = await rest(`sunwings_quote_requests?site_key=eq.${SITE_KEY}&email=ilike.${encodeURIComponent(from)}&status=not.in.(complete,declined,cancelled)&last_message_at=not.is.null&order=created_at.desc&select=id&limit=1`, { method: 'GET' });
  return rows?.[0]?.id || null;
}
