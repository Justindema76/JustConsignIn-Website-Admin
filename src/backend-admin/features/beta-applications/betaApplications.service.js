import { adminFetch, parseJsonResponse } from '../../services/apiClient';

const parseResponse = response => parseJsonResponse(response, 'Beta application admin request failed');

export async function loadBetaApplications(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/beta-applications', {}, accessToken));
  return Array.isArray(payload.applications) ? payload.applications : [];
}

export async function updateBetaApplication(accessToken, changes) {
  const payload = await parseResponse(await adminFetch('/api/admin/beta-applications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  }, accessToken));
  return payload.application;
}

export async function deleteBetaApplication(accessToken, id) {
  return parseResponse(await adminFetch('/api/admin/beta-applications', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }, accessToken));
}
