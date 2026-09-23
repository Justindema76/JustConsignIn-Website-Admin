import { getAdminSiteKey } from '../../services/siteAdminService';
import { adminFetch, parseJsonResponse } from '../../services/apiClient';

export const WORK_STATUS = { DRAFT: 'draft', PUBLISHED: 'published' };

export const EMPTY_WORK_POST = {
  id: '',
  slug: '',
  title: '',
  workType: '',
  company: '',
  role: '',
  platform: '',
  audience: '',
  excerpt: '',
  featuredImage: '',
  featuredImageAlt: '',
  projectUrl: '',
  secondaryUrl: '',
  tags: [],
  bodyHtml: '',
  seoTitle: '',
  seoDescription: '',
  ogImage: '',
  status: WORK_STATUS.DRAFT,
  authorName: 'Justin DeMatteis',
  publishedAt: '',
  createdAt: '',
  updatedAt: '',
};

export function slugifyWork(value = '') {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function normalizeWorkPost(row = {}) {
  return {
    ...EMPTY_WORK_POST,
    id: row.id || '',
    slug: row.slug || '',
    title: row.title || '',
    workType: row.work_type ?? row.workType ?? '',
    company: row.company || '',
    role: row.role || '',
    platform: row.platform || '',
    audience: row.audience || '',
    excerpt: row.excerpt || '',
    featuredImage: row.featured_image ?? row.featuredImage ?? '',
    featuredImageAlt: row.featured_image_alt ?? row.featuredImageAlt ?? '',
    projectUrl: row.project_url ?? row.projectUrl ?? '',
    secondaryUrl: row.secondary_url ?? row.secondaryUrl ?? '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    bodyHtml: row.body_html ?? row.bodyHtml ?? '',
    seoTitle: row.seo_title ?? row.seoTitle ?? '',
    seoDescription: row.seo_description ?? row.seoDescription ?? '',
    ogImage: row.og_image ?? row.ogImage ?? '',
    status: row.status === WORK_STATUS.PUBLISHED ? WORK_STATUS.PUBLISHED : WORK_STATUS.DRAFT,
    authorName: row.author_name ?? row.authorName ?? 'Justin DeMatteis',
    publishedAt: row.published_at ?? row.publishedAt ?? '',
    createdAt: row.created_at ?? row.createdAt ?? '',
    updatedAt: row.updated_at ?? row.updatedAt ?? '',
  };
}

async function parse(response) {
  return parseJsonResponse(response, 'Work post request failed');
}

function url(path = '') {
  const siteKey = getAdminSiteKey();
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}site=${encodeURIComponent(siteKey)}`;
}

export async function loadAdminWorkPosts(accessToken) {
  const payload = await parse(await adminFetch(url('/api/admin/site?resource=work-posts'), {}, accessToken));
  return Array.isArray(payload.posts) ? payload.posts.map(normalizeWorkPost) : [];
}

export async function loadAdminWorkPost(accessToken, id) {
  const payload = await parse(await adminFetch(url(`/api/admin/site?resource=work-posts&id=${encodeURIComponent(id)}`), {}, accessToken));
  return normalizeWorkPost(payload.posts?.[0] || {});
}

export async function saveAdminWorkPost(accessToken, input) {
  const payload = await parse(await adminFetch(url('/api/admin/site?resource=work-posts'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      siteKey: getAdminSiteKey(),
      slug: slugifyWork(input.slug || input.title),
    }),
  }, accessToken));
  return normalizeWorkPost(payload.post || {});
}

export async function deleteAdminWorkPost(accessToken, id) {
  await parse(await adminFetch(url(`/api/admin/site?resource=work-posts&id=${encodeURIComponent(id)}`), { method: 'DELETE' }, accessToken));
}

export function createEmptyWorkPost() {
  return { ...EMPTY_WORK_POST, tags: [] };
}
