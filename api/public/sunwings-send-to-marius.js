import { supabaseAnon, supabaseUrl } from '../_lib/supabase.js';
import { rateLimit } from '../_lib/rateLimit.js';
import { sendJobToMake } from '../_lib/sunwingsMarius.js';

// Opened from the "Send to Marius" button in the new-quote email.
// GET shows a confirm page (so email link scanners can't send jobs by themselves);
// POST sends the job to Marius's Make/Airtable and records it in the admin.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));

async function rpc(name, args) {
  const key = supabaseAnon();
  const response = await fetch(`${supabaseUrl()}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Unable to reach the job list.');
  return data;
}

function page(res, status, title, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#F6F8FB;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;color:#14213D}
.card{max-width:520px;margin:32px auto;background:#fff;border:1px solid #E3E9F2;border-radius:16px;overflow:hidden}
.head{background:#0B2545;color:#fff;padding:20px 24px}.head small{display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#FDB833}
.head h1{margin:6px 0 0;font-size:22px}.body{padding:20px 24px}dl{margin:0 0 18px}dl div{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #EEF2F7}
dt{width:110px;flex:none;color:#5B6B82;font-weight:700}dd{margin:0}button{width:100%;padding:16px;border:0;border-radius:12px;background:#F97316;color:#fff;font-size:17px;font-weight:800;cursor:pointer}
p{line-height:1.5}.ok{color:#067647;font-weight:800}.muted{color:#5B6B82;font-size:14px}@media(max-width:560px){.card{margin:0;border-radius:0;border:0}}</style></head>
<body><div class="card"><div class="head"><small>Sunwings Transport</small><h1>${esc(title)}</h1></div><div class="body">${body}</div></div></body></html>`);
}

function summary(job) {
  const pickup = [job.pickup_address, job.pickup_city].filter(Boolean).join(', ') || job.move_from || '—';
  const dropoff = [job.dropoff_address, job.dropoff_city].filter(Boolean).join(', ') || job.move_to || '—';
  return `<dl><div><dt>Customer</dt><dd>${esc(job.name)}</dd></div><div><dt>Service</dt><dd>${esc(job.service || '—')}</dd></div>
<div><dt>Date</dt><dd>${esc(job.preferred_date || '—')} ${esc(job.preferred_time || '')}</dd></div><div><dt>Pickup</dt><dd>${esc(pickup)}</dd></div><div><dt>Drop-off</dt><dd>${esc(dropoff)}</dd></div></dl>`;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return page(res, 405, 'Not available', '<p>This link only works from the quote email.</p>');
  if (!rateLimit(req, res, { key: 'sunwings-send-to-marius', limit: 20, windowMs: 60_000 })) return;

  const id = String((req.method === 'POST' ? req.body?.id : req.query?.id) || '').trim();
  const token = String((req.method === 'POST' ? req.body?.t : req.query?.t) || '').trim();
  if (!UUID.test(id) || !UUID.test(token)) return page(res, 404, 'Link not valid', '<p>This link is not valid. Open the job in Website Admin → Quote Requests instead.</p>');

  try {
    const job = await rpc('sunwings_job_by_token', { p_id: id, p_token: token });
    if (!job) return page(res, 404, 'Link not valid', '<p>This job was not found. It may have been deleted.</p>');

    if (job.forwarded_at) {
      return page(res, 200, 'Already sent to Marius', `${summary(job)}<p class="ok">✓ Sent on ${esc(new Date(job.forwarded_at).toLocaleString('en-CA', { timeZone: 'America/Toronto' }))}.</p><p class="muted">Nothing else to do. His updates show in Website Admin → Quote Requests.</p>`);
    }

    if (req.method === 'GET') {
      return page(res, 200, 'Send this job to Marius?', `${summary(job)}
<form method="post"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="t" value="${esc(token)}"><button type="submit">Confirm: send to Marius</button></form>
<p class="muted">Marius gets all the customer details in his job list. This is recorded in Website Admin.</p>`);
    }

    await sendJobToMake(job);
    await rpc('sunwings_mark_sent_by_token', { p_id: id, p_token: token });
    return page(res, 200, 'Sent to Marius', `${summary(job)}<p class="ok">✓ Done. Marius has the job with all the customer’s details.</p><p class="muted">Recorded in Website Admin → Quote Requests. You can close this page.</p>`);
  } catch (error) {
    console.error('[sunwings] send to marius failed', error);
    return page(res, 502, 'Not sent', `<p>The job was <strong>not</strong> sent: ${esc(error.message || 'unknown error')}</p><p class="muted">Try the button again in a minute, or use Send to Marius in Website Admin.</p>`);
  }
}
