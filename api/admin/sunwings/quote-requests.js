import { requireSiteAccess } from '../../_lib/websiteAdmin.js';
import { airtableConfigured, makeConfigured, readMariusUpdates, sendJobToMake, stepFromJobStatus } from '../../_lib/sunwingsMarius.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { withPhotoUrls } from '../../_lib/sunwingsPhotos.js';
import { parseSupabase, SITE_KEY } from './_lib/content.js';

const BASE_FIELDS = [
  'site_key','id','request_type','name','phone','email','service','move_from','move_to',
  'preferred_date','preferred_time','move_size',
  'pickup_address','pickup_city','pickup_postal_code','pickup_elevator','pickup_stairs',
  'dropoff_address','dropoff_city','dropoff_postal_code','dropoff_elevator','dropoff_stairs',
  'item_list','message','status','priority','admin_notes','contacted_at','status_changed_at',
  'quote_number','quote_amount','next_action','next_action_due_at','last_activity','last_activity_at',
  'email_notified_at','email_notification_error','created_at','updated_at',
];
// Added by migration 20261103 (Marius jobs & commission). Until that SQL has run,
// requests fall back to BASE_FIELDS so Quote Requests keeps working.
const NEW_FIELDS = [
  'forwarded_at','partner_price','partner_status','partner_note','partner_updated_at','partner_update_unseen',
  'contact_shared','contact_shared_at','final_price','commission_rate','commission_status',
  'commission_paid_at','commission_paid_method'
];
// Added by migrations 20261105 (quote photos) and 20261106 (where the quote came from).
const PHOTO_FIELDS = ['photos', 'lead_source'];
const ALL_FIELDS = [...BASE_FIELDS, ...NEW_FIELDS, ...PHOTO_FIELDS].join(',');
const FIELDS = [...BASE_FIELDS, ...NEW_FIELDS].join(',');
const OLD_FIELDS = BASE_FIELDS.join(',');

// Run a request with all fields; if the database doesn't have the new columns yet
// (Postgres error 42703), run it again with only the original fields.
async function withFieldFallback(token, buildPath, options) {
  let response;
  for (const fields of [ALL_FIELDS, FIELDS, OLD_FIELDS]) {
    response = await supabaseUserRest(token, buildPath(fields), options);
    if (response.status !== 400) return response;
    const text = await response.clone().text().catch(() => '');
    if (!text.includes('42703')) return response;
  }
  return response;
}

// Until migration 20261103 has run, the database only accepts its original four
// statuses. Save the closest one and remember the real step in last_activity, so the
// admin still shows the right step. Once the migration runs, real statuses save directly.
const LEGACY_STATUS = {
  new: 'new', reviewing: 'contacted', forwarded: 'contacted', priced: 'contacted', needs_quote: 'contacted', contacted: 'contacted',
  quote_sent: 'quoted', accepted: 'quoted', booked: 'quoted', quoted: 'quoted',
  complete: 'closed', declined: 'closed', cancelled: 'closed', closed: 'closed',
};
const STEP_MARK = /^Status changed to ([a-z_ ]+)$/;

function withRealStatus(row) {
  if (!row || !['contacted', 'quoted', 'closed'].includes(row.status)) return row;
  const match = STEP_MARK.exec(String(row.last_activity || ''));
  const real = match && match[1].trim().replace(/ /g, '_');
  return real && LEGACY_STATUS[real] === row.status ? { ...row, status: real } : row;
}

const STATUSES = new Set([
  'new','reviewing','forwarded','priced','needs_quote','contacted','quote_sent',
  'accepted','booked','complete','declined','cancelled'
]);
const COMMISSION_STATUSES = new Set(['owed','paid','none']);

function nullableMoney(value) {
  const raw = clean(value, 40).replace(/[$,\s]/g, '');
  if (!raw) return null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

function nullableDate(value) {
  const raw = clean(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}
const PRIORITIES = new Set(['low','normal','high']);

function clean(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

function nullableIso(value) {
  const raw = clean(value, 80);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Editors (e.g. Marius) only see jobs Justin has sent them, never Justin's private notes or
// commission. Only the owner sees every request and can forward, delete or set commission.
const OWNER_ONLY_FIELDS = ['admin_notes', 'commission_rate', 'commission_status', 'commission_paid_at', 'commission_paid_method', 'partner_update_unseen'];
const OWNER_ONLY_INPUTS = ['forward', 'shareContact', 'markPartnerSeen', 'commissionRate', 'commissionStatus', 'commissionPaidAt', 'commissionPaidMethod', 'adminNotes'];

function forViewer(row, isOwner) {
  if (!row || isOwner) return row;
  const copy = { ...row };
  OWNER_ONLY_FIELDS.forEach(key => { delete copy[key]; });
  return copy;
}

// Pull Marius's Job Status / Job Date / Final Price from his Airtable into forwarded jobs.
// Only writes when something changed, and flags it as "Marius updated". Never blocks the page.
async function syncFromAirtable(token, rows) {
  if (!airtableConfigured()) return rows;
  const sent = rows.filter(row => row.forwarded_at);
  if (!sent.length) return rows;
  let updates = {};
  try { updates = await readMariusUpdates(sent.map(row => row.id)); }
  catch (error) { console.error('[sunwings] airtable read failed', error.message); return rows; }

  const changed = new Map();
  for (const row of sent) {
    const update = updates[row.id];
    if (!update || (!update.jobStatus && !update.jobDate && update.finalPrice == null)) continue;
    const step = stepFromJobStatus(update.jobStatus);
    const note = ['From Marius’s Airtable', update.jobStatus && `Job status: ${update.jobStatus}`, update.jobDate && `Job date: ${update.jobDate}`].filter(Boolean).join(' · ');
    const patch = {};
    if (note !== (row.partner_note || '')) patch.partner_note = note;
    if (step && step !== row.partner_status) patch.partner_status = step;
    if (update.finalPrice != null && Number(update.finalPrice) !== Number(row.final_price)) patch.final_price = update.finalPrice;
    if (step && step !== 'priced' && step !== row.status) { patch.status = step; patch.status_changed_at = new Date().toISOString(); }
    if (!Object.keys(patch).length) continue;
    const now = new Date().toISOString();
    Object.assign(patch, { partner_updated_at: now, partner_update_unseen: true, last_activity: 'Marius updated the job (Airtable)', last_activity_at: now, updated_at: now });
    try {
      const response = await supabaseUserRest(token, `sunwings_quote_requests?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(row.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch),
      });
      if (response.ok) changed.set(row.id, patch);
    } catch (error) { console.error('[sunwings] airtable write failed', error.message); }
  }
  return changed.size ? rows.map(row => changed.has(row.id) ? { ...row, ...changed.get(row.id) } : row) : rows;
}

export default async function handler(req, res) {
  if (!['GET','POST','DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireSiteAccess(req, res, 'sunwings');
  if (!owner) return;
  const isOwner = owner.role === 'owner';
  const sentOnly = isOwner ? '' : '&forwarded_at=not.is.null';

  try {
    if (req.method === 'GET') {
      const requests = await parseSupabase(
        await withFieldFallback(
          owner.accessToken,
          fields => `sunwings_quote_requests?site_key=eq.${SITE_KEY}&select=${encodeURIComponent(fields)}${sentOnly}&order=created_at.desc`,
          { method: 'GET' },
        ),
        'Unable to load Sunwings quote requests.',
      );
      const synced = isOwner && Array.isArray(requests) ? await syncFromAirtable(owner.accessToken, requests) : requests;
      const withPhotos = await withPhotoUrls(synced);
      return res.status(200).json({ requests: Array.isArray(withPhotos) ? withPhotos.map(row => forViewer(withRealStatus(row), isOwner)) : withPhotos });
    }

    const id = clean(req.method === 'DELETE' ? req.query?.id : req.body?.id, 80);
    if (!id) return res.status(400).json({ error: 'Missing quote request id.' });

    if (req.method === 'DELETE') {
      if (!isOwner) return res.status(403).json({ error: 'Only Justin can delete requests.' });
      const response = await supabaseUserRest(
        owner.accessToken,
        `sunwings_quote_requests?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}`,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Unable to delete quote request.');
      }
      return res.status(200).json({ ok: true });
    }

    const now = new Date().toISOString();
    const payload = { updated_at: now };
    let activity = '';

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'status')) {
      const status = clean(req.body.status, 40);
      if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid quote request status.' });
      payload.status = status;
      payload.status_changed_at = now;
      if (status === 'contacted') payload.contacted_at = now;
      activity = `Status changed to ${status.replace(/_/g, ' ')}`;
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'priority')) {
      const priority = clean(req.body.priority, 20);
      if (!PRIORITIES.has(priority)) return res.status(400).json({ error: 'Invalid priority.' });
      payload.priority = priority;
    }

    if (isOwner && Object.prototype.hasOwnProperty.call(req.body || {}, 'adminNotes')) payload.admin_notes = clean(req.body.adminNotes, 12000);
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'quoteNumber')) payload.quote_number = clean(req.body.quoteNumber, 80) || null;

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'quoteAmount')) {
      const raw = clean(req.body.quoteAmount, 40);
      if (!raw) payload.quote_amount = null;
      else {
        const amount = Number(raw);
        if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Enter a valid quote amount.' });
        payload.quote_amount = amount;
      }
      if (!activity) activity = 'Quote details updated';
    }

    const body = { ...(req.body || {}) };
    if (!isOwner) OWNER_ONLY_INPUTS.forEach(key => { delete body[key]; });
    const has = key => Object.prototype.hasOwnProperty.call(body, key);

    // Send to Marius: the job appears in his "Jobs from Justin" (without contact details).
    if (body.forward === true) {
      // Send the job into Marius's Make → Airtable first; only record it as sent if that worked.
      if (makeConfigured()) {
        const rows = await parseSupabase(
          await supabaseUserRest(owner.accessToken, `sunwings_quote_requests?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}&select=*`, { method: 'GET' }),
          'Unable to load the job.',
        );
        const job = Array.isArray(rows) ? rows[0] : rows;
        if (!job) return res.status(404).json({ error: 'Quote request not found.' });
        await sendJobToMake(job);
      }
      payload.forwarded_at = now;
      if (!has('status')) { payload.status = 'forwarded'; payload.status_changed_at = now; }
      activity = 'Sent to Marius';
    }
    if (has('shareContact')) {
      payload.contact_shared = body.shareContact === true;
      payload.contact_shared_at = body.shareContact === true ? now : null;
      activity = body.shareContact === true ? 'Customer contact shared with Marius' : 'Customer contact hidden from Marius';
    }
    if (body.markPartnerSeen === true) payload.partner_update_unseen = false;

    for (const [key, column] of [['partnerPrice', 'partner_price'], ['finalPrice', 'final_price'], ['commissionRate', 'commission_rate']]) {
      if (!has(key)) continue;
      const amount = nullableMoney(body[key]);
      if (amount === undefined) return res.status(400).json({ error: 'Enter a valid amount.' });
      payload[column] = amount;
    }
    if (has('commissionStatus')) {
      const value = clean(body.commissionStatus, 10);
      if (!COMMISSION_STATUSES.has(value)) return res.status(400).json({ error: 'Invalid commission status.' });
      payload.commission_status = value;
    }
    if (has('commissionPaidAt')) payload.commission_paid_at = nullableDate(body.commissionPaidAt);
    if (has('commissionPaidMethod')) payload.commission_paid_method = clean(body.commissionPaidMethod, 40);

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'nextAction')) payload.next_action = clean(req.body.nextAction, 1000) || null;
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'nextActionDueAt')) payload.next_action_due_at = nullableIso(req.body.nextActionDueAt);

    // An editor's save shows up for Justin as "Marius updated this job".
    if (!isOwner) {
      payload.partner_updated_at = now;
      payload.partner_update_unseen = true;
      if (!activity) activity = 'Marius updated the job';
    }

    if (activity) {
      payload.last_activity = activity;
      payload.last_activity_at = now;
    }

    const patchPath = fields => `sunwings_quote_requests?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}${sentOnly}&select=${encodeURIComponent(fields)}`;
    const patch = body => withFieldFallback(owner.accessToken, patchPath, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
    let response = await patch(payload);
    if (response.status === 400 && payload.status && LEGACY_STATUS[payload.status] !== payload.status) {
      const text = await response.clone().text().catch(() => '');
      if (text.includes('status_check')) {
        response = await patch({
          ...payload,
          status: LEGACY_STATUS[payload.status],
          last_activity: `Status changed to ${payload.status.replace(/_/g, ' ')}`,
          last_activity_at: now,
        });
      }
    }
    const rows = await parseSupabase(response, 'Unable to update Sunwings quote request.');
    const row = Array.isArray(rows) ? rows[0] || null : rows;
    if (!row) return res.status(404).json({ error: 'That job is not available.' });
    const [withPhotos] = await withPhotoUrls([row]);
    return res.status(200).json({ request: forViewer(withRealStatus(withPhotos), isOwner) });
  } catch (error) {
    console.error('[sunwings] quote requests failed', error);
    return res.status(500).json({ error: error.message || 'Quote request failed.' });
  }
}
