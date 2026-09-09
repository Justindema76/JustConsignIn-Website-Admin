import { emptySocialLinks, normalizeVideo } from './siteContent';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || 'https://nowsajdmbpxvlvrhopjg.supabase.co').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AZbVouJ6gN00dQGdZwPjog_GTQR0J-w');
const BLOG_IMAGE_BUCKET = 'blog-images';
const SOCIAL_AUDIO_BUCKET = 'social-audio';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const TIKTOK_IMAGE_TYPES = new Set(['image/jpeg', 'image/webp']);
const ALLOWED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/x-m4a', 'audio/ogg']);

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

function safeFilename(filename = 'file') {
  return String(filename || 'file').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
}

function publicMediaUrl(bucket, name) {
  const encoded = String(name || '').split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}

async function uploadPublicAsset(accessToken, file, { bucket, allowedTypes, maxBytes, invalidTypeMessage }) {
  if (!accessToken) throw new Error('Your admin session expired. Sign in again.');
  if (!file) throw new Error('Choose a file first.');
  const type = String(file.type || '').toLowerCase();
  if (!allowedTypes.has(type)) throw new Error(invalidTypeMessage);
  if (!file.size) throw new Error('The selected file is empty.');
  if (file.size > maxBytes) throw new Error(`File must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`);

  const objectName = `${Date.now()}-${safeFilename(file.name)}`;
  const encodedName = objectName.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodedName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': type,
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

  return publicMediaUrl(bucket, objectName);
}

async function imageBlobToJpeg(blob, filename = 'social-image.jpg') {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error('Unable to read that image.');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not prepare the image.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!jpeg) throw new Error('Unable to convert the image to JPEG.');
    const base = safeFilename(filename).replace(/\.[^.]+$/, '') || 'social-image';
    return new File([jpeg], `${base}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
  const compatible = TIKTOK_IMAGE_TYPES.has(type) ? file : await imageBlobToJpeg(file, file.name || 'social-image.jpg');
  return uploadBlogImage(accessToken, compatible);
}

export async function ensureTikTokCompatibleImage(accessToken, url) {
  const source = String(url || '').trim();
  if (!source) return '';

  const response = await fetch(source, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to prepare the selected image for TikTok (${response.status}).`);
  const blob = await response.blob();
  const type = String(blob.type || response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (TIKTOK_IMAGE_TYPES.has(type)) return source;
  if (!type.startsWith('image/')) throw new Error('TikTok requires a JPEG or WebP image.');

  const converted = await imageBlobToJpeg(blob, 'tiktok-social-image.jpg');
  return uploadBlogImage(accessToken, converted);
}

export async function uploadSocialAudio(accessToken, file) {
  return uploadPublicAsset(accessToken, file, {
    bucket: SOCIAL_AUDIO_BUCKET,
    allowedTypes: ALLOWED_AUDIO_TYPES,
    maxBytes: MAX_AUDIO_BYTES,
    invalidTypeMessage: 'Use an MP3, M4A/MP4 audio, WAV, AAC, or OGG file.',
  });
}
