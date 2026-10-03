import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { parseSupabase, SITE_KEY } from './_lib/content.js';

const FIELDS = 'site_key,id,name,phone,email,service,move_from,move_to,preferred_date,move_size,message,status,email_notified_at,email_notification_error,created_at,updated_at';

export default async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
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

    const id = String(req.body?.id || '').trim();
    const allowed = new Set(['new','contacted','quoted','closed']);
    const status = allowed.has(req.body?.status) ? req.body.status : 'new';
    if (!id) return res.status(400).json({ error: 'Missing quote request id.' });

    const rows = await parseSupabase(
      await supabaseUserRest(
        owner.accessToken,
        `sunwings_quote_requests?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(FIELDS)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
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
