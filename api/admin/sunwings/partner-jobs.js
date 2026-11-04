import { getUserFromToken, supabaseUserRest } from '../../_lib/supabase.js';

// Jobs Justin forwarded to a partner (Marius). Everything goes through the database
// functions sunwings_partner_jobs / sunwings_partner_update_job, which check the caller
// is in sunwings_partners and never return customer phone/email unless Justin shared them.

function clean(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function nullableMoney(value) {
  const raw = clean(value, 40).replace(/[$,\s]/g, '');
  if (!raw) return null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

async function rpc(token, name, args) {
  const response = await supabaseUserRest(token, `rpc/${name}`, { method: 'POST', body: JSON.stringify(args || {}) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.message || '');
    if (message.includes('not_a_partner')) { const error = new Error('Not found'); error.status = 404; throw error; }
    if (message.includes('job_not_found')) { const error = new Error('That job is no longer available.'); error.status = 404; throw error; }
    if (message.includes('invalid_status')) { const error = new Error('Invalid status.'); error.status = 400; throw error; }
    throw new Error(message || 'Partner jobs request failed.');
  }
  return payload;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const authorization = String(req.headers.authorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  res.setHeader('Cache-Control', 'no-store');
  if (!(await getUserFromToken(token))) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ jobs: await rpc(token, 'sunwings_partner_jobs') });
    }
    const body = req.body || {};
    const price = nullableMoney(body.partnerPrice);
    const finalPrice = nullableMoney(body.finalPrice);
    if (price === undefined || finalPrice === undefined) return res.status(400).json({ error: 'Enter a valid amount.' });
    await rpc(token, 'sunwings_partner_update_job', {
      p_id: clean(body.id, 80),
      p_price: price,
      p_status: clean(body.partnerStatus, 20),
      p_final_price: finalPrice,
      p_note: clean(body.partnerNote, 4000),
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[sunwings] partner jobs failed', error);
    return res.status(error.status || 500).json({ error: error.message || 'Partner jobs request failed.' });
  }
}
