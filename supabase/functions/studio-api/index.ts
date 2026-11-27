// Shopify Studio content API — for ChatGPT (Custom GPT Action) and other approved tools.
//
// What it can do: READ brand rules, business details, services & pricing, designs, articles,
// social posts, the content calendar, media and lead stats; WRITE drafts (blog + social) and
// update drafts that are still drafts. It can never publish, schedule for auto-posting,
// delete, or touch any other website (JustinDeMatteis main site, JustConsignIn, Sunwings, Rent & Rally).
//
// Auth: "Authorization: Bearer <key>" (or "x-api-key"). Keys are created/revoked in the admin
// (Shopify Studio → ChatGPT / API Access); the table studio_api_keys stores only a SHA-256 hash.
// Deployed with --no-verify-jwt (it checks its own key). Spec: GET /openapi.json (no key needed).
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE = 'shopifystudio';                 // Studio's own content
const PAGES_SITE = 'justindematteis';         // where the Studio pages, settings and leads live
const SITE_URL = 'https://www.justindematteis.com';
const STUDIO_URL = `${SITE_URL}/shopify-studio`;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

function readKey(legacyName: string, modernName: string) {
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  try {
    const parsed = JSON.parse(Deno.env.get(modernName) || '{}');
    return parsed.default || Object.values(parsed)[0] || '';
  } catch { return ''; }
}
const db = createClient(SUPABASE_URL, readKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS'), { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body, null, 1), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);
const text = (v: unknown, max = 4000) => String(v ?? '').trim().slice(0, max);
const list = (v: unknown, max = 20, each = 80) => (Array.isArray(v) ? v : String(v || '').split(',')).map(x => text(x, each)).filter(Boolean).slice(0, max);

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
// Keys are created and revoked in the admin (Shopify Studio → ChatGPT / API Access); only their hash is stored.
let currentKey = '';
async function authorised(req: Request) {
  currentKey = '';
  const header = req.headers.get('authorization') || '';
  const key = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : (req.headers.get('x-api-key') || '').trim();
  if (key.length < 24 || key.length > 200) return false;
  const hash = await sha256(key);
  const { data } = await db.from('studio_api_keys').select('id,revoked_at').eq('key_hash', hash).eq('site_key', SITE).maybeSingle();
  if (!data || data.revoked_at) return false;
  currentKey = data.id;
  db.from('studio_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {}, () => {});
  return true;
}

// Simple per-instance rate limit: 120 requests a minute, 30 writes a minute.
const hits: number[] = []; const writes: number[] = [];
function limited(isWrite: boolean) {
  const now = Date.now();
  for (const arr of [hits, writes]) while (arr.length && now - arr[0] > 60000) arr.shift();
  hits.push(now); if (isWrite) writes.push(now);
  return hits.length > 120 || writes.length > 30;
}
// Audit trail in the function logs (Supabase → Edge Functions → studio-api → Logs).
function audit(req: Request, path: string, status: number, note = '') {
  console.log(JSON.stringify({ audit: 'studio-api', at: new Date().toISOString(), keyId: currentKey || null, method: req.method, path, status, note, ua: (req.headers.get('user-agent') || '').slice(0, 80) }));
}

// ---- data -------------------------------------------------------------------------------
let builtIn: any = null; let builtInAt = 0;
async function siteDefaults() {
  if (builtIn && Date.now() - builtInAt < 10 * 60000) return builtIn;
  const res = await fetch(`${STUDIO_URL}/studio-data.json`).catch(() => null);
  builtIn = res && res.ok ? await res.json().catch(() => ({})) : (builtIn || {});
  builtInAt = Date.now();
  return builtIn;
}
async function studioSettings() {
  const { data } = await db.from('site_settings').select('value').eq('site_key', PAGES_SITE).eq('key', 'global_shopify-studio').maybeSingle();
  return (data?.value && typeof data.value === 'object') ? data.value : {};
}
async function brand() {
  const [base, saved] = await Promise.all([siteDefaults(), studioSettings()]);
  const business = { ...(base.business || {}), ...Object.fromEntries(Object.entries(saved.business || {}).filter(([, v]) => v !== '' && v != null)) };
  const designs = (base.designs || []).filter((d: any) => !Array.isArray(saved.enabledEras) || !saved.enabledEras.length || saved.enabledEras.includes(d.key));
  return { business, brandRules: Array.isArray(saved.brandRules) && saved.brandRules.length ? saved.brandRules : (base.brandRules || []), designs, website: STUDIO_URL, freeReviewUrl: `${STUDIO_URL}#audit`, pricingUrl: `${STUDIO_URL}/pricing` };
}
async function services() {
  const [base, saved] = await Promise.all([siteDefaults(), studioSettings()]);
  const pricing = saved.pricing?.services?.length ? saved.pricing : (base.pricing || { services: [] });
  return {
    currency: 'CAD', source: saved.pricing?.services?.length ? 'admin' : 'website defaults', disclaimer: pricing.disclaimer || '',
    services: (pricing.services || []).map((s: any) => ({
      id: s.id, name: s.name, intro: s.intro || '', url: `${STUDIO_URL}/pricing#${s.id}`,
      packages: (s.cards || []).map((c: any) => ({ id: c.id, tier: c.tier || '', name: c.name, price: c.price || '', priceType: c.priceType || '', unit: c.unit || '', description: c.desc || c.description || '', timeline: c.timeline || '' })),
      rates: (s.tables || []).flatMap((t: any) => (t.rows || []).map((r: any) => ({ item: r.name || r.item || r.label || '', price: r.price || '' }))),
    })),
  };
}

const POST_FIELDS = 'id,slug,title,excerpt,status,category,tags,featured_image,seo_title,seo_description,published_at,updated_at,content_blocks';
const postOut = (p: any, withBody = false) => ({
  id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, category: p.category, tags: p.tags || [],
  status: p.status === 'published' ? (new Date(p.published_at) > new Date() ? 'scheduled' : 'published') : 'draft',
  publishedAt: p.published_at, updatedAt: p.updated_at, featuredImage: p.featured_image, seoTitle: p.seo_title, seoDescription: p.seo_description,
  relatedServices: p.content_blocks?.relatedServices || [], ctaLabel: p.content_blocks?.ctaLabel || '', ctaUrl: p.content_blocks?.ctaUrl || '',
  draftedBy: p.content_blocks?.source || 'admin', url: `${STUDIO_URL}/blog/${p.slug}`, ...(withBody ? { body: p.body } : {}),
});
const SOCIAL_FIELDS = 'id,title,status,platforms,instagram_caption,facebook_caption,tiktok_caption,youtube_title,youtube_description,media_url,media_type,scheduled_at,auto_publish,last_error,updated_at';
const socialOut = (c: any) => ({
  id: c.id, title: c.title, status: c.status, platforms: c.platforms || [], scheduledAt: c.scheduled_at, autoPublish: c.auto_publish,
  instagramCaption: c.instagram_caption, facebookCaption: c.facebook_caption, tiktokCaption: c.tiktok_caption,
  youtubeTitle: c.youtube_title, youtubeDescription: c.youtube_description, mediaUrl: c.media_url, mediaType: c.media_type, lastError: c.last_error, updatedAt: c.updated_at,
});

const slugify = (v: string) => text(v, 120).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const PLATFORMS = new Set(['instagram', 'facebook', 'tiktok', 'youtube']);
// Media links must be public https images/videos: no private or local addresses, and the file must
// actually answer as an image or video (checked with a HEAD request, 5 s timeout, 50 MB max).
async function checkMedia(v: string, kind: 'image' | 'media') {
  if (!v) return '';
  let u: URL;
  try { u = new URL(v); } catch { return 'is not a valid URL'; }
  if (u.protocol !== 'https:') return 'must start with https://';
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return 'must be a public web address (no IP addresses or local hosts)';
  try {
    const res = await fetch(u.toString(), { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return `could not be reached (HTTP ${res.status})`;
    const type = res.headers.get('content-type') || '';
    const ok = kind === 'image' ? type.startsWith('image/') : (type.startsWith('image/') || type.startsWith('video/'));
    if (!ok) return `is not ${kind === 'image' ? 'an image' : 'an image or video'} (content-type "${type || 'unknown'}")`;
    const size = Number(res.headers.get('content-length') || 0);
    if (size > 50 * 1024 * 1024) return 'is larger than 50 MB';
  } catch { return 'could not be reached'; }
  return '';
}

function blogDraft(body: any, existing: any = null) {
  const title = text(body.title ?? existing?.title, 200);
  const out: Record<string, unknown> = {
    title,
    excerpt: text(body.excerpt ?? existing?.excerpt, 600),
    body: text(body.body ?? existing?.body, 60000),
    category: text(body.category ?? existing?.category ?? 'Shopify Tips', 60) || 'Shopify Tips',
    tags: body.tags !== undefined ? list(body.tags) : (existing?.tags || []),
    featured_image: text(body.featuredImage ?? body.featured_image ?? existing?.featured_image, 500),
    seo_title: text(body.seoTitle ?? body.seo_title ?? existing?.seo_title, 70),
    seo_description: text(body.seoDescription ?? body.seo_description ?? existing?.seo_description, 170),
    author_name: 'Justin DeMatteis',
    status: 'draft', published_at: null, updated_at: new Date().toISOString(),
    content_blocks: {
      ...(existing?.content_blocks || {}),
      relatedServices: body.relatedServices !== undefined ? list(body.relatedServices, 8, 60) : (existing?.content_blocks?.relatedServices || []),
      ctaLabel: text(body.ctaLabel ?? existing?.content_blocks?.ctaLabel, 80),
      ctaUrl: text(body.ctaUrl ?? existing?.content_blocks?.ctaUrl, 300),
      source: 'chatgpt',
      suggestedPublishAt: text(body.suggestedPublishAt ?? existing?.content_blocks?.suggestedPublishAt, 40),
    },
  };
  if (!existing) out.slug = slugify(body.slug || title);
  return out;
}
function socialDraft(body: any, existing: any = null) {
  const platforms = body.platforms !== undefined ? list(body.platforms, 4, 20).map(p => p.toLowerCase()).filter(p => PLATFORMS.has(p)) : (existing?.platforms || []);
  const when = body.suggestedScheduleAt || body.scheduledAt;
  const scheduled = when ? new Date(String(when)) : null;
  return {
    site_key: SITE,
    title: text(body.title ?? existing?.title, 200),
    status: 'draft', auto_publish: false,
    platforms,
    instagram_caption: text(body.instagramCaption ?? existing?.instagram_caption, 2200),
    facebook_caption: text(body.facebookCaption ?? existing?.facebook_caption, 5000),
    tiktok_caption: text(body.tiktokCaption ?? existing?.tiktok_caption, 2200),
    youtube_title: text(body.youtubeTitle ?? existing?.youtube_title, 100),
    youtube_description: text(body.youtubeDescription ?? existing?.youtube_description, 5000),
    media_url: text(body.mediaUrl ?? existing?.media_url, 500),
    media_type: text(body.mediaUrl ?? existing?.media_url) ? (/\.(mp4|mov|webm)(\?|$)/i.test(text(body.mediaUrl ?? existing?.media_url)) ? 'video' : 'image') : 'none',
    aspect_ratio: ['1:1', '4:5', '9:16', 'original'].includes(text(body.aspectRatio)) ? text(body.aspectRatio) : (existing?.aspect_ratio || '1:1'),
    scheduled_at: scheduled && !Number.isNaN(scheduled.getTime()) ? scheduled.toISOString() : (existing?.scheduled_at ?? null),
    updated_at: new Date().toISOString(),
  };
}

async function media() {
  const out: any[] = [];
  for (const bucket of ['blog-images', 'site-assets', 'social-videos']) {
    const { data } = await db.storage.from(bucket).list(SITE, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
    for (const f of data || []) if (f.id) out.push({ bucket, name: f.name, url: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${SITE}/${encodeURIComponent(f.name)}`, createdAt: f.created_at, type: f.metadata?.mimetype || '' });
  }
  return { media: out, note: 'Shopify Studio media only. To use an image in a draft, pass its url as featuredImage (blog) or mediaUrl (social).' };
}

async function analytics(days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data: leads } = await db.from('service_requests').select('created_at,message,source_path,utm_source,utm_medium,utm_campaign,status')
    .eq('site_key', PAGES_SITE).gte('created_at', since).like('source_path', '/shopify-studio%').limit(1000);
  const rows = leads || [];
  const kind = (m: string) => m.startsWith('Quote request') ? 'quote' : m.startsWith('Free store review') ? 'free_store_review' : 'other';
  const count = (key: (r: any) => string) => rows.reduce((acc: Record<string, number>, r: any) => { const k = key(r) || 'unknown'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const [{ count: published }, { count: drafts }, { count: social }] = await Promise.all([
    db.from('blog_posts').select('id', { count: 'exact', head: true }).eq('site_key', SITE).eq('status', 'published'),
    db.from('blog_posts').select('id', { count: 'exact', head: true }).eq('site_key', SITE).eq('status', 'draft'),
    db.from('social_campaigns').select('id', { count: 'exact', head: true }).eq('site_key', SITE),
  ]);
  return {
    periodDays: days,
    leads: { total: rows.length, byType: count(r => kind(r.message || '')), bySource: count(r => r.utm_source || 'direct/organic'), byCampaign: count(r => r.utm_campaign), byPage: count(r => r.source_path), byStatus: count(r => r.status) },
    content: { publishedArticles: published || 0, draftArticles: drafts || 0, socialPosts: social || 0 },
    note: 'Lead and content counts only, no personal details. Website traffic (GA4) is not connected to this API yet.',
  };
}

// ---- OpenAPI spec (for the Custom GPT Action) --------------------------------------------
function spec(base: string) {
  const ok = { '200': { description: 'OK' } };
  const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }];
  const blogBody = { type: 'object', required: ['title', 'body'], properties: {
    title: { type: 'string' }, slug: { type: 'string', description: 'Optional; made from the title.' }, excerpt: { type: 'string', description: 'One or two sentences for the blog card.' },
    body: { type: 'string', description: 'Article in plain text/Markdown. Use ## for headings.' }, category: { type: 'string', enum: ['Shopify Tips', 'Design Showcase', 'Case Studies', 'Pricing & Planning', 'Backend & Apps', 'SEO & Marketing', 'Canadian Retail'] },
    tags: { type: 'array', items: { type: 'string' } }, seoTitle: { type: 'string', description: '≤60 characters' }, seoDescription: { type: 'string', description: '≤160 characters' },
    featuredImage: { type: 'string', description: 'https URL, e.g. from GET /media' }, relatedServices: { type: 'array', items: { type: 'string' }, description: 'Service ids from GET /services' },
    ctaLabel: { type: 'string' }, ctaUrl: { type: 'string' }, suggestedPublishAt: { type: 'string', format: 'date-time', description: 'A suggestion only; Justin sets the real date.' } } };
  const socialBody = { type: 'object', required: ['title', 'platforms'], properties: {
    title: { type: 'string', description: 'Internal name for the post' }, platforms: { type: 'array', items: { type: 'string', enum: ['instagram', 'facebook', 'tiktok', 'youtube'] } },
    instagramCaption: { type: 'string' }, facebookCaption: { type: 'string' }, tiktokCaption: { type: 'string' }, youtubeTitle: { type: 'string' }, youtubeDescription: { type: 'string' },
    mediaUrl: { type: 'string', description: 'https URL of an image or video' }, aspectRatio: { type: 'string', enum: ['1:1', '4:5', '9:16', 'original'] },
    suggestedScheduleAt: { type: 'string', format: 'date-time', description: 'Proposed time; the post stays a draft until Justin approves.' } } };
  const body = (schema: unknown) => ({ required: true, content: { 'application/json': { schema } } });
  return {
    openapi: '3.1.0',
    info: { title: 'Shopify Studio Content API', version: '1.0.0', description: 'Read Shopify Studio brand, pricing and content; create drafts for Justin to approve. Drafts only — this API cannot publish.' },
    servers: [{ url: base }],
    components: { securitySchemes: { apiKey: { type: 'http', scheme: 'bearer' } }, schemas: {} },
    security: [{ apiKey: [] }],
    paths: {
      '/brand': { get: { operationId: 'getBrand', summary: 'Business details, permanent marketing rules and the design collection', responses: ok } },
      '/services': { get: { operationId: 'getServices', summary: 'Current services, packages and prices (CAD)', responses: ok } },
      '/posts': { get: { operationId: 'listPosts', summary: 'Blog articles (published, scheduled and drafts)', parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'published', 'scheduled', 'draft'] } }], responses: ok } },
      '/posts/{id}': { get: { operationId: 'getPost', summary: 'One article including its body', parameters: idParam, responses: ok } },
      '/social': { get: { operationId: 'listSocialPosts', summary: 'Social posts and their status', responses: ok } },
      '/calendar': { get: { operationId: 'getCalendar', summary: 'Upcoming and recent scheduled content (blog + social)', responses: ok } },
      '/media': { get: { operationId: 'listMedia', summary: 'Shopify Studio images and videos available to use', responses: ok } },
      '/analytics': { get: { operationId: 'getAnalytics', summary: 'Lead and content performance (no personal data)', parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30, maximum: 365 } }], responses: ok } },
      '/drafts/blog': { post: { operationId: 'createBlogDraft', summary: 'Create a blog article draft', requestBody: body(blogBody), responses: { '201': { description: 'Draft created' }, '409': { description: 'Duplicate' } } } },
      '/drafts/blog/{id}': { patch: { operationId: 'updateBlogDraft', summary: 'Update an article that is still a draft', parameters: idParam, requestBody: body({ ...blogBody, required: [] }), responses: ok } },
      '/drafts/social': { post: { operationId: 'createSocialDraft', summary: 'Create a social post draft', requestBody: body(socialBody), responses: { '201': { description: 'Draft created' }, '409': { description: 'Duplicate' } } } },
      '/drafts/social/{id}': { patch: { operationId: 'updateSocialDraft', summary: 'Update a social post that is still a draft', parameters: idParam, requestBody: body({ ...socialBody, required: [] }), responses: ok } },
      '/drafts/{id}': { get: { operationId: 'getDraftStatus', summary: 'Status of any draft (approved, scheduled, published, failed)', parameters: idParam, responses: ok } },
    },
  };
}

// ---- router --------------------------------------------------------------------------------
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/studio-api/, '') || '/';
  if (req.method === 'GET' && (path === '/openapi.json' || path === '/')) return json(spec(`${SUPABASE_URL}/functions/v1/studio-api`));
  if (!(await authorised(req))) { audit(req, path, 401); return fail(401, 'Missing or invalid API key.'); }
  const isWrite = req.method !== 'GET';
  if (limited(isWrite)) { audit(req, path, 429); return fail(429, 'Too many requests. Wait a minute and try again.'); }

  try {
    let m: RegExpMatchArray | null;
    if (req.method === 'GET') {
      if (path === '/brand') return json(await brand());
      if (path === '/services') return json(await services());
      if (path === '/media') return json(await media());
      if (path === '/analytics') return json(await analytics(Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 30))));
      if (path === '/posts') {
        const { data, error } = await db.from('blog_posts').select(POST_FIELDS).eq('site_key', SITE).order('updated_at', { ascending: false }).limit(200);
        if (error) throw error;
        const want = url.searchParams.get('status') || 'all';
        return json({ posts: (data || []).map(p => postOut(p)).filter(p => want === 'all' || p.status === want) });
      }
      if ((m = path.match(/^\/posts\/([0-9a-f-]{36})$/))) {
        const { data } = await db.from('blog_posts').select(`${POST_FIELDS},body`).eq('site_key', SITE).eq('id', m[1]).maybeSingle();
        return data ? json(postOut(data, true)) : fail(404, 'Article not found.');
      }
      if (path === '/social') {
        const { data, error } = await db.from('social_campaigns').select(SOCIAL_FIELDS).eq('site_key', SITE).order('updated_at', { ascending: false }).limit(200);
        if (error) throw error;
        return json({ posts: (data || []).map(socialOut) });
      }
      if (path === '/calendar') {
        const from = new Date(Date.now() - 30 * 86400000).toISOString(); const to = new Date(Date.now() + 120 * 86400000).toISOString();
        const [blogs, social] = await Promise.all([
          db.from('blog_posts').select(POST_FIELDS).eq('site_key', SITE).eq('status', 'published').gte('published_at', from).lte('published_at', to),
          db.from('social_campaigns').select(SOCIAL_FIELDS).eq('site_key', SITE).gte('scheduled_at', from).lte('scheduled_at', to),
        ]);
        const items = [
          ...(blogs.data || []).map(p => ({ type: 'blog', id: p.id, title: p.title, at: p.published_at, status: postOut(p).status, url: `${STUDIO_URL}/blog/${p.slug}` })),
          ...(social.data || []).map(c => ({ type: 'social', id: c.id, title: c.title, at: c.scheduled_at, status: c.status, platforms: c.platforms })),
        ].sort((a, b) => String(a.at).localeCompare(String(b.at)));
        return json({ from, to, items });
      }
      if ((m = path.match(/^\/drafts\/([0-9a-f-]{36})$/))) {
        const [{ data: post }, { data: social }] = await Promise.all([
          db.from('blog_posts').select(POST_FIELDS).eq('site_key', SITE).eq('id', m[1]).maybeSingle(),
          db.from('social_campaigns').select(SOCIAL_FIELDS).eq('site_key', SITE).eq('id', m[1]).maybeSingle(),
        ]);
        if (post) return json({ type: 'blog', ...postOut(post) });
        if (social) return json({ type: 'social', ...socialOut(social) });
        return fail(404, 'Draft not found.');
      }
      return fail(404, 'Unknown endpoint. See /openapi.json.');
    }

    const body = await req.json().catch(() => ({}));
    if (req.method === 'POST' && path === '/drafts/blog') {
      const draft = blogDraft(body);
      if (!draft.title || !text(body.body)) return fail(400, 'title and body are required.');
      if (!draft.slug) return fail(400, 'Could not make a URL slug from the title.');
      const imgProblem = await checkMedia(String(draft.featured_image), 'image');
      if (imgProblem) return fail(400, `featuredImage ${imgProblem}.`);
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [bySlug, byTitle] = await Promise.all([
        db.from('blog_posts').select('id').eq('site_key', SITE).eq('slug', draft.slug).limit(1),
        db.from('blog_posts').select('id').eq('site_key', SITE).eq('title', draft.title).gte('created_at', since).limit(1),
      ]);
      const clash = bySlug.data?.[0] || byTitle.data?.[0];
      if (clash) { audit(req, path, 409, clash.id); return fail(409, 'An article with this slug or title already exists. Update it instead, or change the title/slug.', { existingId: clash.id }); }
      const { data, error } = await db.from('blog_posts').insert({ ...draft, site_key: SITE }).select(POST_FIELDS).single();
      if (error) throw error;
      audit(req, path, 201, data.id);
      return json({ ...postOut(data), message: 'Draft saved. Justin reviews and publishes it in the admin (Shopify Studio → Blog Posts).' }, 201);
    }
    if (req.method === 'PATCH' && (m = path.match(/^\/drafts\/blog\/([0-9a-f-]{36})$/))) {
      const { data: existing } = await db.from('blog_posts').select(`${POST_FIELDS},body`).eq('site_key', SITE).eq('id', m[1]).maybeSingle();
      if (!existing) return fail(404, 'Article not found.');
      if (existing.status !== 'draft') return fail(409, 'This article is already published or scheduled. Only drafts can be changed through the API.');
      const patchImg = await checkMedia(text(body.featuredImage ?? body.featured_image), 'image');
      if (patchImg) return fail(400, `featuredImage ${patchImg}.`);
      const { data, error } = await db.from('blog_posts').update(blogDraft(body, existing)).eq('site_key', SITE).eq('id', m[1]).eq('status', 'draft').select(POST_FIELDS).single();
      if (error) throw error;
      audit(req, path, 200, m[1]);
      return json(postOut(data));
    }
    if (req.method === 'POST' && path === '/drafts/social') {
      const draft = socialDraft(body);
      if (!draft.title || !draft.platforms.length) return fail(400, 'title and at least one platform are required.');
      const mediaProblem = await checkMedia(draft.media_url, 'media');
      if (mediaProblem) return fail(400, `mediaUrl ${mediaProblem}.`);
      const since = new Date(Date.now() - 2 * 86400000).toISOString();
      const { data: dupes } = await db.from('social_campaigns').select('id').eq('site_key', SITE).eq('title', draft.title).gte('created_at', since).limit(1);
      if (dupes?.length) { audit(req, path, 409, dupes[0].id); return fail(409, 'A post with this title was created in the last 2 days. Update it instead.', { existingId: dupes[0].id }); }
      const { data, error } = await db.from('social_campaigns').insert(draft).select(SOCIAL_FIELDS).single();
      if (error) throw error;
      audit(req, path, 201, data.id);
      return json({ ...socialOut(data), message: 'Draft saved. Justin reviews it in the admin (Shopify Studio → Social Posts) before anything is scheduled through Metricool.' }, 201);
    }
    if (req.method === 'PATCH' && (m = path.match(/^\/drafts\/social\/([0-9a-f-]{36})$/))) {
      const { data: existing } = await db.from('social_campaigns').select('*').eq('site_key', SITE).eq('id', m[1]).maybeSingle();
      if (!existing) return fail(404, 'Social post not found.');
      if (existing.status !== 'draft') return fail(409, 'This post is no longer a draft. Only drafts can be changed through the API.');
      const patchMedia = await checkMedia(text(body.mediaUrl), 'media');
      if (patchMedia) return fail(400, `mediaUrl ${patchMedia}.`);
      const { data, error } = await db.from('social_campaigns').update(socialDraft(body, existing)).eq('site_key', SITE).eq('id', m[1]).eq('status', 'draft').select(SOCIAL_FIELDS).single();
      if (error) throw error;
      audit(req, path, 200, m[1]);
      return json(socialOut(data));
    }
    return fail(404, 'Unknown endpoint. See /openapi.json.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as any)?.message || error);
    audit(req, path, 500, message.slice(0, 200));
    return fail(500, 'Something went wrong.', { detail: message.slice(0, 200) });
  }
});
