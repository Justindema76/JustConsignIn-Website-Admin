import { supabaseUserRest, supabaseUserStorage, supabaseUrl } from '../_lib/supabase.js';
import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';

const MEDIA_BUCKETS = [
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
    updated_at: new Date().toISOString(),
  };
}

function socialValue(body = {}) {
  const input = body.social || body.value || body;
  const keys = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'];
  return Object.fromEntries(keys.map(key => [key, {
    url: String(input?.[key]?.url || '').trim(),
    enabled: input?.[key]?.enabled !== false,
  }]));
}

function publicMediaUrl(bucket, name) {
  return `${supabaseUrl()}/storage/v1/object/public/${bucket}/${String(name || '').split('/').map(encodeURIComponent).join('/')}`;
}

async function listMediaBucket(accessToken, { bucket, mediaType }) {
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
    }));
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireWebsiteOwner(req, res);
  if (!user) return;

  const resource = String(req.query?.resource || '').trim().toLowerCase();

  try {
    if (req.method === 'GET' && resource === 'videos') {
      const response = await supabaseUserRest(user.accessToken, 'site_videos?select=*&order=placement.asc,sort_order.asc,created_at.asc', { method: 'GET' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to load videos');
      return res.status(200).json({ videos: data });
    }

    if (req.method === 'GET' && resource === 'social') {
      const response = await supabaseUserRest(user.accessToken, 'site_settings?key=eq.social_links&select=key,value,updated_at&limit=1', { method: 'GET' });
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

    if (req.method === 'DELETE' && resource === 'videos') {
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing video id' });
      const response = await supabaseUserRest(user.accessToken, `site_videos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!response.ok) throw new Error('Unable to delete video');
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST' && resource === 'videos') {
      const payload = cleanVideo(req.body || {});
      if (!payload.title) return res.status(400).json({ error: 'Video title is required' });
      if (!payload.youtube_url || !payload.youtube_id) return res.status(400).json({ error: 'Enter a valid YouTube URL' });
      const id = String(req.body?.id || '').trim();
      const path = id ? `site_videos?id=eq.${encodeURIComponent(id)}` : 'site_videos';
      const response = await supabaseUserRest(user.accessToken, path, {
        method: id ? 'PATCH' : 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to save video');
      return res.status(200).json({ video: Array.isArray(data) ? data[0] : data });
    }

    if (req.method === 'POST' && resource === 'social') {
      const value = socialValue(req.body || {});
      const response = await supabaseUserRest(user.accessToken, 'site_settings?on_conflict=key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ key: 'social_links', value, updated_at: new Date().toISOString() }),
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
