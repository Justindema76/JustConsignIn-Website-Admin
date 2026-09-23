import { emptySocialLinks, normalizeVideo } from '../config/siteContent';
import { adminFetch, currentAccessToken, parseJsonResponse, refreshAdminAccessToken } from './apiClient';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || 'https://nowsajdmbpxvlvrhopjg.supabase.co').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AZbVouJ6gN00dQGdZwPjog_GTQR0J-w');
const BLOG_IMAGE_BUCKET = 'blog-images';
const SITE_ASSET_BUCKET = 'site-assets';
const WORK_MEDIA_BUCKET = 'work-media';
const SOCIAL_AUDIO_BUCKET = 'social-audio';
const SOCIAL_VIDEO_BUCKET = 'social-videos';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_WORK_VIDEO_BYTES = 100 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/x-m4a', 'audio/ogg']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/m4v']);
const ALLOWED_WORK_VIDEO_TYPES = new Set([...ALLOWED_VIDEO_TYPES, 'video/webm']);
const VIDEO_TYPE_BY_EXTENSION = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
};

export const DEFAULT_ADMIN_SITE_KEY = 'justconsignin';

export function getAdminSiteKey() {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_SITE_KEY;
  return window.localStorage.getItem('justinnovate-admin-site') || DEFAULT_ADMIN_SITE_KEY;
}

export function setAdminSiteKey(siteKey) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('justinnovate-admin-site', siteKey || DEFAULT_ADMIN_SITE_KEY);
}

function siteAdminUrl(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}site=${encodeURIComponent(getAdminSiteKey())}`;
}

const parseResponse = response => parseJsonResponse(response, 'Website admin request failed');

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
    throw new Error(payload.message || payload.error || `Supabase upload failed (${response.status})`);
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

function normalizeVideoUpload(file) {
  if (!file) throw new Error('Choose a video first.');
  const type = String(file.type || '').toLowerCase();
  if (ALLOWED_VIDEO_TYPES.has(type)) return file;

  const match = String(file.name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  const extension = match?.[1] || '';
  const inferredType = VIDEO_TYPE_BY_EXTENSION[extension];
  if (inferredType && (!type || type === 'application/octet-stream')) {
    return new File([file], file.name || `social-video.${extension}`, {
      type: inferredType,
      lastModified: file.lastModified || Date.now(),
    });
  }

  throw new Error('Use an MP4, MOV, or M4V video.');
}

export async function loadAdminVideos(accessToken) {
  const payload = await parseResponse(await adminFetch(siteAdminUrl('/api/admin/site?resource=videos'), {}, accessToken));
  return Array.isArray(payload.videos) ? payload.videos.map(normalizeVideo) : [];
}

export async function saveAdminVideo(accessToken, video) {
  const payload = await parseResponse(await adminFetch(siteAdminUrl('/api/admin/site?resource=videos'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(video),
  }, accessToken));
  return normalizeVideo(payload.video || {});
}

export async function deleteAdminVideo(accessToken, id) {
  await parseResponse(await adminFetch(siteAdminUrl(`/api/admin/site?resource=videos&id=${encodeURIComponent(id)}`), { method: 'DELETE' }, accessToken));
}

export async function loadAdminSocial(accessToken) {
  const payload = await parseResponse(await adminFetch(siteAdminUrl('/api/admin/site?resource=social'), {}, accessToken));
  return { ...emptySocialLinks(), ...(payload.social || {}) };
}

export async function saveAdminSocial(accessToken, social) {
  const payload = await parseResponse(await adminFetch(siteAdminUrl('/api/admin/site?resource=social'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ social }),
  }, accessToken));
  return { ...emptySocialLinks(), ...(payload.social || {}) };
}

export async function loadAdminMedia(accessToken) {
  const payload = await parseResponse(await adminFetch(siteAdminUrl('/api/admin/site?resource=media'), {}, accessToken));
  return Array.isArray(payload.media) ? payload.media : [];
}

export async function deleteAdminMedia(accessToken, item) {
  const bucket = String(item?.bucket || '').trim();
  const path = String(item?.path || '').trim();
  if (!bucket || !path) throw new Error('This media item cannot be deleted because its storage path is missing.');
  await parseResponse(await adminFetch(
    siteAdminUrl(`/api/admin/site?resource=media&bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`),
    { method: 'DELETE' },
    accessToken,
  ));
}

export async function uploadBlogImage(accessToken, file) {
  return uploadPublicAsset(accessToken, file, {
    bucket: BLOG_IMAGE_BUCKET,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxBytes: MAX_IMAGE_BYTES,
    invalidTypeMessage: 'Use a JPG, PNG, WebP, or GIF image.',
  });
}

export async function uploadSiteImage(accessToken, file) {
  return uploadPublicAsset(accessToken, file, {
    bucket: SITE_ASSET_BUCKET,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxBytes: MAX_IMAGE_BYTES,
    invalidTypeMessage: 'Use a JPG, PNG, WebP, or GIF image.',
  });
}

export async function uploadWorkImage(accessToken, file) {
  return uploadPublicAsset(accessToken, file, {
    bucket: WORK_MEDIA_BUCKET,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxBytes: MAX_IMAGE_BYTES,
    invalidTypeMessage: 'Use a JPG, PNG, WebP, or GIF image.',
  });
}

export async function uploadWorkVideo(accessToken, file) {
  if (!file) throw new Error('Choose a video first.');
  const type = String(file.type || '').toLowerCase();
  if (!ALLOWED_WORK_VIDEO_TYPES.has(type)) throw new Error('Use an MP4, MOV, M4V, or WebM video.');
  return uploadPublicAsset(accessToken, file, {
    bucket: WORK_MEDIA_BUCKET,
    allowedTypes: ALLOWED_WORK_VIDEO_TYPES,
    maxBytes: MAX_WORK_VIDEO_BYTES,
    invalidTypeMessage: 'Use an MP4, MOV, M4V, or WebM video.',
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
  const prepared = normalizeVideoUpload(file);
  return uploadPublicAsset(accessToken, prepared, {
    bucket: SOCIAL_VIDEO_BUCKET,
    allowedTypes: ALLOWED_VIDEO_TYPES,
    maxBytes: MAX_VIDEO_BYTES,
    invalidTypeMessage: 'Use an MP4, MOV, or M4V video.',
  });
}

export async function loadAdminSitePage(accessToken, pageId) {
  const payload = await parseResponse(await adminFetch(
    siteAdminUrl(`/api/admin/site?resource=page&pageId=${encodeURIComponent(pageId)}`),
    {},
    accessToken,
  ));
  return {
    draft: payload.draft || null,
    published: payload.published || null,
  };
}

async function saveAdminSitePage(accessToken, page, content, action) {
  return parseResponse(await adminFetch(siteAdminUrl('/api/admin/site?resource=page'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pageId: page.id,
      path: page.path,
      title: page.title,
      content,
      action,
    }),
  }, accessToken));
}

export async function saveAdminSitePageDraft(accessToken, page, content) {
  return saveAdminSitePage(accessToken, page, content, 'draft');
}

export async function publishAdminSitePage(accessToken, page, content) {
  return saveAdminSitePage(accessToken, page, content, 'publish');
}


export async function loadAdminGlobalSection(accessToken, key) {
  const payload = await parseResponse(await adminFetch(
    siteAdminUrl(`/api/admin/site?resource=global&key=${encodeURIComponent(key)}`),
    {},
    accessToken,
  ));
  return { value: payload.value || null, updatedAt: payload.updatedAt || '' };
}

export async function saveAdminGlobalSection(accessToken, key, value) {
  return parseResponse(await adminFetch(siteAdminUrl('/api/admin/site?resource=global'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  }, accessToken));
}


export async function loadAdminGlobalStyles(accessToken) {
  const payload = await parseResponse(await adminFetch(siteAdminUrl('/api/admin/site?resource=styles'), {}, accessToken));
  return { value: payload.value || null, updatedAt: payload.updatedAt || '' };
}

export async function saveAdminGlobalStyles(accessToken, value) {
  return parseResponse(await adminFetch(siteAdminUrl('/api/admin/site?resource=styles'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  }, accessToken));
}


export async function loadAdminSites(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/site?resource=sites', {}, accessToken));
  return Array.isArray(payload.sites) ? payload.sites : [];
}
