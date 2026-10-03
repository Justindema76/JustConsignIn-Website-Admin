import { supabaseUserRest } from '../../../_lib/supabase.js';

export const SITE_KEY = 'sunwings';

export const SERVICE_FIELDS = [
  'site_key','id','slug','title','eyebrow','hero_title','hero_description','banner_image','banner_alt',
  'intro','body_html','bullets','cta_title','cta_text','seo_title','seo_description','og_image',
  'status','sort_order','published_at','created_at','updated_at',
].join(',');

export const LOCATION_FIELDS = [
  'site_key','id','slug','title','region','eyebrow','hero_title','hero_description','banner_image','banner_alt',
  'intro','body_html','neighbourhoods','service_slugs','faq','cta_title','cta_text','seo_title',
  'seo_description','og_image','status','sort_order','published_at','created_at','updated_at',
].join(',');

export async function parseSupabase(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || fallback);
  return data;
}

function text(value, max = 100000) {
  return String(value ?? '').trim().slice(0, max);
}

function textArray(value) {
  return Array.isArray(value) ? value.map(item => text(item, 500)).filter(Boolean) : [];
}

function publishing(body = {}) {
  const status = body.status === 'published' ? 'published' : 'draft';
  return {
    status,
    published_at: status === 'published'
      ? (body.publishedAt || body.published_at || new Date().toISOString())
      : null,
    updated_at: new Date().toISOString(),
  };
}

export function cleanService(body = {}) {
  return {
    slug: text(body.slug, 180),
    title: text(body.title, 240),
    eyebrow: text(body.eyebrow, 180),
    hero_title: text(body.heroTitle ?? body.hero_title, 300),
    hero_description: text(body.heroDescription ?? body.hero_description, 1200),
    banner_image: text(body.bannerImage ?? body.banner_image, 2000),
    banner_alt: text(body.bannerAlt ?? body.banner_alt, 300),
    intro: text(body.intro, 3000),
    body_html: String(body.bodyHtml ?? body.body_html ?? ''),
    bullets: textArray(body.bullets),
    cta_title: text(body.ctaTitle ?? body.cta_title, 300),
    cta_text: text(body.ctaText ?? body.cta_text, 1000),
    seo_title: text(body.seoTitle ?? body.seo_title, 300),
    seo_description: text(body.seoDescription ?? body.seo_description, 1000),
    og_image: text(body.ogImage ?? body.og_image, 2000),
    sort_order: Number.isFinite(Number(body.sortOrder ?? body.sort_order))
      ? Math.trunc(Number(body.sortOrder ?? body.sort_order))
      : 0,
    ...publishing(body),
  };
}

export function cleanLocation(body = {}) {
  const faq = Array.isArray(body.faq)
    ? body.faq
      .map(item => ({ question: text(item?.question, 500), answer: text(item?.answer, 3000) }))
      .filter(item => item.question && item.answer)
    : [];

  return {
    slug: text(body.slug, 180),
    title: text(body.title, 240),
    region: text(body.region, 240),
    eyebrow: text(body.eyebrow, 180),
    hero_title: text(body.heroTitle ?? body.hero_title, 300),
    hero_description: text(body.heroDescription ?? body.hero_description, 1200),
    banner_image: text(body.bannerImage ?? body.banner_image, 2000),
    banner_alt: text(body.bannerAlt ?? body.banner_alt, 300),
    intro: text(body.intro, 3000),
    body_html: String(body.bodyHtml ?? body.body_html ?? ''),
    neighbourhoods: textArray(body.neighbourhoods),
    service_slugs: textArray(body.serviceSlugs ?? body.service_slugs),
    faq,
    cta_title: text(body.ctaTitle ?? body.cta_title, 300),
    cta_text: text(body.ctaText ?? body.cta_text, 1000),
    seo_title: text(body.seoTitle ?? body.seo_title, 300),
    seo_description: text(body.seoDescription ?? body.seo_description, 1000),
    og_image: text(body.ogImage ?? body.og_image, 2000),
    sort_order: Number.isFinite(Number(body.sortOrder ?? body.sort_order))
      ? Math.trunc(Number(body.sortOrder ?? body.sort_order))
      : 0,
    ...publishing(body),
  };
}

export async function listPosts(accessToken, table, fields, id = '') {
  const idFilter = id ? `&id=eq.${encodeURIComponent(id)}&limit=1` : '';
  const path = `${table}?site_key=eq.${SITE_KEY}${idFilter}&select=${encodeURIComponent(fields)}&order=sort_order.asc,updated_at.desc`;
  return parseSupabase(
    await supabaseUserRest(accessToken, path, { method: 'GET' }),
    `Unable to load ${table}.`,
  );
}

export async function savePost(accessToken, table, fields, body, cleaner) {
  const payload = { ...cleaner(body), site_key: SITE_KEY };
  if (!payload.title) throw new Error('Title is required.');
  if (!payload.slug) throw new Error('Slug is required.');

  const id = text(body.id, 100);
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

export async function deletePost(accessToken, table, id) {
  if (!id) throw new Error('Missing content id.');
  await parseSupabase(
    await supabaseUserRest(
      accessToken,
      `${table}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
    ),
    `Unable to delete ${table}.`,
  );
  return { ok: true };
}
