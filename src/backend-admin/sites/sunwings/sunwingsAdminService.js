import { adminFetch, parseJsonResponse } from '../../services/apiClient';

export async function loadSunwingsQuotes(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/quote-requests', {}, accessToken),
    'Unable to load Sunwings quote requests.',
  );
  return Array.isArray(payload.requests) ? payload.requests : [];
}

export async function updateSunwingsQuote(accessToken, request) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/quote-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }, accessToken),
    'Unable to update Sunwings quote request.',
  );
  return payload.request || null;
}

export async function deleteSunwingsQuote(accessToken, id) {
  await parseJsonResponse(
    await adminFetch(`/api/admin/sunwings/quote-requests?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }, accessToken),
    'Unable to delete Sunwings quote request.',
  );
}

export async function loadSunwingsSettings(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/site-settings', {}, accessToken),
    'Unable to load Sunwings settings.',
  );
  return payload.settings || {};
}

export async function saveSunwingsSettings(accessToken, settings) {
  await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    }, accessToken),
    'Unable to save Sunwings settings.',
  );
  return settings;
}

export async function loadSunwingsIntegrations(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/integrations', {}, accessToken),
    'Unable to load Sunwings integrations.',
  );
  return Array.isArray(payload.integrations) ? payload.integrations : [];
}

export async function saveSunwingsIntegration(accessToken, input) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }, accessToken),
    'Unable to save integration.',
  );
  return payload;
}

export async function loadSunwingsFacebookPosts(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/facebook-posts', {}, accessToken),
    'Unable to load Facebook posts.',
  );
  return { enabled: Boolean(payload.enabled), posts: Array.isArray(payload.posts) ? payload.posts : [] };
}

export async function syncSunwingsFacebookPosts(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/facebook-posts', { method: 'POST' }, accessToken),
    'Unable to sync Facebook posts.',
  );
  return { count: payload.count || 0, posts: Array.isArray(payload.posts) ? payload.posts : [] };
}
