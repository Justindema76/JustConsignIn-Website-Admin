import { adminFetch, parseJsonResponse } from '../../../services/apiClient';

const parseResponse = response => parseJsonResponse(response, 'Email settings request failed');

const urlForSite = siteKey => `/api/admin/email-settings?site=${encodeURIComponent(siteKey || 'justconsignin')}`;

export async function loadEmailSettings(accessToken, siteKey = 'justconsignin') {
  const payload = await parseResponse(await adminFetch(urlForSite(siteKey), {}, accessToken));
  return payload.settings || null;
}

export async function saveEmailSettings(accessToken, settings, siteKey = 'justconsignin') {
  const payload = await parseResponse(await adminFetch(urlForSite(siteKey), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }, accessToken));
  return payload.settings || null;
}

export async function sendEmailSettingsTest(accessToken, siteKey = 'justconsignin') {
  return parseResponse(await adminFetch(urlForSite(siteKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'test' }),
  }, accessToken));
}
