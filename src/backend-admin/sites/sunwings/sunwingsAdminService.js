import { adminFetch, parseJsonResponse } from '../../services/apiClient';

export async function loadSunwingsQuotes(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/quote-requests', {}, accessToken),
    'Unable to load Sunwings quote requests.',
  );
  return Array.isArray(payload.requests) ? payload.requests : [];
}

export async function updateSunwingsQuote(accessToken, id, status) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/quote-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }, accessToken),
    'Unable to update Sunwings quote request.',
  );
  return payload.request || null;
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
