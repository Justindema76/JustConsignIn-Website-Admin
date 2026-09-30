import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseRest } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  try {
    const response = await supabaseRest('resale_sources?select=id,slug,name,city,address,website,source_type,categories,priority,notes,checked_at&order=priority.desc,name.asc', { method: 'GET' });
    const payload = await response.json().catch(() => ([]));
    if (!response.ok) throw new Error(payload?.message || 'Unable to load Inventory Sources.');
    return res.status(200).json({ sources: Array.isArray(payload) ? payload : [] });
  } catch (error) {
    console.error('Inventory Sources GET failed', error);
    return res.status(500).json({ error: 'Unable to load Inventory Sources.' });
  }
}
