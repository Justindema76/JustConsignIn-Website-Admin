import { adminFetch, parseJsonResponse } from './apiClient';
import { getAdminSiteKey } from './siteAdminService';

const parseResponse = response => parseJsonResponse(response, 'Social automation request failed');
const siteUrl = path => {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}site=${encodeURIComponent(getAdminSiteKey())}`;
};

const json = body => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function loadSocialAutomation(accessToken) {
  return parseResponse(await adminFetch(siteUrl('/api/admin/social-automation'), {}, accessToken));
}

export async function saveSocialCampaign(accessToken, campaign) {
  const payload = await parseResponse(await adminFetch(siteUrl('/api/admin/social-automation'), json({ action: 'save', campaign }), accessToken));
  return payload.campaign;
}

export async function deleteSocialCampaign(accessToken, id) {
  return parseResponse(await adminFetch(siteUrl(`/api/admin/social-automation?id=${encodeURIComponent(id)}`), { method: 'DELETE' }, accessToken));
}

export async function startMetricoolConnection(accessToken) {
  return parseResponse(await adminFetch(siteUrl('/api/admin/social-automation'), json({ action: 'metricool-start' }), accessToken));
}

export async function disconnectMetricool(accessToken) {
  return parseResponse(await adminFetch(siteUrl('/api/admin/social-automation'), json({ action: 'metricool-disconnect' }), accessToken));
}

export async function testMetricoolConnection(accessToken) {
  return parseResponse(await adminFetch(siteUrl('/api/admin/social-automation'), json({ action: 'metricool-test' }), accessToken));
}

export async function sendCampaignToMetricool(accessToken, id) {
  return parseResponse(await adminFetch(siteUrl('/api/admin/social-automation'), json({ action: 'send', id }), accessToken));
}


export async function saveMetricoolBrand(accessToken, brandId) {
  return parseResponse(await adminFetch(siteUrl('/api/admin/social-automation'), json({ action: 'metricool-brand', brandId }), accessToken));
}
