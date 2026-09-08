import { supabaseRest } from '../_lib/supabase.js';
import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';

const fields = 'id,slug,title,excerpt,seo_title,seo_description,category,tags,featured_image,body,status,author_name,published_at,created_at,updated_at';

function cleanPost(body = {}) {
  const status = body.status === 'published' ? 'published' : 'draft';
  return {
    slug: String(body.slug || '').trim(),
    title: String(body.title || '').trim(),
    excerpt: String(body.excerpt || ''),
    seo_title: String(body.seoTitle || body.seo_title || ''),
    seo_description: String(body.seoDescription || body.seo_description || ''),
    category: String(body.category || 'Shopify Consignment'),
    tags: Array.isArray(body.tags) ? body.tags.map(v => String(v).trim()).filter(Boolean) : [],
    featured_image: String(body.featuredImage || body.featured_image || ''),
    body: String(body.body || ''),
    status,
    author_name: String(body.authorName || body.author_name || 'JustConsignIn'),
    published_at: status === 'published' ? (body.publishedAt || body.published_at || new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireWebsiteOwner(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const response = await supabaseRest(`blog_posts?select=${fields}&order=updated_at.desc`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load blog posts');
      return res.status(200).json({ posts: data });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing post id' });
      const response = await supabaseRest(`blog_posts?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Unable to delete blog post');
      }
      return res.status(200).json({ ok: true });
    }

    const payload = cleanPost(req.body || {});
    if (!payload.title) return res.status(400).json({ error: 'Title is required' });
    if (!payload.slug) return res.status(400).json({ error: 'Slug is required' });
    const id = String(req.body?.id || '').trim();
    const path = id ? `blog_posts?id=eq.${encodeURIComponent(id)}` : 'blog_posts';
    const response = await supabaseRest(path, {
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
