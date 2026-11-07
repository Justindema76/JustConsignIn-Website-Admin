import { supabaseUserRest } from '../../../_lib/supabase.js';

// Rent & Rally (placeholder name). Every query is pinned to this site key on the
// server; the browser never chooses the site. Calls run with the signed-in user's
// own token, so the RLS policies in backend/migrations/20261107_rentrally_catalogue.sql
// are enforced at the database too.
export const SITE_KEY = 'rentrally';

export const TABLES = Object.freeze({
  categories: 'rentrally_categories',
  products: 'rentrally_products',
  packages: 'rentrally_packages',
  settings: 'rentrally_site_settings',
  quotes: 'rentrally_quote_requests',
});

export const CATEGORY_FIELDS = 'site_key,id,slug,name,blurb,image,seo_title,seo_description,status,sort_order,created_at,updated_at';

export const PRODUCT_FIELDS = [
  'site_key','id','slug','category_slug','sku','name','images','day_rate','buy_price','buy_note','buy_url',
  'badge','description','features','specs','options','related','featured','seo_title','seo_description','status','sort_order',
  'published_at','created_at','updated_at',
].join(',');

export const PACKAGE_FIELDS = [
  'site_key','id','slug','tag','name','hero_image','day_rate','items','description','good_for',
  'seo_title','seo_description','status','sort_order','published_at','created_at','updated_at',
].join(',');

export const QUOTE_FIELDS = [
  'site_key','id','name','business','phone','email','area','notes','lines','estimated_total',
  'status','quote_amount','admin_notes','email_notified_at','email_notification_error','created_at','updated_at',
].join(',');

export const QUOTE_STATUSES = Object.freeze(['new','contacted','quoted','booked','completed','declined','cancelled']);

export async function parseSupabase(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || fallback);
  return data;
}

export function text(value, max = 100000) {
  return String(value ?? '').trim().slice(0, max);
}

export function textArray(value, max = 500) {
  return Array.isArray(value) ? value.map(item => text(item, max)).filter(Boolean) : [];
}

export function slugify(value) {
  return text(value, 180).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function money(value, { nullable = false } = {}) {
  const raw = String(value ?? '').replace(/[$,\s]/g, '');
  if (raw === '') return nullable ? null : 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return nullable ? null : 0;
  return Math.round(amount * 100) / 100;
}

function int(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function publishing(body = {}, defaultStatus = 'draft') {
  const status = body.status === 'published' ? 'published' : body.status === 'draft' ? 'draft' : defaultStatus;
  return {
    status,
    published_at: status === 'published' ? (body.publishedAt || body.published_at || new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  };
}

export function cleanCategory(body = {}) {
  return {
    slug: slugify(body.slug || body.name),
    name: text(body.name, 200),
    blurb: text(body.blurb, 600),
    image: text(body.image, 2000),
    seo_title: text(body.seoTitle ?? body.seo_title, 120),
    seo_description: text(body.seoDescription ?? body.seo_description, 320),
    status: body.status === 'draft' ? 'draft' : 'published',
    sort_order: int(body.sortOrder ?? body.sort_order),
    updated_at: new Date().toISOString(),
  };
}

function cleanSpecs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(row => ({ label: text(row?.label, 120), value: text(row?.value, 500) }))
    .filter(row => row.label && row.value);
}

function cleanOptions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(option => ({
      label: text(option?.label, 80),
      values: (Array.isArray(option?.values) ? option.values : [])
        .map(v => {
          const label = text(typeof v === 'string' ? v : v?.v, 120);
          const img = typeof v === 'object' && v ? int(v.img) : 0;
          return label ? (img > 0 ? { v: label, img } : { v: label }) : null;
        })
        .filter(Boolean),
    }))
    .filter(option => option.label && option.values.length);
}

export function cleanProduct(body = {}) {
  const { published_at, ...rest } = publishing(body);
  return {
    slug: slugify(body.slug || body.name),
    category_slug: slugify(body.categorySlug ?? body.category_slug),
    sku: text(body.sku, 80),
    name: text(body.name, 240),
    images: textArray(body.images, 2000).slice(0, 20),
    day_rate: money(body.dayRate ?? body.day_rate),
    buy_price: money(body.buyPrice ?? body.buy_price, { nullable: true }),
    buy_note: text(body.buyNote ?? body.buy_note, 200),
    buy_url: text(body.buyUrl ?? body.buy_url, 2000),
    badge: text(body.badge, 40),
    description: textArray(body.description, 4000),
    features: textArray(body.features, 300),
    specs: cleanSpecs(body.specs),
    options: cleanOptions(body.options),
    related: textArray(body.related, 180).map(slugify),
    featured: Boolean(body.featured),
    seo_title: text(body.seoTitle ?? body.seo_title, 120),
    seo_description: text(body.seoDescription ?? body.seo_description, 320),
    sort_order: int(body.sortOrder ?? body.sort_order),
    published_at,
    ...rest,
  };
}

export function cleanPackage(body = {}) {
  const items = (Array.isArray(body.items) ? body.items : [])
    .map(item => ({ product: slugify(item?.product), qty: Math.max(1, int(item?.qty) || 1) }))
    .filter(item => item.product);
  const { published_at, ...rest } = publishing(body);
  return {
    slug: slugify(body.slug || body.name),
    tag: text(body.tag, 40),
    name: text(body.name, 240),
    hero_image: text(body.heroImage ?? body.hero_image, 2000),
    day_rate: money(body.dayRate ?? body.day_rate),
    items,
    description: text(body.description, 4000),
    good_for: textArray(body.goodFor ?? body.good_for, 120),
    seo_title: text(body.seoTitle ?? body.seo_title, 120),
    seo_description: text(body.seoDescription ?? body.seo_description, 320),
    sort_order: int(body.sortOrder ?? body.sort_order),
    published_at,
    ...rest,
  };
}

export async function listRows(accessToken, table, fields, { id = '', order = 'sort_order.asc,updated_at.desc' } = {}) {
  const idFilter = id ? `&id=eq.${encodeURIComponent(id)}&limit=1` : '';
  return parseSupabase(
    await supabaseUserRest(accessToken, `${table}?site_key=eq.${SITE_KEY}${idFilter}&select=${encodeURIComponent(fields)}&order=${order}`, { method: 'GET' }),
    `Unable to load ${table}.`,
  );
}

export async function saveRow(accessToken, table, fields, body, cleaner, { requireField = 'name' } = {}) {
  const payload = { ...cleaner(body), site_key: SITE_KEY };
  if (!payload[requireField]) throw new Error('Name is required.');
  if ('slug' in payload && !payload.slug) throw new Error('Slug is required.');

  const id = text(body?.id, 100);
  const path = id
    ? `${table}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(fields)}`
    : `${table}?select=${encodeURIComponent(fields)}`;

  const rows = await parseSupabase(
    await supabaseUserRest(accessToken, path, {
      method: id ? 'PATCH' : 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    }),
    `Unable to save ${table}.`,
  );
  return Array.isArray(rows) ? rows[0] || null : rows;
}

export async function deleteRow(accessToken, table, id) {
  if (!id) throw new Error('Missing id.');
  await parseSupabase(
    await supabaseUserRest(accessToken, `${table}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    }),
    `Unable to delete from ${table}.`,
  );
  return { ok: true };
}

// One handler shape for categories / products / packages:
// GET (list or ?id=), POST (create or update with body.id), DELETE ?id=
export function crudHandler({ table, fields, cleaner, key, label }) {
  return async function handler(req, res, access) {
    try {
      if (req.method === 'GET') {
        const rows = await listRows(access.accessToken, table, fields, { id: text(req.query?.id, 100) });
        return res.status(200).json({ [key]: rows });
      }
      if (req.method === 'DELETE') {
        return res.status(200).json(await deleteRow(access.accessToken, table, text(req.query?.id, 100)));
      }
      const row = await saveRow(access.accessToken, table, fields, req.body || {}, cleaner);
      return res.status(200).json({ row });
    } catch (error) {
      console.error(`[rentrally] ${label} failed`, error);
      const duplicate = /duplicate key|unique/i.test(error.message || '');
      return res.status(duplicate ? 409 : 500).json({
        error: duplicate ? 'That slug is already used. Pick a different one.' : (error.message || `${label} request failed.`),
      });
    }
  };
}
