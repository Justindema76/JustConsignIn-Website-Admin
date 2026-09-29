import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../_lib/supabase.js';

const PRIORITIES = new Set(['STRONG', 'ACTIVE', 'WATCH']);
const STATUSES = new Set(['new', 'contacted', 'interested', 'passed', 'sold']);
const TYPES = new Set(['business', 'community', 'individual']);

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function clean(value, max = 4000) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

async function parseSupabase(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || fallback);
  return payload;
}

const SELECT = [
  'id','name','lead_type','platform','url','location','wanted_items','contact_method',
  'contact_value','notes','priority','status','source_posted_at','checked_at','created_at'
].join(',');

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  if (req.method === 'GET') {
    try {
      const leads = await parseSupabase(await supabaseUserRest(owner.accessToken, 
        `buyer_leads?select=${encodeURIComponent(SELECT)}&order=checked_at.desc&limit=500`,
        { method: 'GET' },
      ), 'Unable to load Buyer Leads.');
      return res.status(200).json({ leads: Array.isArray(leads) ? leads : [] });
    } catch (error) {
      console.error('Buyer Leads GET failed', error);
      return res.status(500).json({ error: 'Unable to load Buyer Leads.' });
    }
  }

  if (req.method === 'POST') {
    const body = readBody(req);
    const name = clean(body.name, 240);
    if (!name) return res.status(400).json({ error: 'A buyer or community name is required.' });

    const priority = clean(body.priority || 'WATCH', 20).toUpperCase();
    const status = clean(body.status || 'new', 30).toLowerCase();
    const leadType = clean(body.leadType || 'business', 30).toLowerCase();
    if (!PRIORITIES.has(priority)) return res.status(400).json({ error: 'Invalid priority.' });
    if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid status.' });
    if (!TYPES.has(leadType)) return res.status(400).json({ error: 'Invalid lead type.' });

    const row = {
      name,
      lead_type: leadType,
      platform: clean(body.platform, 120) || null,
      url: clean(body.url, 1800) || null,
      location: clean(body.location, 180) || null,
      wanted_items: clean(body.wantedItems, 5000) || null,
      contact_method: clean(body.contactMethod, 120) || null,
      contact_value: clean(body.contactValue, 500) || null,
      notes: clean(body.notes, 5000) || null,
      priority,
      status,
      source_posted_at: body.sourcePostedAt ? new Date(body.sourcePostedAt).toISOString() : null,
      checked_at: new Date().toISOString(),
    };

    try {
      const leads = await parseSupabase(await supabaseUserRest(owner.accessToken, 
        `buyer_leads?select=${encodeURIComponent(SELECT)}`,
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(row),
        },
      ), 'Unable to add Buyer Lead.');
      return res.status(201).json({ lead: leads?.[0] || null });
    } catch (error) {
      console.error('Buyer Leads POST failed', error);
      return res.status(500).json({ error: 'Unable to add Buyer Lead.' });
    }
  }

  if (req.method === 'PATCH') {
    const body = readBody(req);
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'A valid lead ID is required.' });

    const patch = { checked_at: new Date().toISOString() };
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const value = clean(body.status, 30).toLowerCase();
      if (!STATUSES.has(value)) return res.status(400).json({ error: 'Invalid status.' });
      patch.status = value;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'priority')) {
      const value = clean(body.priority, 20).toUpperCase();
      if (!PRIORITIES.has(value)) return res.status(400).json({ error: 'Invalid priority.' });
      patch.priority = value;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'notes')) patch.notes = clean(body.notes, 5000) || null;

    try {
      const leads = await parseSupabase(await supabaseUserRest(owner.accessToken, 
        `buyer_leads?id=eq.${id}&select=${encodeURIComponent(SELECT)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        },
      ), 'Unable to update Buyer Lead.');
      if (!leads?.[0]) return res.status(404).json({ error: 'Buyer Lead not found.' });
      return res.status(200).json({ lead: leads[0] });
    } catch (error) {
      console.error('Buyer Leads PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update Buyer Lead.' });
    }
  }

  if (req.method === 'DELETE') {
    const body = readBody(req);
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'A valid lead ID is required.' });

    try {
      const rows = await parseSupabase(await supabaseUserRest(owner.accessToken, 
        `buyer_leads?id=eq.${id}&select=id`,
        { method: 'DELETE', headers: { Prefer: 'return=representation' } },
      ), 'Unable to delete Buyer Lead.');
      if (!rows?.[0]) return res.status(404).json({ error: 'Buyer Lead not found.' });
      return res.status(200).json({ ok: true, id });
    } catch (error) {
      console.error('Buyer Leads DELETE failed', error);
      return res.status(500).json({ error: 'Unable to delete Buyer Lead.' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
