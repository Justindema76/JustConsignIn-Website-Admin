import { emptySocialLinks, normalizeVideo } from './siteContent';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || 'https://nowsajdmbpxvlvrhopjg.supabase.co').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AZbVouJ6gN00dQGdZwPjog_GTQR0J-w');
const BLOG_IMAGE_BUCKET = 'blog-images';
const SOCIAL_AUDIO_BUCKET = 'social-audio';
const SOCIAL_VIDEO_BUCKET = 'social-videos';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/x-m4a', 'audio/ogg']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4']);
const SESSION_KEY = 'justconsignin-website-admin-session-v1';
const TOKEN_KEY = 'justconsignin-website-admin-access-token-v1';
const REFRESH_KEY = 'justconsignin-website-admin-refresh-token-v1';

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || 'Website admin request failed');
  return payload;
}

function currentAccessToken(fallback = '') {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(TOKEN_KEY) || fallback;
}

function persistRefreshedSession(payload = {}) {
  if (typeof window === 'undefined') return;
  if (payload.accessToken) localStorage.setItem(TOKEN_KEY, payload.accessToken);
  if (payload.refreshToken) localStorage.setItem(REFRESH_KEY, payload.refreshToken);
  if (payload.user) localStorage.setItem(SESSION_KEY, JSON.stringify(payload.user));
  window.dispatchEvent(new CustomEvent('jci-admin-session-refreshed', { detail: payload }));
}

async function refreshAdminAccessToken() {
  if (typeof window === 'undefined') return '';
  const refreshToken = localStorage.getItem(REFRESH_KEY) || '';
  if (!refreshToken) return '';

  const response = await fetch('/api/auth/refresh?admin=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.accessToken) return '';
  persistRefreshedSession(payload);
  return payload.accessToken;
}

function headers(accessToken, json = false) {
  return {
    Authorization: `Bearer ${currentAccessToken(accessToken)}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function adminFetch(url, options = {}, accessToken = '') {
  const makeRequest = token => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  let token = currentAccessToken(accessToken);
  let response = await makeRequest(token);
  if (response.status !== 401) return response;

  const refreshed = await refreshAdminAccessToken();
  if (!refreshed) return response;
  return makeRequest(refreshed);
}

function safeFilename(filename = 'file') {
  return String(filename || 'file').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
}

function publicMediaUrl(bucket, name) {
  const encoded = String(name || '').split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}

async function uploadPublicAsset(accessToken, file, { bucket, allowedTypes, maxBytes, invalidTypeMessage }) {
  if (!accessToken && !currentAccessToken()) throw new Error('Your admin session expired. Sign in again.');
  if (!file) throw new Error('Choose a file first.');
  const type = String(file.type || '').toLowerCase();
  if (!allowedTypes.has(type)) throw new Error(invalidTypeMessage);
  if (!file.size) throw new Error('The selected file is empty.');
  if (file.size > maxBytes) throw new Error(`File must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`);

  const objectName = `${Date.now()}-${safeFilename(file.name)}`;
  const encodedName = objectName.split('/').map(encodeURIComponent).join('/');
  const upload = token => fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodedName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': type,
      'x-upsert': 'false',
      'Cache-Control': '3600',
    },
    body: file,
  });

  let response = await upload(currentAccessToken(accessToken));
  if (response.status === 401) {
    const refreshed = await refreshAdminAccessToken();
    if (refreshed) response = await upload(refreshed);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.message || payload.error || `Supabase upload failed (${response.status})`;
    throw new Error(detail);
  }

  return publicMediaUrl(bucket, objectName);
}

async function imageToJpegFile(source, filename = 'social-image.jpg') {
  let blob;
  if (source instanceof Blob) blob = source;
  else {
    const response = await fetch(source, { mode: 'cors' });
    if (!response.ok) throw new Error(`Unable to load image for conversion (${response.status}).`);
    blob = await response.blob();
  }

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Unable to prepare image conversion.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!jpeg) throw new Error('Unable to convert image to JPEG.');
  return new File([jpeg], filename.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

export async function loadAdminVideos(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/site?resource=videos', {}, accessToken));
  return Array.isArray(payload.videos) ? payload.videos.map(normalizeVideo) : [];
}

export async function saveAdminVideo(accessToken, video) {
  const payload = await parseResponse(await adminFetch('/api/admin/site?resource=videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(video),
  }, accessToken));
  return normalizeVideo(payload.video || {});
}

export async function deleteAdminVideo(accessToken, id) {
  await parseResponse(await adminFetch(`/api/admin/site?resource=videos&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, accessToken));
}

export async function loadAdminSocial(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/site?resource=social', {}, accessToken));
  return { ...emptySocialLinks(), ...(payload.social || {}) };
}

export async function saveAdminSocial(accessToken, social) {
  const payload = await parseResponse(await adminFetch('/api/admin/site?resource=social', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ social }),
  }, accessToken));
  return { ...emptySocialLinks(), ...(payload.social || {}) };
}

export async function loadAdminMedia(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/site?resource=media', {}, accessToken));
  return Array.isArray(payload.media) ? payload.media : [];
}

export async function uploadBlogImage(accessToken, file) {
  return uploadPublicAsset(accessToken, file, {
    bucket: BLOG_IMAGE_BUCKET,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxBytes: MAX_IMAGE_BYTES,
    invalidTypeMessage: 'Use a JPG, PNG, WebP, or GIF image.',
  });
}

export async function uploadSocialImage(accessToken, file) {
  if (!file) throw new Error('Choose an image first.');
  const type = String(file.type || '').toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(type)) throw new Error('Use a JPG, PNG, WebP, or GIF image.');
  const prepared = type === 'image/jpeg' ? file : await imageToJpegFile(file, file.name || 'social-image.jpg');
  return uploadBlogImage(accessToken, prepared);
}

export async function ensureTikTokCompatibleImage(accessToken, url) {
  const clean = String(url || '').split('?')[0].toLowerCase();
  if (/\.jpe?g$/.test(clean)) return url;
  const file = await imageToJpegFile(url, `tiktok-${Date.now()}.jpg`);
  return uploadBlogImage(accessToken, file);
}

export async function uploadSocialAudio(accessToken, file) {
  return uploadPublicAsset(accessToken, file, {
    bucket: SOCIAL_AUDIO_BUCKET,
    allowedTypes: ALLOWED_AUDIO_TYPES,
    maxBytes: MAX_AUDIO_BYTES,
    invalidTypeMessage: 'Use an MP3, M4A/MP4 audio, WAV, AAC, or OGG file.',
  });
}

export async function uploadSocialVideo(accessToken, file) {
  return uploadPublicAsset(accessToken, file, {
    bucket: SOCIAL_VIDEO_BUCKET,
    allowedTypes: ALLOWED_VIDEO_TYPES,
    maxBytes: MAX_VIDEO_BYTES,
    invalidTypeMessage: 'Use an MP4 video.',
  });
}
