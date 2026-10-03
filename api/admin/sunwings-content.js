import { supabaseUserRest } from '../_lib/supabase.js';
import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';

const SITE_KEY = 'sunwings';

const SERVICE_FIELDS = [
  'site_key','id','slug','title','eyebrow','hero_title','hero_description','banner_image','banner_alt',
  'intro','body_html','bullets','cta_title','cta_text','seo_title','seo_description','og_image',
  'status','sort_order','published_at','created_at','updated_at'
].join(',');

const LOCATION_FIELDS = [
  'site_key','id','slug','title','region','eyebrow','hero_title','hero_description','banner_image','banner_alt',
  'intro','body_html','neighbourhoods','service_slugs','faq','cta_title','cta_text','seo_title',
  'seo_description','og_image','status','sort_order','published_at','created_at','updated_at'
].join(',');

function cleanText(value, max = 100000) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanArray(value) {
  return Array.isArray(value) ? value.map(item => cleanText(item, 500)).filter(Boolean) : [];
}

function publishFields(body = {}) {
  const status = body.status === 'published' ? 'published' : 'draft';
  return {
    status,
    published_at: status === 'published'
      ? (body.publishedAt || body.published_at || new Date().toISOString())
      : null,
    updated_at: new Date().toISOString(),
  };
}

function cleanService(body = {}) {
  return {
    site_key: SITE_KEY,
    slug: cleanText(body.slug, 180),
    title: cleanText(body.title, 240),
    eyebrow: cleanText(body.eyebrow, 180),
    hero_title: cleanText(body.heroTitle ?? body.hero_title, 300),
    hero_description: cleanText(body.heroDescription ?? body.hero_description, 1200),
    banner_image: cleanText(body.bannerImage ?? body.banner_image, 2000),
    banner_alt: cleanText(body.bannerAlt ?? body.banner_alt, 300),
    intro: cleanText(body.intro, 3000),
    body_html: String(body.bodyHtml ?? body.body_html ?? ''),
    bullets: cleanArray(body.bullets),
    cta_title: cleanText(body.ctaTitle ?? body.cta_title, 300),
    cta_text: cleanText(body.ctaText ?? body.cta_text, 1000),
    seo_title: cleanText(body.seoTitle ?? body.seo_title, 300),
    seo_description: cleanText(body.seoDescription ?? body.seo_description, 1000),
    og_image: cleanText(body.ogImage ?? body.og_image, 2000),
    sort_order: Number.isFinite(Number(body.sortOrder ?? body.sort_order))
      ? Math.trunc(Number(body.sortOrder ?? body.sort_order))
      : 0,
    ...publishFields(body),
  };
}

function cleanLocation(body = {}) {
  const faq = Array.isArray(body.faq)
    ? body.faq
      .map(item => ({
        question: cleanText(item?.question, 500),
        answer: cleanText(item?.answer, 3000),
      }))
      .filter(item => item.question && item.answer)
    : [];

  return {
    site_key: SITE_KEY,
    slug: cleanText(body.slug, 180),
    title: cleanText(body.title, 240),
    region: cleanText(body.region, 240),
    eyebrow: cleanText(body.eyebrow, 180),
    hero_title: cleanText(body.heroTitle ?? body.hero_title, 300),
    hero_description: cleanText(body.heroDescription ?? body.hero_description, 1200),
    banner_image: cleanText(body.bannerImage ?? body.banner_image, 2000),
    banner_alt: cleanText(body.bannerAlt ?? body.banner_alt, 300),
    intro: cleanText(body.intro, 3000),
    body_html: String(body.bodyHtml ?? body.body_html ?? ''),
    neighbourhoods: cleanArray(body.neighbourhoods),
    service_slugs: cleanArray(body.serviceSlugs ?? body.service_slugs),
    faq,
    cta_title: cleanText(body.ctaTitle ?? body.cta_title, 300),
    cta_text: cleanText(body.ctaText ?? body.cta_text, 1000),
    seo_title: cleanText(body.seoTitle ?? body.seo_title, 300),
    seo_description: cleanText(body.seoDescription ?? body.seo_description, 1000),
    og_image: cleanText(body.ogImage ?? body.og_image, 2000),
    sort_order: Number.isFinite(Number(body.sortOrder ?? body.sort_order))
      ? Math.trunc(Number(body.sortOrder ?? body.sort_order))
      : 0,
    ...publishFields(body),
  };
}

async function parse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || fallback);
  return data;
}

async function listRows(token, table, fields, id = '') {
  const idFilter = id ? `&id=eq.${encodeURIComponent(id)}` : '';
  return parse(
    await supabaseUserRest(
      token,
      `${table}?site_key=eq.${SITE_KEY}${idFilter}&select=${encodeURIComponent(fields)}&order=sort_order.asc,updated_at.desc`,
      { method: 'GET' },
    ),
    `Unable to load ${table}`,
  );
}

async function saveRow(token, table, fields, body, cleaner) {
  const payload = cleaner(body);
  if (!payload.title) throw new Error('Title is required.');
  if (!payload.slug) throw new Error('Slug is required.');
  const id = cleanText(body.id, 100);
  const path = id
    ? `${table}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(fields)}`
    : `${table}?select=${encodeURIComponent(fields)}`;

  const rows = await parse(
    await supabaseUserRest(token, path, {
      method: id ? 'PATCH' : 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    }),
    `Unable to save ${table}`,
  );
  return Array.isArray(rows) ? rows[0] || null : rows;
}

async function deleteRow(token, table, id) {
  if (!id) throw new Error('Missing content id.');
  await parse(
    await supabaseUserRest(
      token,
      `${table}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
    ),
    `Unable to delete ${table}`,
  );
}

export default async function handler(req, res) {
  if (!['GET','POST','DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireWebsiteOwner(req, res);
  if (!user) return;

  const resource = String(req.query?.resource || '').trim().toLowerCase();
  const id = String(req.query?.id || '').trim();

  try {
    if (resource === 'services') {
      if (req.method === 'GET') {
        return res.status(200).json({ posts: await listRows(user.accessToken, 'sunwings_services', SERVICE_FIELDS, id) });
      }
      if (req.method === 'DELETE') {
        await deleteRow(user.accessToken, 'sunwings_services', id);
        return res.status(200).json({ ok: true });
      }
      return res.status(200).json({
        post: await saveRow(user.accessToken, 'sunwings_services', SERVICE_FIELDS, req.body || {}, cleanService),
      });
    }

    if (resource === 'locations') {
      if (req.method === 'GET') {
        return res.status(200).json({ posts: await listRows(user.accessToken, 'sunwings_locations', LOCATION_FIELDS, id) });
      }
      if (req.method === 'DELETE') {
        await deleteRow(user.accessToken, 'sunwings_locations', id);
        return res.status(200).json({ ok: true });
      }
      return res.status(200).json({
        post: await saveRow(user.accessToken, 'sunwings_locations', LOCATION_FIELDS, req.body || {}, cleanLocation),
      });
    }

    if (resource === 'quotes') {
      if (req.method === 'GET') {
        const rows = await parse(
          await supabaseUserRest(
            user.accessToken,
            `sunwings_quote_requests?site_key=eq.${SITE_KEY}&select=*&order=created_at.desc`,
            { method: 'GET' },
          ),
          'Unable to load quote requests',
        );
        return res.status(200).json({ requests: rows });
      }
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = req.body || {};
      const quoteId = cleanText(body.id, 100);
      const allowed = new Set(['new','contacted','quoted','closed']);
      if (!quoteId) return res.status(400).json({ error: 'Missing quote request id.' });
      const status = allowed.has(body.status) ? body.status : 'new';
      const rows = await parse(
        await supabaseUserRest(
          user.accessToken,
          `sunwings_quote_requests?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(quoteId)}&select=*`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
          },
        ),
        'Unable to update quote request',
      );
      return res.status(200).json({ request: rows?.[0] || null });
    }

    if (resource === 'settings') {
      if (req.method === 'GET') {
        const rows = await parse(
          await supabaseUserRest(
            user.accessToken,
            `sunwings_site_settings?site_key=eq.${SITE_KEY}&select=key,value,updated_at&order=key.asc`,
            { method: 'GET' },
          ),
          'Unable to load Sunwings settings',
        );
        return res.status(200).json({ settings: Object.fromEntries(rows.map(row => [row.key, row.value])) });
      }

      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const allowed = new Set([
        'phone','email','hero_title','hero_description','hero_image','hero_cta_label','hero_cta_url'
      ]);
      const source = req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : req.body || {};
      const rows = Object.entries(source)
        .filter(([key]) => allowed.has(key))
        .map(([key, value]) => ({
          site_key: SITE_KEY,
          key,
          value: String(value ?? ''),
          updated_at: new Date().toISOString(),
        }));

      if (!rows.length) return res.status(400).json({ error: 'No supported settings supplied.' });

      await parse(
        await supabaseUserRest(user.accessToken, 'sunwings_site_settings?on_conflict=site_key,key', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows),
        }),
        'Unable to save Sunwings settings',
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown Sunwings resource.' });
  } catch (error) {
    console.error('[sunwings-content]', error);
    return res.status(500).json({ error: error.message || 'Sunwings request failed.' });
  }
}
