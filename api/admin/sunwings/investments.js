import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { parseSupabase, SITE_KEY } from './_lib/content.js';

// Justin's money put into Sunwings (flyers, ads, hosting...). Owner only.

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  try {
    if (req.method === 'GET') {
      const investments = await parseSupabase(
        await supabaseUserRest(owner.accessToken, `sunwings_investments?site_key=eq.${SITE_KEY}&select=id,spent_on,amount,category,note,created_at&order=spent_on.desc,created_at.desc`, { method: 'GET' }),
        'Unable to load investments.',
      );
      return res.status(200).json({ investments });
    }
    if (req.method === 'POST') {
      const amount = Number(clean(req.body?.amount, 40).replace(/[$,\s]/g, ''));
      const spentOn = clean(req.body?.spentOn, 20);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Enter an amount.' });
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, 'sunwings_investments', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify([{
            site_key: SITE_KEY,
            amount,
            spent_on: /^\d{4}-\d{2}-\d{2}$/.test(spentOn) ? spentOn : undefined,
            category: clean(req.body?.category, 80),
            note: clean(req.body?.note, 500),
          }]),
        }),
        'Unable to save investment.',
      );
      return res.status(200).json({ investment: Array.isArray(rows) ? rows[0] : rows });
    }
    if (req.method === 'DELETE') {
      const id = clean(req.query?.id, 80);
      if (!id) return res.status(400).json({ error: 'Missing id.' });
      const response = await supabaseUserRest(owner.accessToken, `sunwings_investments?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!response.ok) throw new Error('Unable to delete investment.');
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[sunwings] investments failed', error);
    return res.status(500).json({ error: error.message || 'Investments request failed.' });
  }
}
