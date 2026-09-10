import { adminFetch, parseJsonResponse } from '../../services/apiClient';

const parseResponse = response => parseJsonResponse(response, 'Demo request admin request failed');

export async function loadDemoRequests(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/demo-requests', {}, accessToken));
  return Array.isArray(payload.requests) ? payload.requests : [];
}

export async function updateDemoRequest(accessToken, changes) {
  const payload = await parseResponse(await adminFetch('/api/admin/demo-requests', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  }, accessToken));
  return payload.request;
}
