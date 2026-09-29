import { adminFetch, parseJsonResponse } from './apiClient';

const parseResponse = response => parseJsonResponse(response, 'Buyer Leads request failed');

export async function loadBuyerLeads(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/buyer-leads', {}, accessToken));
  return Array.isArray(payload.leads) ? payload.leads : [];
}

export async function addBuyerLead(accessToken, lead) {
  const payload = await parseResponse(await adminFetch('/api/admin/buyer-leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  }, accessToken));
  return payload.lead;
}

export async function updateBuyerLead(accessToken, id, patch) {
  const payload = await parseResponse(await adminFetch('/api/admin/buyer-leads', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...patch }),
  }, accessToken));
  return payload.lead;
}

export async function deleteBuyerLead(accessToken, id) {
  await parseResponse(await adminFetch('/api/admin/buyer-leads', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }, accessToken));
}
