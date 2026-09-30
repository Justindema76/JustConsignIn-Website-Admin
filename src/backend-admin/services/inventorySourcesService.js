import { adminFetch, parseJsonResponse } from './apiClient';

export async function loadInventorySources(accessToken) {
  const response = await adminFetch('/api/admin/inventory-sources', {}, accessToken);
  const payload = await parseJsonResponse(response, 'Inventory Sources request failed');
  return Array.isArray(payload.sources) ? payload.sources : [];
}
