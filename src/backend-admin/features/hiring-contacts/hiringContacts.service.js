import { adminFetch, parseJsonResponse } from '../../services/apiClient';

const parseResponse = response => parseJsonResponse(response, 'Hiring contact admin request failed');

export async function loadHiringContacts(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/hiring-contacts', {}, accessToken));
  return Array.isArray(payload.contacts) ? payload.contacts : [];
}

export async function updateHiringContact(accessToken, changes) {
  const payload = await parseResponse(await adminFetch('/api/admin/hiring-contacts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  }, accessToken));
  return payload.contact;
}

export async function deleteHiringContact(accessToken, id) {
  return parseResponse(await adminFetch('/api/admin/hiring-contacts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }, accessToken));
}
