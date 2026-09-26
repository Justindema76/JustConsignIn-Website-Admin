import { supabaseUserRest, supabaseUserStorage, supabaseUrl } from '../_lib/supabase.js';
import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';

const MEDIA_BUCKETS = [
  { bucket: 'site-assets', mediaType: 'image', protectedAsset: true },
  { bucket: 'work-media', mediaType: 'work' },
  { bucket: 'blog-images', mediaType: 'image' },
  { bucket: 'social-videos', mediaType: 'video' },
  { bucket: 'social-audio', mediaType: 'audio' },
];

function youtubeId(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
    const v = url.searchParams.get('v');
    if (v) return v;
    const parts = url.pathname.split('/').filter(Boolean);
    const marker = parts.findIndex(part => ['embed', 'shorts', 'live'].includes(part));
    if (marker >= 0 && parts[marker + 1]) return parts[marker + 1];
  } catch {}
  return /^[A-Za-z0-9_-]{6,}$/.test(raw) ? raw : '';
}

function youtubeContentType(value = '', requested = '') {
  const explicit = String(requested || '').trim().toLowerCase();
  if (explicit === 'short') return 'short';
  if (explicit === 'video') return 'video';
  return /youtube\.com\/shorts\//i.test(String(value || '')) ? 'short' : 'video';
}

function cleanVideo(body = {}) {
  const url = String(body.youtubeUrl || body.youtube_url || '').trim();
  return {
    title: String(body.title || '').trim(),
    youtube_url: url,
    youtube_id: youtubeId(url),
    description: String(body.description || ''),
    placement: String(body.placement || 'homepage').trim().toLowerCase() || 'homepage',
    sort_order: Number.isFinite(Number(body.sortOrder ?? body.sort_order)) ? Number(body.sortOrder ?? body.sort_order) : 0,
    status: body.status === 'hidden' ? 'hidden' : 'active',
    content_type: youtubeContentType(url, body.contentType ?? body.content_type),
    playlist_name: String(body.playlistName ?? body.playlist_name ?? 'JustConsignIn').trim().slice(0, 160) || 'JustConsignIn',
    updated_at: new Date().toISOString(),
  };
}

function socialValue(body = {}) {
  const input = body.social || body.value || body;
  const keys = ['facebook', 'instagram', 'linkedin', 'github', 'youtube', 'tiktok'];
  return Object.fromEntries(keys.map(key => [key, {
    url: String(input?.[key]?.url || '').trim(),
    enabled: input?.[key]?.enabled !== false,
  }]));
}

const WORK_POST_FIELDS = [
  'site_key','id','slug','title','work_type','company','role','platform','audience',
  'excerpt','featured_image','featured_image_alt','project_url','secondary_url','tags',
  'sections','body_html','seo_title','seo_description','og_image','status','author_name',
  'published_at','created_at','updated_at'
].join(',');
const AI_POST_FIELDS = WORK_POST_FIELDS;

function cleanWorkPost(body = {}) {
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
    sections: body.sections && typeof body.sections === 'object' && !Array.isArray(body.sections) ? body.sections : {},
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

function publicMediaUrl(bucket, name) {
  return `${supabaseUrl()}/storage/v1/object/public/${bucket}/${String(name || '').split('/').map(encodeURIComponent).join('/')}`;
}

async function listMediaBucket(accessToken, { bucket, mediaType, protectedAsset = false }) {
  const response = await supabaseUserStorage(accessToken, `object/list/${bucket}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 200, offset: 0, sortBy: { column: 'created_at', order: 'desc' } }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || data?.error || `Unable to load ${mediaType} media`);
  return (Array.isArray(data) ? data : [])
    .filter(item => item?.name && item.name !== '.emptyFolderPlaceholder')
    .map(item => ({
      name: item.name,
      path: item.name,
      bucket,
      mediaType,
      url: publicMediaUrl(bucket, item.name),
      createdAt: item.created_at || item.updated_at || '',
      updatedAt: item.updated_at || '',
      metadata: item.metadata || {},
      protectedAsset,
    }));
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireWebsiteOwner(req, res);
  if (!user) return;

  const resource = String(req.query?.resource || '').trim().toLowerCase();
  const siteKey = String(req.query?.site || req.body?.siteKey || 'justconsignin').trim().toLowerCase() || 'justconsignin';
  const siteFilter = `site_key=eq.${encodeURIComponent(siteKey)}`;

  try {
    if (req.method === 'GET' && resource === 'sites') {
      const response = await supabaseUserRest(user.accessToken, 'sites?select=site_key,name,domain,admin_label,is_active&is_active=eq.true&order=name.asc', { method: 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load websites');
      return res.status(200).json({ sites: data });
    }
    if (req.method === 'GET' && resource === 'page') {
      const pageId = String(req.query?.pageId || '').trim();
      if (!pageId) return res.status(400).json({ error: 'Missing page id' });

      const [draftResponse, publishedResponse] = await Promise.all([
        supabaseUserRest(user.accessToken, `site_page_drafts?${siteFilter}&page_id=eq.${encodeURIComponent(pageId)}&select=site_key,page_id,path,title,content,updated_at&limit=1`, { method: 'GET' }),
        supabaseUserRest(user.accessToken, `site_pages?${siteFilter}&page_id=eq.${encodeURIComponent(pageId)}&select=site_key,page_id,path,title,content,published_at,updated_at&limit=1`, { method: 'GET' }),
      ]);

      const draftData = await draftResponse.json();
      const publishedData = await publishedResponse.json();
      if (!draftResponse.ok) throw new Error(draftData?.message || 'Unable to load page draft');
      if (!publishedResponse.ok) throw new Error(publishedData?.message || 'Unable to load published page');

      return res.status(200).json({
        draft: Array.isArray(draftData) ? (draftData[0] || null) : null,
        published: Array.isArray(publishedData) ? (publishedData[0] || null) : null,
      });
    }

    if (req.method === 'POST' && resource === 'page') {
      const pageId = String(req.body?.pageId || '').trim();
      const pagePath = String(req.body?.path || '/').trim() || '/';
      const title = String(req.body?.title || '').trim();
      const action = req.body?.action === 'publish' ? 'publish' : 'draft';
      const pageContent = req.body?.content;

      if (!pageId) return res.status(400).json({ error: 'Missing page id' });
      if (!title) return res.status(400).json({ error: 'Missing page title' });
      if (!pageContent || typeof pageContent !== 'object' || !Array.isArray(pageContent.content)) {
        return res.status(400).json({ error: 'Invalid page content' });
      }

      const now = new Date().toISOString();
      const draftResponse = await supabaseUserRest(user.accessToken, 'site_page_drafts?on_conflict=site_key,page_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          site_key: siteKey,
          page_id: pageId,
          path: pagePath,
          title,
          content: pageContent,
          updated_at: now,
        }),
      });
      const draftData = await draftResponse.json();
      if (!draftResponse.ok) throw new Error(draftData?.message || 'Unable to save page draft');

      let published = null;
      if (action === 'publish') {
        const publishedResponse = await supabaseUserRest(user.accessToken, 'site_pages?on_conflict=site_key,page_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({
            site_key: siteKey,
            page_id: pageId,
            path: pagePath,
            title,
            content: pageContent,
            published_at: now,
            updated_at: now,
          }),
        });
        const publishedData = await publishedResponse.json();
        if (!publishedResponse.ok) throw new Error(publishedData?.message || 'Unable to publish page');
        published = Array.isArray(publishedData) ? (publishedData[0] || null) : publishedData;

        const versionResponse = await supabaseUserRest(user.accessToken, 'site_page_versions', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            site_key: siteKey,
            page_id: pageId,
            path: pagePath,
            title,
            content: pageContent,
            published_at: now,
          }),
        });
        if (!versionResponse.ok) {
          await versionResponse.json().catch(() => ({}));
        }
      }

      return res.status(200).json({
        draft: Array.isArray(draftData) ? (draftData[0] || null) : draftData,
        published,
      });
    }

    if (req.method === 'GET' && resource === 'styles') {
      const response = await supabaseUserRest(user.accessToken, `site_settings?${siteFilter}&key=eq.global_styles&select=site_key,key,value,updated_at&limit=1`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load global styles');
      return res.status(200).json({ value: data?.[0]?.value || null, updatedAt: data?.[0]?.updated_at || '' });
    }

    if (req.method === 'POST' && resource === 'styles') {
      const value = req.body?.value;
      if (!value || typeof value !== 'object') return res.status(400).json({ error: 'Invalid global styles value' });

      const response = await supabaseUserRest(user.accessToken, 'site_settings?on_conflict=site_key,key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ site_key: siteKey, key: 'global_styles', value, updated_at: new Date().toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to save global styles');
      return res.status(200).json({ value: data?.[0]?.value || value, updatedAt: data?.[0]?.updated_at || new Date().toISOString() });
    }

    if (req.method === 'GET' && resource === 'global') {
      const key = String(req.query?.key || '').trim().toLowerCase();
      if (!['header', 'footer', 'project-request'].includes(key)) return res.status(400).json({ error: 'Invalid global section' });
      const response = await supabaseUserRest(user.accessToken, `site_settings?${siteFilter}&key=eq.${encodeURIComponent(`global_${key}`)}&select=site_key,key,value,updated_at&limit=1`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load global website section');
      return res.status(200).json({ value: data?.[0]?.value || null, updatedAt: data?.[0]?.updated_at || '' });
    }

    if (req.method === 'POST' && resource === 'global') {
      const key = String(req.body?.key || '').trim().toLowerCase();
      const value = req.body?.value;
      if (!['header', 'footer', 'project-request'].includes(key)) return res.status(400).json({ error: 'Invalid global section' });
      if (!value || typeof value !== 'object') return res.status(400).json({ error: 'Invalid global section value' });

      const response = await supabaseUserRest(user.accessToken, 'site_settings?on_conflict=site_key,key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ site_key: siteKey, key: `global_${key}`, value, updated_at: new Date().toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to save global website section');
      return res.status(200).json({ value: data?.[0]?.value || value, updatedAt: data?.[0]?.updated_at || new Date().toISOString() });
    }

    if (resource === 'work-posts') {
      if (req.method === 'GET') {
        const id = String(req.query?.id || '').trim();
        const slug = String(req.query?.slug || '').trim();
        let path = `work_posts?${siteFilter}&select=${WORK_POST_FIELDS}&order=updated_at.desc`;
        if (id) path = `work_posts?${siteFilter}&id=eq.${encodeURIComponent(id)}&select=${WORK_POST_FIELDS}&limit=1`;
        else if (slug) path = `work_posts?${siteFilter}&slug=eq.${encodeURIComponent(slug)}&select=${WORK_POST_FIELDS}&limit=1`;

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

      if (req.method === 'POST') {
        const payload = { ...cleanWorkPost(req.body || {}), site_key: siteKey };
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
      }
    }

    if (resource === 'ai-posts') {
      if (req.method === 'GET') {
        const id = String(req.query?.id || '').trim();
        const slug = String(req.query?.slug || '').trim();
        let path = `ai_posts?${siteFilter}&select=${AI_POST_FIELDS}&order=updated_at.desc`;
        if (id) path = `ai_posts?${siteFilter}&id=eq.${encodeURIComponent(id)}&select=${AI_POST_FIELDS}&limit=1`;
        else if (slug) path = `ai_posts?${siteFilter}&slug=eq.${encodeURIComponent(slug)}&select=${AI_POST_FIELDS}&limit=1`;

        const response = await supabaseUserRest(user.accessToken, path, { method: 'GET' });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || 'Unable to load AI posts');
        return res.status(200).json({ posts: Array.isArray(data) ? data : [] });
      }

      if (req.method === 'DELETE') {
        const id = String(req.query?.id || '').trim();
        if (!id) return res.status(400).json({ error: 'Missing AI post id' });
        const response = await supabaseUserRest(
          user.accessToken,
          `ai_posts?${siteFilter}&id=eq.${encodeURIComponent(id)}`,
          { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.message || 'Unable to delete AI post');
        }
        return res.status(200).json({ ok: true });
      }

      if (req.method === 'POST') {
        const payload = { ...cleanWorkPost(req.body || {}), site_key: siteKey };
        if (!payload.title) return res.status(400).json({ error: 'Title is required' });
        if (!payload.slug) return res.status(400).json({ error: 'Slug is required' });

        const id = String(req.body?.id || '').trim();
        const path = id ? `ai_posts?${siteFilter}&id=eq.${encodeURIComponent(id)}` : 'ai_posts';
        const response = await supabaseUserRest(user.accessToken, path, {
          method: id ? 'PATCH' : 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || 'Unable to save AI post');
        return res.status(200).json({ post: Array.isArray(data) ? data[0] : data });
      }
    }

    if (req.method === 'GET' && resource === 'videos') {
      const response = await supabaseUserRest(user.accessToken, `site_videos?${siteFilter}&select=*&order=placement.asc,playlist_name.asc,content_type.asc,sort_order.asc,created_at.asc`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load videos');
      return res.status(200).json({ videos: data });
    }

    if (req.method === 'GET' && resource === 'social') {
      const response = await supabaseUserRest(user.accessToken, `site_settings?${siteFilter}&key=eq.social_links&select=site_key,key,value,updated_at&limit=1`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load social links');
      return res.status(200).json({ social: data?.[0]?.value || socialValue({}) });
    }

    if (req.method === 'GET' && resource === 'media') {
      const groups = await Promise.all(MEDIA_BUCKETS.map(config => listMediaBucket(user.accessToken, config)));
      const media = groups.flat().sort((a, b) => {
        const left = new Date(a.createdAt || 0).getTime() || 0;
        const right = new Date(b.createdAt || 0).getTime() || 0;
        return right - left;
      });
      return res.status(200).json({ media });
    }

    if (req.method === 'DELETE' && resource === 'media') {
      const bucket = String(req.query?.bucket || '').trim();
      const objectPath = String(req.query?.path || '').trim();
      const allowedBuckets = new Set(MEDIA_BUCKETS.map(item => item.bucket));

      if (!allowedBuckets.has(bucket)) return res.status(400).json({ error: 'Invalid media bucket' });
      if (bucket === 'site-assets') {
        return res.status(409).json({ error: 'Website page assets are protected. Replace the image on the page instead of deleting the stored asset.' });
      }
      if (!objectPath || objectPath.includes('..')) return res.status(400).json({ error: 'Invalid media path' });

      const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
      const response = await supabaseUserStorage(user.accessToken, `object/${encodeURIComponent(bucket)}/${encodedPath}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || 'Unable to delete media');
      }

      return res.status(200).json({ ok: true, bucket, path: objectPath });
    }

    if (req.method === 'DELETE' && resource === 'videos') {
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing video id' });
      const response = await supabaseUserRest(user.accessToken, `site_videos?${siteFilter}&id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!response.ok) throw new Error('Unable to delete video');
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST' && resource === 'videos') {
      const payload = cleanVideo(req.body || {});
      if (!payload.title) return res.status(400).json({ error: 'Video title is required' });
      if (!payload.youtube_url || !payload.youtube_id) return res.status(400).json({ error: 'Enter a valid YouTube URL' });
      const id = String(req.body?.id || '').trim();
      const path = id ? `site_videos?${siteFilter}&id=eq.${encodeURIComponent(id)}` : 'site_videos';
      const response = await supabaseUserRest(user.accessToken, path, {
        method: id ? 'PATCH' : 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...payload, site_key: siteKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to save video');
      return res.status(200).json({ video: Array.isArray(data) ? data[0] : data });
    }

    if (req.method === 'POST' && resource === 'social') {
      const value = socialValue(req.body || {});
      const response = await supabaseUserRest(user.accessToken, 'site_settings?on_conflict=site_key,key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ site_key: siteKey, key: 'social_links', value, updated_at: new Date().toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to save social links');
      return res.status(200).json({ social: data?.[0]?.value || value });
    }

    if (req.method === 'POST' && resource === 'upload') {
      const mimeType = String(req.body?.mimeType || '').toLowerCase();
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
      if (!allowedTypes.has(mimeType)) return res.status(400).json({ error: 'Use a JPG, PNG, WebP, or GIF image' });
      const rawBase64 = String(req.body?.base64 || '').replace(/^data:[^;]+;base64,/, '');
      if (!rawBase64) return res.status(400).json({ error: 'Missing image data' });
      const buffer = Buffer.from(rawBase64, 'base64');
      if (!buffer.length || buffer.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'Image must be 2 MB or smaller' });
      const original = String(req.body?.filename || 'image').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
      const objectName = `${Date.now()}-${original}`;
      const response = await supabaseUserStorage(user.accessToken, `object/blog-images/${encodeURIComponent(objectName)}`, {
        method: 'POST',
        headers: { 'Content-Type': mimeType, 'x-upsert': 'false' },
        body: buffer,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || 'Unable to upload image');
      }
      const publicUrl = publicMediaUrl('blog-images', objectName);
      return res.status(200).json({ url: publicUrl, path: objectName });
    }

    return res.status(400).json({ error: 'Unknown site admin resource' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Website admin request failed' });
  }
}
