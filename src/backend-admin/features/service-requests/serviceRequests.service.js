import { adminFetch, parseJsonResponse } from '../../services/apiClient';

const parseResponse = response => parseJsonResponse(response, 'Service request admin request failed');

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
