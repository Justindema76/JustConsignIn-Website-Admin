// Shared Sunwings job logic: used by the Job Calendar and the Dashboard so they always agree.
import { jobPrice } from './commission';

export const DEFAULT_HOURS = 3;

// Where a request sits in the booking flow. Declined/cancelled jobs and contact
// messages are left off the calendar.
export const STAGE_OF = {
  new: 'new', reviewing: 'new', forwarded: 'new', priced: 'new', needs_quote: 'new', contacted: 'new',
  quote_sent: 'quoted', accepted: 'accepted', booked: 'booked', complete: 'complete',
};

export const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const money = n => (n == null ? '' : '$' + Number(n).toLocaleString('en-CA', { maximumFractionDigits: 2 }));
export const minutes = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
export const hhmm = mins => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
export function fmtTime(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}${m ? ':' + pad(m) : ''}${h >= 12 ? 'pm' : 'am'}`;
}
export const longDate = s => (s ? parse(s).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }) : '');


export function toJob(row) {
  const stage = row.request_type === 'contact' ? null : STAGE_OF[row.status || 'new'];
  if (!stage) return null;
  const from = [row.pickup_city, row.pickup_postal_code].filter(Boolean).join(' ') || row.move_from || '';
  const to = [row.dropoff_city, row.dropoff_postal_code].filter(Boolean).join(' ') || row.move_to || '';
  return {
    id: row.id, row, stage,
    name: row.name || 'No name',
    service: row.service || 'Job',
    price: jobPrice(row),
    from, to,
    date: row.scheduled_date ? String(row.scheduled_date).slice(0, 10) : '',
    start: row.scheduled_start ? String(row.scheduled_start).slice(0, 5) : '',
    hours: Number(row.scheduled_hours) || DEFAULT_HOURS,
    crew: row.crew || '',
    truck: row.truck || '',
    notes: row.crew_notes || '',
    requested: row.preferred_date ? String(row.preferred_date).slice(0, 10) : '',
    reqTime: row.preferred_time || '',
  };
}

// ---- Follow-ups ----
// New requests were promised a reply within 24 hours; quotes with no answer come back after 3 days.
export const HOUR = 3600000, DAY = 86400000;
export const QUOTE_WAIT_DAYS = 3;
export const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
export const shortDay = value => (value ? new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : '');
export function ago(ms) {
  const hours = Math.floor(ms / HOUR);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(ms / DAY);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function followUpOf(job, now) {
  const r = job.row;
  if (job.stage === 'complete') return null;
  const due = r.next_action_due_at ? Date.parse(r.next_action_due_at) : NaN;
  if (Number.isFinite(due)) {
    if (due > now) return null; // snoozed or planned for later
    return { kind: 'due', rank: 1, tag: ['amber', 'Follow-up due'], text: r.next_action || `Planned for ${shortDay(due)}` };
  }
  if (r.status === 'new') {
    const age = now - Date.parse(r.created_at);
    const left = Math.ceil(24 - age / HOUR);
    return left <= 0
      ? { kind: 'reply', rank: 0, tag: ['red', 'Over 24 hrs'], text: `Came in ${ago(age)}. No reply yet.` }
      : { kind: 'reply', rank: 2, tag: ['amber', `Reply within ${left} hr${left === 1 ? '' : 's'}`], text: `Came in ${ago(age)}.` };
  }
  if (job.stage === 'quoted') {
    const last = Math.max(Date.parse(r.status_changed_at) || 0, Date.parse(r.last_follow_up_at) || 0);
    if (!last || now - last < QUOTE_WAIT_DAYS * DAY) return null;
    const days = Math.floor((now - last) / DAY);
    return { kind: 'quote', rank: 3, tag: ['blue', `No answer · ${days} days`], text: r.auto_nudge_sent_at ? `Automatic reminder went out ${shortDay(r.auto_nudge_sent_at)}.` : r.last_follow_up_at ? `You followed up ${shortDay(r.last_follow_up_at)}.` : 'Quote sent, no answer yet.' };
  }
  return null;
}

// Opens Google's "write a review" box for the Sunwings Transport listing.
export const GOOGLE_REVIEW_LINK = 'https://search.google.com/local/writereview?placeid=ChIJXTBVHE3zTkcRiUEmU5P3CsI';

// A finished job has had its review request once a follow-up email went out after it was marked complete.
export function reviewAsked(row) {
  return Boolean(row?.last_follow_up_at && (!row.status_changed_at || Date.parse(row.last_follow_up_at) >= Date.parse(row.status_changed_at)));
}

export function followUpDraft(job) {
  const first = String(job.name || '').trim().split(/\s+/)[0] || 'there';
  const what = `your ${String(job.service || 'move').toLowerCase()}${job.requested ? ` on ${longDate(job.requested)}` : ''}`;
  const sign = '\n\nThanks,\nThe Sunwings Transport team';
  if (job.stage === 'quoted') return {
    subject: 'Following up on your Sunwings Transport quote',
    message: `Hi ${first},\n\nJust following up on the quote we sent for ${what}. Are you still planning to go ahead? If so, reply here and we’ll lock in your date. If anything has changed, let us know and we’ll update the quote.${sign}`,
  };
  if (job.stage === 'new') return {
    subject: 'Your Sunwings Transport quote request',
    message: `Hi ${first},\n\nThanks for your quote request for ${what}. We’d love to help. Is there a good time to call you to go over the details and your price?${sign}`,
  };
  if (job.stage === 'complete') return {
    subject: 'How did we do? A quick favour from Sunwings Transport',
    message: `Hi ${first},\n\nThank you for choosing Sunwings Transport for ${what}. We hope everything went smoothly.\n\nWe’re a small local business and reviews make a big difference. If you were happy with the job, would you take 30 seconds to leave us a Google review?\n\n${GOOGLE_REVIEW_LINK}\n\nIf anything wasn’t right, just reply to this email and we’ll make it right.${sign}`,
  };
  return { subject: 'Your Sunwings Transport job', message: `Hi ${first},\n\n${sign.trim()}` };
}

