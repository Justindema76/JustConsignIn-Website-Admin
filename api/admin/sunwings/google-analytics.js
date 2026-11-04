import { requireSiteAccess } from '../../_lib/websiteAdmin.js';

// Sunwings Google Analytics (GA4) report for the admin Analytics page.
// Keyless: Vercel's OIDC token is swapped for a Google token through Workload
// Identity Federation, then the "Sunwings Analytics Reader" service account is
// impersonated. No JSON key file exists anywhere.

const ENV = {
  propertyId: 'GA4_PROPERTY_ID',
  projectNumber: 'GCP_PROJECT_NUMBER',
  poolId: 'GCP_WORKLOAD_IDENTITY_POOL_ID',
  providerId: 'GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID',
  serviceAccount: 'GCP_SERVICE_ACCOUNT_EMAIL',
};

let cachedToken = { value: '', expires: 0 };

function config() {
  const values = {};
  const missing = [];
  for (const [key, name] of Object.entries(ENV)) {
    values[key] = String(process.env[name] || '').trim();
    if (!values[key]) missing.push(name);
  }
  return { values, missing };
}

async function googleJson(response, step) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || data?.error_description || data?.error || response.statusText;
    throw new Error(`${step}: ${detail}`);
  }
  return data;
}

async function googleAccessToken(req, cfg) {
  if (cachedToken.value && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const oidc = String(req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN || '');
  if (!oidc) throw new Error('Vercel OIDC token missing. Turn on OIDC Federation for this Vercel project.');

  const sts = await googleJson(await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience: `//iam.googleapis.com/projects/${cfg.projectNumber}/locations/global/workloadIdentityPools/${cfg.poolId}/providers/${cfg.providerId}`,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      subjectToken: oidc,
      subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
    }),
  }), 'Google sign-in (token exchange)');

  const impersonated = await googleJson(await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(cfg.serviceAccount)}:generateAccessToken`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sts.access_token}` },
      body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/analytics.readonly'] }),
    },
  ), 'Google sign-in (service account)');

  cachedToken = { value: impersonated.accessToken, expires: new Date(impersonated.expireTime).getTime() || Date.now() + 30 * 60_000 };
  return cachedToken.value;
}

const eventFilter = names => ({ filter: { fieldName: 'eventName', inListFilter: { values: names } } });
const LEAD_EVENTS = ['phone_click', 'generate_lead', 'email_click'];

function rows(report) {
  return (report?.rows || []).map(row => ({
    dims: (row.dimensionValues || []).map(item => item.value),
    values: (row.metricValues || []).map(item => Number(item.value) || 0),
  }));
}

// Rows from a two-range request: the last dimension is the range name.
function byRange(report) {
  const out = { current: [], previous: [] };
  for (const row of rows(report)) {
    const range = row.dims[row.dims.length - 1];
    (out[range] || (out[range] = [])).push({ dims: row.dims.slice(0, -1), values: row.values });
  }
  return out;
}

function isoDate(value) {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

async function batch(propertyId, token, requests) {
  const data = await googleJson(await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:batchRunReports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ requests }),
  }), 'Google Analytics report');
  return data.reports || [];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireSiteAccess(req, res, 'sunwings');
  if (!user) return;

  const { values: cfg, missing } = config();
  if (missing.length) return res.status(200).json({ connected: false, reason: 'Google Analytics isn’t connected yet.', missing });

  const days = [7, 30, 90, 365].includes(Number(req.query?.days)) ? Number(req.query.days) : 30;
  const current = { startDate: `${days - 1}daysAgo`, endDate: 'today', name: 'current' };
  const previous = { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo`, name: 'previous' };
  const both = [current, previous];
  const now = [current];
  const top = (dimension, metric, limit = 10, extra = {}) => ({
    dateRanges: now, dimensions: [{ name: dimension }], metrics: [{ name: metric }],
    orderBys: [{ metric: { metricName: metric }, desc: true }], limit, ...extra,
  });

  try {
    const token = await googleAccessToken(req, cfg);
    const [[totals, events, trend, phoneTrend, channels], [pages, sources, phonePages, devices, cities]] = await Promise.all([
      batch(cfg.propertyId, token, [
        { dateRanges: both, metrics: ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'averageSessionDuration'].map(name => ({ name })) },
        { dateRanges: both, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter(LEAD_EVENTS) },
        { dateRanges: now, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
        { dateRanges: now, dimensions: [{ name: 'date' }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter(['phone_click']), limit: 400 },
        top('sessionDefaultChannelGroup', 'sessions', 8),
      ]),
      batch(cfg.propertyId, token, [
        { ...top('pagePath', 'screenPageViews', 10), metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }] },
        top('sessionSourceMedium', 'sessions', 8),
        top('pagePath', 'eventCount', 10, { dimensionFilter: eventFilter(['phone_click']) }),
        top('deviceCategory', 'activeUsers', 5),
        top('city', 'activeUsers', 8),
      ]),
    ]);

    const totalRows = byRange(totals);
    const metricNames = ['visitors', 'newVisitors', 'sessions', 'pageViews', 'engagementRate', 'avgSessionSeconds'];
    const pick = list => Object.fromEntries(metricNames.map((name, index) => [name, list[0]?.values[index] || 0]));
    const eventRows = byRange(events);
    const eventsFor = list => Object.fromEntries(list.map(row => [row.dims[0], row.values[0]]));
    const nowEvents = eventsFor(eventRows.current || []);
    const prevEvents = eventsFor(eventRows.previous || []);
    const phoneByDay = Object.fromEntries(rows(phoneTrend).map(row => [row.dims[0], row.values[0]]));

    return res.status(200).json({
      connected: true,
      days,
      current: { ...pick(totalRows.current), phoneClicks: nowEvents.phone_click || 0, formLeads: nowEvents.generate_lead || 0, emailClicks: nowEvents.email_click || 0 },
      previous: { ...pick(totalRows.previous), phoneClicks: prevEvents.phone_click || 0, formLeads: prevEvents.generate_lead || 0, emailClicks: prevEvents.email_click || 0 },
      daily: rows(trend).map(row => ({ date: isoDate(row.dims[0]), visitors: row.values[0], pageViews: row.values[1], phoneClicks: phoneByDay[row.dims[0]] || 0 })),
      channels: rows(channels).map(row => ({ name: row.dims[0], sessions: row.values[0] })),
      sources: rows(sources).map(row => ({ name: row.dims[0], sessions: row.values[0] })),
      topPages: rows(pages).map(row => ({ path: row.dims[0], views: row.values[0], visitors: row.values[1] })),
      phoneByPage: rows(phonePages).map(row => ({ path: row.dims[0], clicks: row.values[0] })),
      devices: rows(devices).map(row => ({ name: row.dims[0], visitors: row.values[0] })),
      cities: rows(cities).map(row => ({ name: row.dims[0], visitors: row.values[0] })),
    });
  } catch (error) {
    console.error('[sunwings] google analytics failed', error);
    return res.status(200).json({ connected: false, reason: error.message || 'Unable to reach Google Analytics.' });
  }
}
