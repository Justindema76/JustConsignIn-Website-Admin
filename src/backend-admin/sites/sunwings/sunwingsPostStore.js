import { adminFetch, parseJsonResponse } from '../../services/apiClient';

export const POST_STATUS = { DRAFT: 'draft', PUBLISHED: 'published' };

export function slugifySunwings(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function createEmptyServicePost() {
  return {
    id: '',
    slug: '',
    title: '',
    eyebrow: '',
    heroTitle: '',
    heroDescription: '',
    bannerImage: '',
    bannerAlt: '',
    intro: '',
    bodyHtml: '',
    bullets: [],
    ctaTitle: '',
    ctaText: '',
    seoTitle: '',
    seoDescription: '',
    ogImage: '',
    status: POST_STATUS.DRAFT,
    sortOrder: 0,
    publishedAt: '',
    createdAt: '',
    updatedAt: '',
  };
}

export function createEmptyLocationPost() {
  return {
    id: '',
    slug: '',
    title: '',
    region: '',
    eyebrow: '',
    heroTitle: '',
    heroDescription: '',
    bannerImage: '',
    bannerAlt: '',
    intro: '',
    bodyHtml: '',
    neighbourhoods: [],
    serviceSlugs: [],
    faq: [],
    ctaTitle: '',
    ctaText: '',
    seoTitle: '',
    seoDescription: '',
    ogImage: '',
    status: POST_STATUS.DRAFT,
    sortOrder: 0,
    publishedAt: '',
    createdAt: '',
    updatedAt: '',
  };
}

function common(row = {}, base = {}) {
  return {
    ...base,
    id: row.id || '',
    slug: row.slug || '',
    title: row.title || '',
    eyebrow: row.eyebrow || '',
    heroTitle: row.hero_title ?? row.heroTitle ?? '',
    heroDescription: row.hero_description ?? row.heroDescription ?? '',
    bannerImage: row.banner_image ?? row.bannerImage ?? '',
    bannerAlt: row.banner_alt ?? row.bannerAlt ?? '',
    intro: row.intro || '',
    bodyHtml: row.body_html ?? row.bodyHtml ?? '',
    ctaTitle: row.cta_title ?? row.ctaTitle ?? '',
    ctaText: row.cta_text ?? row.ctaText ?? '',
    seoTitle: row.seo_title ?? row.seoTitle ?? '',
    seoDescription: row.seo_description ?? row.seoDescription ?? '',
    ogImage: row.og_image ?? row.ogImage ?? '',
    status: row.status === POST_STATUS.PUBLISHED ? POST_STATUS.PUBLISHED : POST_STATUS.DRAFT,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    publishedAt: row.published_at ?? row.publishedAt ?? '',
    createdAt: row.created_at ?? row.createdAt ?? '',
    updatedAt: row.updated_at ?? row.updatedAt ?? '',
  };
}

export function normalizeServicePost(row = {}) {
  return {
    ...common(row, createEmptyServicePost()),
    bullets: Array.isArray(row.bullets) ? row.bullets : [],
  };
}

export function normalizeLocationPost(row = {}) {
  return {
    ...common(row, createEmptyLocationPost()),
    region: row.region || '',
    neighbourhoods: Array.isArray(row.neighbourhoods) ? row.neighbourhoods : [],
    serviceSlugs: Array.isArray(row.service_slugs ?? row.serviceSlugs) ? (row.service_slugs ?? row.serviceSlugs) : [],
    faq: Array.isArray(row.faq) ? row.faq : [],
  };
}

async function parse(response, message) {
  return parseJsonResponse(response, message);
}

async function list(endpoint, accessToken, normalize) {
  const payload = await parse(await adminFetch(endpoint, {}, accessToken), 'Unable to load Sunwings posts.');
  return Array.isArray(payload.posts) ? payload.posts.map(normalize) : [];
}

async function load(endpoint, id, accessToken, normalize) {
  const payload = await parse(
    await adminFetch(`${endpoint}?id=${encodeURIComponent(id)}`, {}, accessToken),
    'Unable to load Sunwings post.',
  );
  return normalize(payload.posts?.[0] || {});
}

async function save(endpoint, input, accessToken, normalize) {
  const payload = await parse(await adminFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }, accessToken), 'Unable to save Sunwings post.');
  return normalize(payload.post || {});
}

async function remove(endpoint, id, accessToken) {
  await parse(
    await adminFetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' }, accessToken),
    'Unable to delete Sunwings post.',
  );
}

const SERVICES = '/api/admin/sunwings/services';
const LOCATIONS = '/api/admin/sunwings/locations';

export const loadServicePosts = accessToken => list(SERVICES, accessToken, normalizeServicePost);
export const loadServicePost = (accessToken, id) => load(SERVICES, id, accessToken, normalizeServicePost);
export const saveServicePost = (accessToken, input) => save(SERVICES, input, accessToken, normalizeServicePost);
export const deleteServicePost = (accessToken, id) => remove(SERVICES, id, accessToken);

export const loadLocationPosts = accessToken => list(LOCATIONS, accessToken, normalizeLocationPost);
export const loadLocationPost = (accessToken, id) => load(LOCATIONS, id, accessToken, normalizeLocationPost);
export const saveLocationPost = (accessToken, input) => save(LOCATIONS, input, accessToken, normalizeLocationPost);
export const deleteLocationPost = (accessToken, id) => remove(LOCATIONS, id, accessToken);
