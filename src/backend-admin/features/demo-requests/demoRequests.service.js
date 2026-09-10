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

export async function deleteDemoRequest(accessToken, id) {
  return parseResponse(await adminFetch('/api/admin/demo-requests', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }, accessToken));
}

export async function loadDemoRequestEmails(accessToken, requestId) {
  const params = new URLSearchParams({ requestId });
  const payload = await parseResponse(await adminFetch(`/api/admin/demo-request-emails?${params.toString()}`, {}, accessToken));
  return Array.isArray(payload.emails) ? payload.emails : [];
}

export async function sendDemoRequestEmail(accessToken, email) {
  return parseResponse(await adminFetch('/api/admin/demo-request-emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(email),
  }, accessToken));
}

export async function scheduleDemoRequest(accessToken, schedule) {
  return parseResponse(await adminFetch('/api/admin/demo-request-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schedule),
  }, accessToken));
}
