import { supabaseUserRest } from '../_lib/supabase.js';
import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';

const fields = [
  'site_key','id','slug','title','work_type','company','role','platform','audience',
  'excerpt','featured_image','featured_image_alt','project_url','secondary_url','tags',
  'body_html','seo_title','seo_description','og_image','status','author_name',
  'published_at','created_at','updated_at'
].join(',');

function cleanPost(body = {}) {
  const status = body.status === 'published' ? 'published' : 'draft';
  return {
    slug: String(body.slug || '').trim(),
    title: String(body.title || '').trim(),
    work_type: String(body.workType ?? body.work_type ?? '').trim(),
    company: String(body.company || '').trim(),
    role: String(body.role || '').trim(),
    platform: String(body.platform || '').trim(),
    audience: String(body.audience || '').trim(),
    excerpt: String(body.excerpt || ''),
    featured_image: String(body.featuredImage ?? body.featured_image ?? ''),
    featured_image_alt: String(body.featuredImageAlt ?? body.featured_image_alt ?? ''),
    project_url: String(body.projectUrl ?? body.project_url ?? ''),
    secondary_url: String(body.secondaryUrl ?? body.secondary_url ?? ''),
    tags: Array.isArray(body.tags) ? body.tags.map(value => String(value).trim()).filter(Boolean) : [],
    body_html: String(body.bodyHtml ?? body.body_html ?? ''),
    seo_title: String(body.seoTitle ?? body.seo_title ?? ''),
    seo_description: String(body.seoDescription ?? body.seo_description ?? ''),
    og_image: String(body.ogImage ?? body.og_image ?? ''),
    status,
    author_name: String(body.authorName ?? body.author_name ?? 'Justin DeMatteis').trim() || 'Justin DeMatteis',
    published_at: status === 'published'
      ? (body.publishedAt ?? body.published_at ?? new Date().toISOString())
      : null,
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireWebsiteOwner(req, res);
  if (!user) return;

  const siteKey = String(req.query?.site || req.body?.siteKey || 'justindematteis').trim().toLowerCase() || 'justindematteis';
  const siteFilter = `site_key=eq.${encodeURIComponent(siteKey)}`;

  try {
    if (req.method === 'GET') {
      const id = String(req.query?.id || '').trim();
      const slug = String(req.query?.slug || '').trim();
      let path = `work_posts?${siteFilter}&select=${fields}&order=updated_at.desc`;
      if (id) path = `work_posts?${siteFilter}&id=eq.${encodeURIComponent(id)}&select=${fields}&limit=1`;
      else if (slug) path = `work_posts?${siteFilter}&slug=eq.${encodeURIComponent(slug)}&select=${fields}&limit=1`;

      const response = await supabaseUserRest(user.accessToken, path, { method: 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load work posts');
      return res.status(200).json({ posts: Array.isArray(data) ? data : [] });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing work post id' });
      const response = await supabaseUserRest(
        user.accessToken,
        `work_posts?${siteFilter}&id=eq.${encodeURIComponent(id)}`,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Unable to delete work post');
      }
      return res.status(200).json({ ok: true });
    }

    const payload = { ...cleanPost(req.body || {}), site_key: siteKey };
    if (!payload.title) return res.status(400).json({ error: 'Title is required' });
    if (!payload.slug) return res.status(400).json({ error: 'Slug is required' });

    const id = String(req.body?.id || '').trim();
    const path = id ? `work_posts?${siteFilter}&id=eq.${encodeURIComponent(id)}` : 'work_posts';
    const response = await supabaseUserRest(user.accessToken, path, {
      method: id ? 'PATCH' : 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || 'Unable to save work post');
    return res.status(200).json({ post: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Work post admin request failed' });
  }
}
