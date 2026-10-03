import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { parseSupabase, SITE_KEY } from './_lib/content.js';

const FIELDS = [
  'site_key','id','name','phone','email','service','move_from','move_to',
  'preferred_date','preferred_time','move_size',
  'pickup_address','pickup_city','pickup_postal_code','pickup_elevator','pickup_stairs',
  'dropoff_address','dropoff_city','dropoff_postal_code','dropoff_elevator','dropoff_stairs',
  'item_list','message','status','priority','admin_notes','contacted_at','status_changed_at',
  'quote_number','quote_amount','next_action','next_action_due_at','last_activity','last_activity_at',
  'email_notified_at','email_notification_error','created_at','updated_at'
].join(',');

const STATUSES = new Set([
  'new','reviewing','needs_quote','contacted','quote_sent',
  'accepted','booked','complete','declined','cancelled'
]);
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

export default async function handler(req, res) {
  if (!['GET','POST','DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  try {
    if (req.method === 'GET') {
      const requests = await parseSupabase(
        await supabaseUserRest(
          owner.accessToken,
          `sunwings_quote_requests?site_key=eq.${SITE_KEY}&select=${encodeURIComponent(FIELDS)}&order=created_at.desc`,
          { method: 'GET' },
        ),
        'Unable to load Sunwings quote requests.',
      );
      return res.status(200).json({ requests });
    }

    const id = clean(req.method === 'DELETE' ? req.query?.id : req.body?.id, 80);
    if (!id) return res.status(400).json({ error: 'Missing quote request id.' });

    if (req.method === 'DELETE') {
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

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'adminNotes')) payload.admin_notes = clean(req.body.adminNotes, 12000);
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

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'nextAction')) payload.next_action = clean(req.body.nextAction, 1000) || null;
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'nextActionDueAt')) payload.next_action_due_at = nullableIso(req.body.nextActionDueAt);

    if (activity) {
      payload.last_activity = activity;
      payload.last_activity_at = now;
    }

    const rows = await parseSupabase(
      await supabaseUserRest(
        owner.accessToken,
        `sunwings_quote_requests?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(FIELDS)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        },
      ),
      'Unable to update Sunwings quote request.',
    );
    return res.status(200).json({ request: Array.isArray(rows) ? rows[0] || null : rows });
  } catch (error) {
    console.error('[sunwings] quote requests failed', error);
    return res.status(500).json({ error: error.message || 'Quote request failed.' });
  }
}
