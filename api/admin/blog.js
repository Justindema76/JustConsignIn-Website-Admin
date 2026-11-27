import { supabaseUserRest } from '../_lib/supabase.js';
import { requireSiteAccess } from '../_lib/websiteAdmin.js';

const fields = 'site_key,id,slug,title,excerpt,seo_title,seo_description,category,tags,featured_image,body,status,author_name,published_at,created_at,updated_at,content_blocks';

const SITE_DEFAULTS = {
  justindematteis: { category: 'Development', author: 'Justin DeMatteis' },
  sunwings: { category: 'Guides', author: 'Sunwings Transport' },
  shopifystudio: { category: 'Shopify Tips', author: 'Justin DeMatteis' },
};

// Shopify Studio article extras (related services, call to action, canonical, share image, who drafted it).
function cleanExtras(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const text = (v, n = 500) => String(v || '').trim().slice(0, n);
  return {
    relatedServices: Array.isArray(value.relatedServices) ? value.relatedServices.map(v => text(v, 60)).filter(Boolean).slice(0, 8) : [],
    ctaLabel: text(value.ctaLabel, 80),
    ctaUrl: text(value.ctaUrl, 300),
    canonical: text(value.canonical, 300),
    ogImage: text(value.ogImage, 500),
    source: text(value.source, 40),
  };
}

function cleanPost(body = {}, siteKey = 'justconsignin') {
  const status = body.status === 'published' ? 'published' : 'draft';
  const defaults = SITE_DEFAULTS[siteKey] || { category: 'Shopify Consignment', author: 'JustConsignIn' };
  const extras = cleanExtras(body.contentBlocks ?? body.content_blocks);
  return {
    ...(extras ? { content_blocks: extras } : {}),
    slug: String(body.slug || '').trim(),
    title: String(body.title || '').trim(),
    excerpt: String(body.excerpt || ''),
    seo_title: String(body.seoTitle || body.seo_title || ''),
    seo_description: String(body.seoDescription || body.seo_description || ''),
    category: String(body.category || defaults.category),
    tags: Array.isArray(body.tags) ? body.tags.map(v => String(v).trim()).filter(Boolean) : [],
    featured_image: String(body.featuredImage || body.featured_image || ''),
    body: String(body.body || ''),
    status,
    author_name: String(body.authorName || body.author_name || defaults.author),
    published_at: status === 'published' ? (body.publishedAt || body.published_at || new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  const siteKey = String(req.query?.site || req.body?.siteKey || 'justconsignin').trim().toLowerCase() || 'justconsignin';
  const siteFilter = `site_key=eq.${encodeURIComponent(siteKey)}`;

  const user = await requireSiteAccess(req, res, siteKey);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const response = await supabaseUserRest(user.accessToken, `blog_posts?${siteFilter}&select=${fields}&order=updated_at.desc`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load blog posts');
      return res.status(200).json({ posts: data });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing post id' });
      const response = await supabaseUserRest(user.accessToken, `blog_posts?${siteFilter}&id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Unable to delete blog post');
      }
      return res.status(200).json({ ok: true });
    }

    const payload = { ...cleanPost(req.body || {}, siteKey), site_key: siteKey };
    if (!payload.title) return res.status(400).json({ error: 'Title is required' });
    if (!payload.slug) return res.status(400).json({ error: 'Slug is required' });
    const id = String(req.body?.id || '').trim();
    const path = id ? `blog_posts?${siteFilter}&id=eq.${encodeURIComponent(id)}` : 'blog_posts';
    const response = await supabaseUserRest(user.accessToken, path, {
      method: id ? 'PATCH' : 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || 'Unable to save blog post');
    return res.status(200).json({ post: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Blog admin request failed' });
  }
}
