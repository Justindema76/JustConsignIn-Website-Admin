import { adminFetch, parseJsonResponse } from '../../services/apiClient';

const BASE = '/api/admin/rentrally';

async function get(path, key, fallback) {
  const payload = await parseJsonResponse(await adminFetch(`${BASE}/${path}`, {}, ''), fallback);
  return key ? (Array.isArray(payload[key]) ? payload[key] : payload[key] || []) : payload;
}

async function send(path, method, body, fallback) {
  return parseJsonResponse(await adminFetch(`${BASE}/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  }, ''), fallback);
}

// categories / products / packages share one shape: list, get one, save, delete
function collection(path, key, label) {
  return {
    list: () => get(path, key, `Unable to load ${label}.`),
    one: async id => (await get(`${path}?id=${encodeURIComponent(id)}`, key, `Unable to load ${label}.`))[0] || null,
    save: async row => (await send(path, 'POST', row, `Unable to save ${label}.`)).row,
    remove: id => send(`${path}?id=${encodeURIComponent(id)}`, 'DELETE', null, `Unable to delete ${label}.`),
  };
}

export const categoriesApi = collection('categories', 'categories', 'categories');
export const productsApi = collection('products', 'products', 'rentals');
export const packagesApi = collection('packages', 'packages', 'packages');

export const quotesApi = {
  list: () => get('quote-requests', 'requests', 'Unable to load quote requests.'),
  update: async patch => (await send('quote-requests', 'POST', patch, 'Unable to update the quote request.')).request,
  remove: id => send(`quote-requests?id=${encodeURIComponent(id)}`, 'DELETE', null, 'Unable to delete the quote request.'),
};

export const settingsApi = {
  load: async () => (await get('site-settings', null, 'Unable to load settings.')).settings || {},
  save: settings => send('site-settings', 'POST', { settings }, 'Unable to save settings.'),
};

export const importStarterCatalogue = () => send('import-starter', 'POST', null, 'Starter import failed.');

export const RENTRALLY_SITE_URL = 'https://rent-and-rally.vercel.app';

export const money = n => (n === null || n === undefined || n === '')
  ? '—'
  : `$${Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
