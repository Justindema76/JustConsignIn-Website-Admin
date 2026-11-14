import { adminFetch, parseJsonResponse } from '../../services/apiClient';

// Banner Studio API (api/admin/code-studio.js). `site` is the admin site key, e.g. 'sunwings'.
const url = (site, query = '') => `/api/admin/code-studio?site=${encodeURIComponent(site)}${query}`;
const post = (accessToken, site, body, fallback) => adminFetch(url(site), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ site, ...body }),
}, accessToken).then(response => parseJsonResponse(response, fallback));

export async function listBanners(accessToken, site) {
  const payload = await parseJsonResponse(await adminFetch(url(site), {}, accessToken), 'Unable to load banners.');
  return Array.isArray(payload.banners) ? payload.banners : [];
}

export async function loadBanner(accessToken, site, id) {
  const payload = await parseJsonResponse(await adminFetch(url(site, `&id=${encodeURIComponent(id)}`), {}, accessToken), 'Unable to load the banner.');
  return payload.banner;
}

export async function createBanner(accessToken, site, title = 'New banner') {
  return (await post(accessToken, site, { action: 'create', title }, 'Unable to create the banner.')).banner;
}

export async function duplicateBanner(accessToken, site, id) {
  return (await post(accessToken, site, { action: 'duplicate', id }, 'Unable to duplicate the banner.')).banner;
}

export async function saveBanner(accessToken, site, { id, lang, title, data, code }) {
  return post(accessToken, site, { action: 'save', id, lang, title, data, code }, 'Unable to save the banner.');
}

// placements: { home: bannerId | '', contact: … }
export async function placeBanners(accessToken, site, placements) {
  return (await post(accessToken, site, { action: 'place', placements }, 'Unable to save where banners show.')).banners || [];
}

export async function deleteBanner(accessToken, site, id) {
  await parseJsonResponse(await adminFetch(url(site, `&id=${encodeURIComponent(id)}`), { method: 'DELETE' }, accessToken), 'Unable to delete the banner.');
}
