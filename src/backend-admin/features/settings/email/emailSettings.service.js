import { adminFetch, parseJsonResponse } from '../../../services/apiClient';

const parseResponse = response => parseJsonResponse(response, 'Email settings request failed');

export async function loadEmailSettings(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/email-settings', {}, accessToken));
  return payload.settings || null;
}

export async function saveEmailSettings(accessToken, settings) {
  const payload = await parseResponse(await adminFetch('/api/admin/email-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }, accessToken));
  return payload.settings || null;
}

export async function sendEmailSettingsTest(accessToken) {
  return parseResponse(await adminFetch('/api/admin/email-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'test' }),
  }, accessToken));
}
