import { adminFetch, currentAccessToken, parseJsonResponse, refreshAdminAccessToken } from '../../services/apiClient';

const parseResponse = response => parseJsonResponse(response, 'Service request admin request failed');

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || 'https://nowsajdmbpxvlvrhopjg.supabase.co').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AZbVouJ6gN00dQGdZwPjog_GTQR0J-w');
const SERVICE_REQUEST_ATTACHMENT_BUCKET = 'service-request-attachments';
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 5;
const MAX_ATTACHMENT_TOTAL_BYTES = 20 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/zip',
]);

function safeFilename(filename = 'attachment') {
  return String(filename || 'attachment').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'attachment';
}

function encodedStoragePath(path = '') {
  return String(path).split('/').map(encodeURIComponent).join('/');
}

export async function uploadServiceRequestAttachment(accessToken, requestId, file) {
  if (!requestId) throw new Error('Open a service request before adding an attachment.');
  if (!file) throw new Error('Choose a file first.');
  if (!ALLOWED_ATTACHMENT_TYPES.has(String(file.type || '').toLowerCase())) {
    throw new Error('Use PDF, Word, Excel, CSV, TXT, JPG, PNG, WebP, or ZIP files.');
  }
  if (!file.size) throw new Error('The selected file is empty.');
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('Each attachment must be 10 MB or smaller.');

  const path = `${requestId}/${Date.now()}-${safeFilename(file.name)}`;
  const encodedPath = encodedStoragePath(path);
  const upload = token => fetch(`${SUPABASE_URL}/storage/v1/object/${SERVICE_REQUEST_ATTACHMENT_BUCKET}/${encodedPath}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
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
    throw new Error(payload.message || payload.error || `Attachment upload failed (${response.status})`);
  }

  return {
    bucket: SERVICE_REQUEST_ATTACHMENT_BUCKET,
    path,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  };
}

export async function deleteServiceRequestAttachment(accessToken, attachment) {
  const path = String(attachment?.path || '').trim();
  if (!path) return;
  const remove = token => fetch(`${SUPABASE_URL}/storage/v1/object/${SERVICE_REQUEST_ATTACHMENT_BUCKET}/${encodedStoragePath(path)}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  let response = await remove(currentAccessToken(accessToken));
  if (response.status === 401) {
    const refreshed = await refreshAdminAccessToken();
    if (refreshed) response = await remove(refreshed);
  }
  if (!response.ok && response.status !== 404) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || 'Unable to remove attachment.');
  }
}

export const serviceRequestAttachmentLimits = {
  maxCount: MAX_ATTACHMENT_COUNT,
  maxBytes: MAX_ATTACHMENT_BYTES,
  maxTotalBytes: MAX_ATTACHMENT_TOTAL_BYTES,
};

export async function loadServiceRequests(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/service-requests', {}, accessToken));
  return Array.isArray(payload.requests) ? payload.requests : [];
}

export async function updateServiceRequest(accessToken, changes) {
  const payload = await parseResponse(await adminFetch('/api/admin/service-requests', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  }, accessToken));
  return payload.request;
}

export async function deleteServiceRequest(accessToken, id) {
  return parseResponse(await adminFetch('/api/admin/service-requests', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }, accessToken));
}

export async function loadServiceRequestEmails(accessToken, requestId) {
  const params = new URLSearchParams({ requestId });
  const payload = await parseResponse(await adminFetch(`/api/admin/service-request-emails?${params.toString()}`, {}, accessToken));
  return Array.isArray(payload.emails) ? payload.emails : [];
}

export async function sendServiceRequestEmail(accessToken, email) {
  return parseResponse(await adminFetch('/api/admin/service-request-emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(email),
  }, accessToken));
}


export async function assignServiceRequestDepartment(accessToken, values) {
  return parseResponse(await adminFetch('/api/admin/service-request-assignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  }, accessToken));
}
