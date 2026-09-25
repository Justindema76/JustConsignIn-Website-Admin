import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../_lib/supabase.js';

const SITE_KEY = 'justindematteis';
const SELECT = 'id,site_key,name,email,active,sort_order,created_at,updated_at';

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function clean(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function parseSupabase(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || fallback);
  return payload;
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  if (req.method === 'GET') {
    try {
      const query = `agency_departments?site_key=eq.${encodeURIComponent(SITE_KEY)}&select=${encodeURIComponent(SELECT)}&order=sort_order.asc,name.asc`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, { method: 'GET' }),
        'Unable to load departments.',
      );
      return res.status(200).json({ departments: Array.isArray(rows) ? rows : [] });
    } catch (error) {
      console.error('Departments GET failed', error);
      return res.status(500).json({ error: 'Unable to load departments.' });
    }
  }

  if (req.method === 'POST') {
    const body = readBody(req);
    const name = clean(body.name, 120);
    const email = clean(body.email, 320).toLowerCase();
    const active = body.active !== false;
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

    if (!name || !validEmail(email)) {
      return res.status(400).json({ error: 'Department name and valid email are required.' });
    }

    try {
      const query = `agency_departments?select=${encodeURIComponent(SELECT)}`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ site_key: SITE_KEY, name, email, active, sort_order: sortOrder }),
        }),
        'Unable to create department.',
      );
      return res.status(201).json({ department: rows?.[0] || null });
    } catch (error) {
      console.error('Departments POST failed', error);
      return res.status(500).json({ error: 'Unable to create department. The department name may already exist.' });
    }
  }

  if (req.method === 'PATCH') {
    const body = readBody(req);
    const id = clean(body.id, 80);
    if (!validUuid(id)) return res.status(400).json({ error: 'A valid department ID is required.' });

    const patch = { updated_at: new Date().toISOString() };
    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const name = clean(body.name, 120);
      if (!name) return res.status(400).json({ error: 'Department name is required.' });
      patch.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'email')) {
      const email = clean(body.email, 320).toLowerCase();
      if (!validEmail(email)) return res.status(400).json({ error: 'A valid department email is required.' });
      patch.email = email;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'active')) patch.active = body.active !== false;
    if (Object.prototype.hasOwnProperty.call(body, 'sortOrder')) patch.sort_order = Number(body.sortOrder) || 0;

    try {
      const query = `agency_departments?id=eq.${encodeURIComponent(id)}&site_key=eq.${encodeURIComponent(SITE_KEY)}&select=${encodeURIComponent(SELECT)}`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        }),
        'Unable to update department.',
      );
      if (!rows?.[0]) return res.status(404).json({ error: 'Department not found.' });
      return res.status(200).json({ department: rows[0] });
    } catch (error) {
      console.error('Departments PATCH failed', error);
      return res.status(500).json({ error: 'Unable to update department.' });
    }
  }

  if (req.method === 'DELETE') {
    const body = readBody(req);
    const id = clean(body.id, 80);
    if (!validUuid(id)) return res.status(400).json({ error: 'A valid department ID is required.' });

    try {
      const query = `agency_departments?id=eq.${encodeURIComponent(id)}&site_key=eq.${encodeURIComponent(SITE_KEY)}&select=id`;
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, query, {
          method: 'DELETE',
          headers: { Prefer: 'return=representation' },
        }),
        'Unable to delete department.',
      );
      if (!rows?.[0]) return res.status(404).json({ error: 'Department not found.' });
      return res.status(200).json({ ok: true, id: rows[0].id });
    } catch (error) {
      console.error('Departments DELETE failed', error);
      return res.status(500).json({ error: 'Unable to delete department.' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
