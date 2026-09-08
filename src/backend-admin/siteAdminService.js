import { emptySocialLinks, normalizeVideo } from './siteContent';

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Website admin request failed');
  return payload;
}

function headers(accessToken, json = false) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
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

export async function uploadBlogImage(accessToken, file) {
  if (!file) throw new Error('Choose an image first');
  if (file.size > 2 * 1024 * 1024) throw new Error('Image must be 2 MB or smaller');
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('Unable to read image'));
    reader.readAsDataURL(file);
  });
  const payload = await parseResponse(await fetch('/api/admin/site?resource=upload', {
    method: 'POST',
    headers: headers(accessToken, true),
    body: JSON.stringify({ filename: file.name, mimeType: file.type, base64 }),
  }));
  return payload.url || '';
}
