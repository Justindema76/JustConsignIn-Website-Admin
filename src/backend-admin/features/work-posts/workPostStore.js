import { getAdminSiteKey } from '../../services/siteAdminService';
import { adminFetch, parseJsonResponse } from '../../services/apiClient';

export const WORK_STATUS = { DRAFT: 'draft', PUBLISHED: 'published' };

export const DEFAULT_WORK_SECTIONS = {
  overviewHeading: 'Overview',
  overview: '',
  overviewSecondary: '',
  quote: '',
  heroImage: '',
  heroImageAlt: '',
  heroImageFit: 'cover',
  heroImageRatio: '4/3',
  heroImagePosition: 'center',
  heroImageWidth: '42',
  heroImageRadius: '26',
  heroPrimaryEnabled: true,
  heroPrimaryText: '',
  heroPrimaryUrl: '',
  heroPrimaryStyle: 'primary',
  heroPrimaryNewTab: true,
  heroSecondaryEnabled: true,
  heroSecondaryText: '',
  heroSecondaryUrl: '',
  heroSecondaryStyle: 'secondary',
  heroSecondaryNewTab: false,
  techEnabled: true,
  techEyebrow: 'Technology',
  techHeading: 'What I used to build it.',
  footerCtaEnabled: true,
  footerCtaEyebrow: 'Live Product',
  footerCtaHeading: '',
  footerCtaText: 'This Work Post can continue growing as the project changes.',
  footerCtaButtonText: '',
  footerCtaButtonUrl: '',
  relatedEnabled: true,
  relatedEyebrow: 'More Work',
  relatedHeading: 'Related projects',
  relatedSlugs: '',
  problemHeading: 'The business problem',
  problem: '',
  problemPoints: [],
  builtHeading: 'What I built',
  built: '',
  connectedWorkflow: '',
  visualsHeading: 'Product visuals',
  visualsIntro: '',
  gallery: [],
  youtubeHeading: '',
  youtubeIntro: '',
  youtubeUrl: '',
  videos: [],
  workflow: [],
  ongoingHeading: 'Ongoing work',
  ongoing: '',
  extras: [],
};

function cloneSections(value = {}) {
  return {
    ...DEFAULT_WORK_SECTIONS,
    ...(value && typeof value === 'object' && !Array.isArray(value) ? value : {}),
    problemPoints: Array.isArray(value?.problemPoints) ? value.problemPoints : [],
    gallery: Array.isArray(value?.gallery) ? value.gallery : [],
    videos: Array.isArray(value?.videos) ? value.videos : [],
    workflow: Array.isArray(value?.workflow) ? value.workflow : [],
    extras: Array.isArray(value?.extras) ? value.extras : [],
  };
}

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
  sections: cloneSections(),
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
    sections: cloneSections(row.sections),
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
      sections: cloneSections(input.sections),
    }),
  }, accessToken));
  return normalizeWorkPost(payload.post || {});
}

export async function deleteAdminWorkPost(accessToken, id) {
  await parse(await adminFetch(url(`/api/admin/site?resource=work-posts&id=${encodeURIComponent(id)}`), { method: 'DELETE' }, accessToken));
}

export function createEmptyWorkPost() {
  return { ...EMPTY_WORK_POST, tags: [], sections: cloneSections() };
}
