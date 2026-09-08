import { emptySocialLinks, normalizeVideo } from './siteContent';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || 'https://nowsajdmbpxvlvrhopjg.supabase.co').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AZbVouJ6gN00dQGdZwPjog_GTQR0J-w');
const BLOG_IMAGE_BUCKET = 'blog-images';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || 'Website admin request failed');
  return payload;
}

function headers(accessToken, json = false) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function safeFilename(filename = 'image') {
  return String(filename || 'image').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
}

function publicMediaUrl(name) {
  const encoded = String(name || '').split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${BLOG_IMAGE_BUCKET}/${encoded}`;
}

export async function loadAdminVideos(accessToken) {
  const payload = await parseResponse(await fetch('/api/admin/site?resource=videos', { headers: headers(accessToken) }));
  return Array.isArray(payload.videos) ? payload.videos.map(normalizeVideo) : [];
}

export async function saveAdminVideo(accessToken, video) {
  const payload = await parseResponse(await fetch('/api/admin/site?resource=videos', {
    method: 'POST',
    headers: headers(accessToken, true),
    body: JSON.stringify(video),
  }));
  return normalizeVideo(payload.video || {});
}

export async function deleteAdminVideo(accessToken, id) {
  await parseResponse(await fetch(`/api/admin/site?resource=videos&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(accessToken),
  }));
}

export async function loadAdminSocial(accessToken) {
  const payload = await parseResponse(await fetch('/api/admin/site?resource=social', { headers: headers(accessToken) }));
  return { ...emptySocialLinks(), ...(payload.social || {}) };
}

export async function saveAdminSocial(accessToken, social) {
  const payload = await parseResponse(await fetch('/api/admin/site?resource=social', {
    method: 'POST',
    headers: headers(accessToken, true),
    body: JSON.stringify({ social }),
  }));
  return { ...emptySocialLinks(), ...(payload.social || {}) };
}

export async function loadAdminMedia(accessToken) {
  const payload = await parseResponse(await fetch('/api/admin/site?resource=media', { headers: headers(accessToken) }));
  return Array.isArray(payload.media) ? payload.media : [];
}

export async function uploadBlogImage(accessToken, file) {
  if (!accessToken) throw new Error('Your admin session expired. Sign in again.');
  if (!file) throw new Error('Choose an image first.');
  if (!ALLOWED_IMAGE_TYPES.has(String(file.type || '').toLowerCase())) throw new Error('Use a JPG, PNG, WebP, or GIF image.');
  if (!file.size) throw new Error('The selected image is empty.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image must be 5 MB or smaller.');

  const objectName = `${Date.now()}-${safeFilename(file.name)}`;
  const encodedName = objectName.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BLOG_IMAGE_BUCKET}/${encodedName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': file.type,
      'x-upsert': 'false',
      'Cache-Control': '3600',
    },
    body: file,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.message || payload.error || `Supabase upload failed (${response.status})`;
    throw new Error(detail);
  }

  return publicMediaUrl(objectName);
}
