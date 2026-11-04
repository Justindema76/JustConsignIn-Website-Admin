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

function rows(report, dims = 1) {
  return (report?.rows || []).map(row => ({
    dims: (row.dimensionValues || []).slice(0, dims).map(item => item.value),
    values: (row.metricValues || []).map(item => Number(item.value) || 0),
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireSiteAccess(req, res, 'sunwings');
  if (!user) return;

  const { values: cfg, missing } = config();
  if (missing.length) return res.status(200).json({ connected: false, reason: 'Google Analytics isn’t connected yet.', missing });

  const days = [7, 30, 90, 365].includes(Number(req.query?.days)) ? Number(req.query.days) : 30;
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }];

  try {
    const token = await googleAccessToken(req, cfg);
    const data = await googleJson(await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(cfg.propertyId)}:batchRunReports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        requests: [
          { dateRanges, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }] },
          { dateRanges, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter(['phone_click', 'generate_lead', 'email_click']) },
          { dateRanges, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 },
          { dateRanges, dimensions: [{ name: 'sessionSourceMedium' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 },
          { dateRanges, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter(['phone_click']), orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 10 },
        ],
      }),
    }), 'Google Analytics report');

    const [totals, events, pages, sources, phonePages] = data.reports || [];
    const total = rows(totals, 0)[0]?.values || [0, 0, 0];
    const eventCount = Object.fromEntries(rows(events).map(row => [row.dims[0], row.values[0]]));
    return res.status(200).json({
      connected: true,
      days,
      visitors: total[0],
      sessions: total[1],
      pageViews: total[2],
      phoneClicks: eventCount.phone_click || 0,
      formLeads: eventCount.generate_lead || 0,
      emailClicks: eventCount.email_click || 0,
      topPages: rows(pages).map(row => ({ path: row.dims[0], views: row.values[0], visitors: row.values[1] })),
      sources: rows(sources).map(row => ({ source: row.dims[0], sessions: row.values[0] })),
      phoneByPage: rows(phonePages).map(row => ({ path: row.dims[0], clicks: row.values[0] })),
    });
  } catch (error) {
    console.error('[sunwings] google analytics failed', error);
    return res.status(200).json({ connected: false, reason: error.message || 'Unable to reach Google Analytics.' });
  }
}
