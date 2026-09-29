import { adminFetch, parseJsonResponse } from './apiClient';

const parseResponse = response => parseJsonResponse(response, 'Inventory Opportunities request failed');

export async function loadInventoryIntel(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/inventory-intel', {}, accessToken));
  return Array.isArray(payload.deals) ? payload.deals : [];
}

export async function addInventoryIntelItem(accessToken, item) {
  const payload = await parseResponse(await adminFetch('/api/admin/inventory-intel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  }, accessToken));
  return payload.deal;
}

export async function updateInventoryIntelItem(accessToken, id, patch) {
  const payload = await parseResponse(await adminFetch('/api/admin/inventory-intel', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...patch }),
  }, accessToken));
  return payload.deal;
}

export async function deleteInventoryIntelItem(accessToken, id) {
  await parseResponse(await adminFetch('/api/admin/inventory-intel', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }, accessToken));
}
