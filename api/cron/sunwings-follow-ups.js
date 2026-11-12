import { supabaseSecret, supabaseUrl } from '../_lib/supabase.js';

// Runs once a day (vercel.json → crons). Sends Sunwings customers one automatic reminder
// 3 days after their quote was sent, if they haven't answered. Safe to run twice:
// each quote only ever gets one automatic reminder.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const fromVercelCron = /vercel-cron/i.test(req.headers['user-agent'] || '');
  if (secret ? auth !== `Bearer ${secret}` : !fromVercelCron) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const key = supabaseSecret();
    const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sunwings_auto_nudges', dryRun: req.query?.dry === '1' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[sunwings] automatic follow-ups failed', response.status, payload);
      return res.status(502).json({ error: payload?.error || 'Automatic follow-ups failed.' });
    }
    return res.status(200).json(payload);
  } catch (error) {
    console.error('[sunwings] automatic follow-ups failed', error);
    return res.status(500).json({ error: error.message });
  }
}
