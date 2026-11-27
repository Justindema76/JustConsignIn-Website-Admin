import { requireSiteAccess } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { withPhotoUrls } from '../../_lib/sunwingsPhotos.js';
import { checkInbox, clean, emailCustomer, listMessages, loadQuote, money, quoteEmailBody, quotePdf, refOf, saveMessage, touchQuote } from '../../_lib/sunwingsMail.js';

// The back-and-forth on one Sunwings job: emails to the customer, their replies, notes and quotes.
// Justin sees everything. Marius sees and writes on jobs Justin sent him. Nothing is ever deleted.

const OWNER_ONLY_FIELDS = ['admin_notes', 'commission_rate', 'commission_status', 'commission_paid_at', 'commission_paid_method', 'partner_update_unseen'];
const forViewer = (row, isOwner) => {
  if (!row || isOwner) return row;
  const copy = { ...row };
  OWNER_ONLY_FIELDS.forEach(key => { delete copy[key]; });
  return copy;
};

async function canSee(viewer, id) {
  const sentOnly = viewer.role === 'owner' ? '' : '&forwarded_at=not.is.null';
  const response = await supabaseUserRest(viewer.accessToken, `sunwings_quote_requests?site_key=eq.sunwings&id=eq.${encodeURIComponent(id)}${sentOnly}&select=id`, { method: 'GET' });
  const rows = await response.json().catch(() => []);
  return response.ok && Array.isArray(rows) && rows.length > 0;
}

function quoteLines(body) {
  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .map(line => ({ label: clean(line?.label, 120), amount: Number(String(line?.amount ?? '').replace(/[$,\s]/g, '')) }))
    .filter(line => line.label && Number.isFinite(line.amount) && line.amount >= 0)
    .slice(0, 20);
  return lines;
}

async function reply(res, quoteId, isOwner, extra = {}) {
  const [quote, messages] = await Promise.all([loadQuote(quoteId), listMessages(quoteId)]);
  const [withPhotos] = quote ? await withPhotoUrls([quote]) : [null];
  return res.status(200).json({ ok: true, messages, request: forViewer(withPhotos, isOwner), ...extra });
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  const viewer = await requireSiteAccess(req, res, 'sunwings');
  if (!viewer) return;
  const isOwner = viewer.role === 'owner';
  const by = isOwner ? 'Justin' : 'Marius';

  try {
    if (req.method === 'GET') {
      // Look for new customer replies first (at most every 2 minutes). Never blocks the page.
      let inbox = null;
      try { inbox = await checkInbox({ force: req.query?.check === 'now' }); }
      catch (error) { console.error('[sunwings] inbox check failed', error); inbox = { error: isOwner ? error.message : 'Could not check for replies.' }; }
      const id = clean(req.query?.id, 80);
      if (!id) return res.status(200).json({ ok: true, inbox });
      if (!(await canSee(viewer, id))) return res.status(404).json({ error: 'That job is not available.' });
      if (isOwner) {
        const quote = await loadQuote(id);
        if (quote?.customer_reply_unseen) await touchQuote(id, { customer_reply_unseen: false });
      }
      return reply(res, id, isOwner, { inbox });
    }

    const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
    const id = clean(body.id, 80);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !(await canSee(viewer, id))) return res.status(404).json({ error: 'That job is not available.' });
    const quote = await loadQuote(id);
    if (!quote) return res.status(404).json({ error: 'That job is not available.' });
    const now = new Date().toISOString();
    const action = clean(body.action, 20);

    // Anything Marius does shows for Justin as "Marius updated", and moves a fresh job to "Getting details".
    const common = {
      last_message_at: now, last_message_by: by, last_activity_at: now,
      ...(isOwner ? {} : { partner_updated_at: now, partner_update_unseen: true }),
      ...(!isOwner && ['forwarded', 'reviewing', 'needs_quote'].includes(quote.status) ? { status: 'marius_working', status_changed_at: now } : {}),
    };

    if (action === 'note') {
      const text = clean(body.body, 8000);
      if (!text) return res.status(400).json({ error: 'Write a note first.' });
      await saveMessage(id, { kind: 'note', author: by, body: text });
      await touchQuote(id, { ...common, last_activity: `Note from ${by}` });
      return reply(res, id, isOwner);
    }

    if (action === 'email') {
      const subject = clean(body.subject, 200);
      const text = clean(body.body, 8000);
      if (!text) return res.status(400).json({ error: 'Write a message first.' });
      const sent = await emailCustomer(quote, { subject: subject || `Your ${quote.service || 'Sunwings Transport'} request`, body: text, by });
      const review = body.review === true;
      await saveMessage(id, { kind: 'email_out', author: by, subject: subject || null, body: text, to_email: sent.to, from_email: sent.from, ref: sent.ref, email_message_id: sent.messageId, meta: review ? { review: true } : {} });
      await touchQuote(id, {
        ...common, last_activity: review ? `Google review request sent by ${by}` : `Email to customer from ${by}`,
        ...(review ? { last_follow_up_at: now, follow_up_count: Number(quote.follow_up_count || 0) + 1 } : {}),
        ...(quote.contacted_at ? {} : { contacted_at: now }),
        ...(quote.status === 'new' && isOwner ? { status: 'contacted', status_changed_at: now } : {}),
      });
      return reply(res, id, isOwner);
    }

    if (action === 'quote') {
      if (quote.request_type === 'contact') return res.status(400).json({ error: 'Contact messages can’t get a quote.' });
      const lines = quoteLines(body);
      if (!lines.length) return res.status(400).json({ error: 'Add at least one line with a price.' });
      const total = Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
      const validDays = Math.min(Math.max(Number(body.validDays) || 14, 1), 90);
      const includes = clean(body.includes, 2000);
      const pdf = await quotePdf(quote, { lines, total, includes, validDays, by });
      const text = quoteEmailBody(quote, { message: body.message, lines, total, validDays });
      const sent = await emailCustomer(quote, {
        subject: `Your Sunwings Transport quote: ${money(total)}`, body: text, by, title: 'Your quote',
        attachments: [{ filename: `Sunwings-Quote-${refOf(quote.id)}.pdf`, content: pdf, contentType: 'application/pdf' }],
      });
      await saveMessage(id, {
        kind: 'quote', author: by, subject: `Quote ${money(total)}`, body: text, amount: total, lines,
        to_email: sent.to, from_email: sent.from, ref: sent.ref, email_message_id: sent.messageId,
        meta: { includes, validDays, pdf: `Sunwings-Quote-${refOf(quote.id)}.pdf` },
      });
      await touchQuote(id, {
        ...common, status: 'quote_sent', status_changed_at: now, quote_amount: total,
        ...(isOwner ? {} : { partner_price: total, partner_status: 'priced' }),
        last_activity: `Quote ${money(total)} sent by ${by}`,
      });
      return reply(res, id, isOwner);
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (error) {
    console.error('[sunwings] quote messages failed', error);
    return res.status(502).json({ error: error.message || 'Something went wrong. Nothing was sent.' });
  }
}
