import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../_lib/supabase.js';

const SIGNALS = new Set(['STRONG', 'TEST', 'WATCH', 'SKIP']);
const STATUSES = new Set(['researching', 'contacted', 'negotiating', 'bought', 'passed', 'sold']);

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

function numberOrNull(value) {
  if (value === '' || value === undefined || value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function parseSupabase(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || fallback);
  return payload;
}

function sourceSlug(platform) {
  const value = clean(platform, 80).toLowerCase();
  if (value.includes('facebook')) return 'facebook-marketplace';
  if (value.includes('kijiji')) return 'kijiji-local';
  return null;
}

const SELECT = [
  'id','source_slug','title','category','condition','buy_price','quantity','unit_cost','retail_reference',
  'signal','status','url','location','shipping_note','notes','checked_at','source_platform','seller_name',
  'estimated_resale_low','estimated_resale_high','target_offer','priority','image_url','source_posted_at',
  'last_seen_at','is_bundle','strategy','admin_status','manual_notes','created_at'
].join(',');

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  if (req.method === 'GET') {
    try {
      const deals = await parseSupabase(await supabaseUserRest(owner.accessToken, 
        `resale_deals?select=${encodeURIComponent(SELECT)}&order=priority.desc,checked_at.desc&limit=500`,
        { method: 'GET' },
      ), 'Unable to load Inventory Opportunities.');
      return res.status(200).json({ deals: Array.isArray(deals) ? deals : [] });
    } catch (error) {
      console.error('Inventory Opportunities GET failed', error);
      return res.status(500).json({ error: 'Unable to load Inventory Opportunities.' });
    }
  }

  if (req.method === 'POST') {
    const body = readBody(req);
    const title = clean(body.title, 240);
    const url = clean(body.url, 1800);
    if (!title) return res.status(400).json({ error: 'A title is required.' });
    if (!url) return res.status(400).json({ error: 'A listing URL is required.' });

    const signal = clean(body.signal || 'WATCH', 20).toUpperCase();
    if (!SIGNALS.has(signal)) return res.status(400).json({ error: 'Invalid recommendation.' });

    const adminStatus = clean(body.adminStatus || 'researching', 30).toLowerCase();
    if (!STATUSES.has(adminStatus)) return res.status(400).json({ error: 'Invalid inventory status.' });

    const platform = clean(body.sourcePlatform || 'Manual', 80);
    const row = {
      source_slug: sourceSlug(platform),
      title,
      category: clean(body.category || 'General', 120),
      condition: clean(body.condition, 160) || null,
      buy_price: numberOrNull(body.buyPrice),
      quantity: numberOrNull(body.quantity),
      unit_cost: numberOrNull(body.unitCost),
      signal,
      status: 'available',
      url,
      location: clean(body.location, 180) || null,
      notes: clean(body.notes, 5000) || null,
      source_platform: platform,
      seller_name: clean(body.sellerName, 180) || null,
      estimated_resale_low: numberOrNull(body.estimatedResaleLow),
      estimated_resale_high: numberOrNull(body.estimatedResaleHigh),
      target_offer: numberOrNull(body.targetOffer),
      priority: numberOrNull(body.priority) ?? 50,
      image_url: clean(body.imageUrl, 1800) || null,
      is_bundle: Boolean(body.isBundle),
      strategy: clean(body.strategy, 5000) || null,
      admin_status: adminStatus,
      manual_notes: clean(body.manualNotes, 5000) || null,
      checked_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    };

    try {
      const deals = await parseSupabase(await supabaseUserRest(owner.accessToken, 
        `resale_deals?select=${encodeURIComponent(SELECT)}`,
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(row),
        },
      ), 'Unable to add Inventory Opportunities item.');
      return res.status(201).json({ deal: deals?.[0] || null });
    } catch (error) {
      console.error('Inventory Opportunities POST failed', error);
      return res.status(500).json({ error: 'Unable to add Inventory Opportunities item.' });
    }
  }

  if (req.method === 'PATCH') {
    const body = readBody(req);
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'A valid item ID is required.' });

    const patch = { checked_at: new Date().toISOString() };

    if (Object.prototype.hasOwnProperty.call(body, 'adminStatus')) {
      const value = clean(body.adminStatus, 30).toLowerCase();
      if (!STATUSES.has(value)) return res.status(400).json({ error: 'Invalid inventory status.' });
      patch.admin_status = value;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'signal')) {
      const value = clean(body.signal, 20).toUpperCase();
      if (!SIGNALS.has(value)) return res.status(400).json({ error: 'Invalid recommendation.' });
      patch.signal = value;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'targetOffer')) patch.target_offer = numberOrNull(body.targetOffer);
    if (Object.prototype.hasOwnProperty.call(body, 'estimatedResaleLow')) patch.estimated_resale_low = numberOrNull(body.estimatedResaleLow);
    if (Object.prototype.hasOwnProperty.call(body, 'estimatedResaleHigh')) patch.estimated_resale_high = numberOrNull(body.estimatedResaleHigh);
    if (Object.prototype.hasOwnProperty.call(body, 'manualNotes')) patch.manual_notes = clean(body.manualNotes, 5000) || null;
    if (Object.prototype.hasOwnProperty.call(body, 'lastSeenAt')) patch.last_seen_at = body.lastSeenAt ? new Date(body.lastSeenAt).toISOString() : new Date().toISOString();

    try {
      const deals = await parseSupabase(await supabaseUserRest(owner.accessToken, 
        `resale_deals?id=eq.${id}&select=${encodeURIComponent(SELECT)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        },
      ), 'Unable to update Inventory Opportunities item.');
      if (!deals?.[0]) return res.status(404).json({ error: 'Inventory Opportunities item not found.' });
      return res.status(200).json({ deal: deals[0] });
    } catch (error) {
      console.error('Inventory Opportunities PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update Inventory Opportunities item.' });
    }
  }

  if (req.method === 'DELETE') {
    const body = readBody(req);
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'A valid item ID is required.' });

    try {
      const rows = await parseSupabase(await supabaseUserRest(owner.accessToken, 
        `resale_deals?id=eq.${id}&select=id`,
        { method: 'DELETE', headers: { Prefer: 'return=representation' } },
      ), 'Unable to delete Inventory Opportunities item.');
      if (!rows?.[0]) return res.status(404).json({ error: 'Inventory Opportunities item not found.' });
      return res.status(200).json({ ok: true, id });
    } catch (error) {
      console.error('Inventory Opportunities DELETE failed', error);
      return res.status(500).json({ error: 'Unable to delete Inventory Opportunities item.' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
