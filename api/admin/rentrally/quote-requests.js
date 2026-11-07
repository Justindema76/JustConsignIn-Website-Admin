import { requireSiteAccess } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { QUOTE_FIELDS, QUOTE_STATUSES, SITE_KEY, TABLES, deleteRow, listRows, parseSupabase, text } from './_lib/content.js';

// Quotes are created by the public website (anon insert, RLS-limited to status 'new').
// The admin lists them, moves them through the status steps, records the quoted
// amount and private notes, and can delete spam.
const STATUSES = new Set(QUOTE_STATUSES);

function amountOrNull(value) {
  const raw = String(value ?? '').replace(/[$,\s]/g, '');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const access = await requireSiteAccess(req, res, SITE_KEY);
  if (!access) return;

  try {
    if (req.method === 'GET') {
      const requests = await listRows(access.accessToken, TABLES.quotes, QUOTE_FIELDS, { order: 'created_at.desc' });
      return res.status(200).json({ requests });
    }

    if (req.method === 'DELETE') {
      return res.status(200).json(await deleteRow(access.accessToken, TABLES.quotes, text(req.query?.id, 100)));
    }

    const body = req.body || {};
    const id = text(body.id, 100);
    if (!id) return res.status(400).json({ error: 'Missing quote request id.' });

    const patch = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) {
      if (!STATUSES.has(body.status)) return res.status(400).json({ error: 'Unknown status.' });
      patch.status = body.status;
    }
    if (body.quoteAmount !== undefined || body.quote_amount !== undefined) {
      patch.quote_amount = amountOrNull(body.quoteAmount ?? body.quote_amount);
    }
    if (body.adminNotes !== undefined || body.admin_notes !== undefined) {
      patch.admin_notes = text(body.adminNotes ?? body.admin_notes, 5000);
    }

    const rows = await parseSupabase(
      await supabaseUserRest(
        access.accessToken,
        `${TABLES.quotes}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(QUOTE_FIELDS)}`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) },
      ),
      'Unable to update the quote request.',
    );
    return res.status(200).json({ request: Array.isArray(rows) ? rows[0] || null : rows });
  } catch (error) {
    console.error('[rentrally] quote requests failed', error);
    return res.status(500).json({ error: error.message || 'Quote request failed.' });
  }
}
